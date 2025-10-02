import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Toast,
  ToastContainer,
  Badge,
} from "react-bootstrap";
import {
  saveWheelConfigurationRequest,
  getWheelConfigurationRequest,
  activateBigWheelRequest,
  deactivateBigWheelRequest,
  uploadRewardImageRequest,
} from "../store/Api/requests";

const BigSpinWheel = () => {
  const [wheelSections, setWheelSections] = useState(8);
  const [sectionRewards, setSectionRewards] = useState<string[]>(
    Array.from({ length: 8 }, (_, index) => `Big Reward ${index + 1}`)
  );
  const [sectionImages, setSectionImages] = useState<string[]>(
    Array.from({ length: 8 }, () => "")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<
    "success" | "danger" | "warning"
  >("success");
  const [uploadingImages, setUploadingImages] = useState<{
    [key: number]: boolean;
  }>({});

  // Load existing configuration on component mount
  useEffect(() => {
    loadWheelConfiguration();
  }, []);

  const loadWheelConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await getWheelConfigurationRequest(2);
      console.log("API Response:", response);

      if (response.flag && response.result) {
        const {
          numberOfSections,
          sections,
          isBig: wheelIsActive,
        } = response.result;
        setWheelSections(numberOfSections);
        setIsActive(wheelIsActive || false);

        // For big wheel, we only support rewards
        const rewardTexts = sections.map(
          (section: any) =>
            section.xpValue || `Big Reward ${sections.indexOf(section) + 1}`
        );
        setSectionRewards(rewardTexts);

        // Load reward images if they exist
        const imageUrls = Array.from({ length: numberOfSections }, () => "");
        if (
          response.result.reward_images &&
          Array.isArray(response.result.reward_images)
        ) {
          response.result.reward_images.forEach(
            (imageUrl: string, index: number) => {
              if (index < numberOfSections) {
                imageUrls[index] = imageUrl || "";
              }
            }
          );
        }
        setSectionImages(imageUrls);
      }
    } catch (error: any) {
      console.log("No existing configuration found or failed to load:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (
    message: string,
    variant: "success" | "danger" | "warning" = "success"
  ) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const uploadRewardImage = async (file: File): Promise<string> => {
    try {
      const result = await uploadRewardImageRequest(file);
      if (result.flag && result.result?.imagePath) {
        return result.result.imagePath;
      } else {
        throw new Error(result.message || "Failed to upload image");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    // Validation
    if (wheelSections < 2 || wheelSections > 20) {
      showNotification("Number of sections must be between 2 and 20", "danger");
      return;
    }

    // Validate reward descriptions must be non-empty strings
    if (sectionRewards.some((reward) => !reward || reward.trim() === "")) {
      showNotification("All reward descriptions must be filled", "danger");
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        id: 2,
        sections: wheelSections,
        xpValues: sectionRewards, // Send rewards in xpValues field
        rewardTexts: sectionRewards,
        totalXP: 0, // No XP for big wheel
        type: "rewards", // Always rewards for big wheel
        reward_images: sectionImages, // Include reward images
      };

      const response = await saveWheelConfigurationRequest(configData);

      if (response) {
        showNotification("Big wheel configuration saved successfully!");
      }
    } catch (error: any) {
      console.error("Failed to save big wheel configuration:", error);
      const errorMessage =
        error?.message ||
        "Failed to save big wheel configuration. Please try again.";
      showNotification(errorMessage, "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateWheel = async () => {
    setIsActivating(true);
    try {
      // First save the current configuration
      await handleSave();

      // Then activate the wheel using API
      const response = await activateBigWheelRequest({ id: 2 });
      console.log("Activate Response:", response);
      if (response.flag || response.success) {
        setIsActive(true);
        showNotification(
          "Big Spin the Wheel has been activated successfully!",
          "success"
        );
      }
    } catch (error: any) {
      console.error("Failed to activate big wheel:", error);
      const errorMessage =
        error?.message || "Failed to activate big wheel. Please try again.";
      showNotification(errorMessage, "danger");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivateWheel = async () => {
    setIsActivating(true);
    try {
      // Deactivate the wheel using API
      const response = await deactivateBigWheelRequest({
        id: 2,
      });
      console.log("Deactivate Response:", response);
      if (response.flag || response.success) {
        setIsActive(false);
        showNotification("Big Spin the Wheel has been deactivated.", "warning");
      }
    } catch (error: any) {
      console.error("Failed to deactivate big wheel:", error);
      const errorMessage =
        error?.message || "Failed to deactivate big wheel. Please try again.";
      showNotification(errorMessage, "danger");
    } finally {
      setIsActivating(false);
    }
  };

  const handleWheelSectionsChange = (newSections: number) => {
    setWheelSections(newSections);

    // Adjust rewards array to match new section count
    const newRewards = Array.from({ length: newSections }, (_, index) => {
      return sectionRewards[index] || `Big Reward ${index + 1}`;
    });
    setSectionRewards(newRewards);

    // Adjust images array to match new section count
    const newImages = Array.from({ length: newSections }, (_, index) => {
      return sectionImages[index] || "";
    });
    setSectionImages(newImages);
  };

  const handleRewardChange = (sectionIndex: number, reward: string) => {
    const newRewards = [...sectionRewards];
    newRewards[sectionIndex] = reward;
    setSectionRewards(newRewards);
  };

  const handleImageUpload = async (sectionIndex: number, file: File) => {
    if (!file) return;

    setUploadingImages((prev) => ({ ...prev, [sectionIndex]: true }));

    try {
      const imagePath = await uploadRewardImage(file);
      const newImages = [...sectionImages];
      newImages[sectionIndex] = imagePath;
      setSectionImages(newImages);
      showNotification(
        `Image uploaded successfully for Section ${sectionIndex + 1}`
      );
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      showNotification(error.message || "Failed to upload image", "danger");
    } finally {
      setUploadingImages((prev) => ({ ...prev, [sectionIndex]: false }));
    }
  };

  const removeImage = (sectionIndex: number) => {
    const newImages = [...sectionImages];
    newImages[sectionIndex] = "";
    setSectionImages(newImages);
  };

  if (isLoading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading Dragon wheel configuration...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0">
                Dragon Wheel Configuration
                {isActive && (
                  <Badge bg="success" className="ms-2">
                    <i className="bi bi-check-circle me-1"></i>
                    Active
                  </Badge>
                )}
                {!isActive && (
                  <Badge bg="secondary" className="ms-2">
                    <i className="bi bi-pause-circle me-1"></i>
                    Inactive
                  </Badge>
                )}
              </h2>
              <p className="text-muted mb-0">
                Configure the Dragon wheel with premium rewards and activate it
                for users!
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Dragon Wheel Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Number of Sections</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  max="10"
                  value={wheelSections}
                  onChange={(e) =>
                    handleWheelSectionsChange(parseInt(e.target.value) || 8)
                  }
                />
                <Form.Text className="text-muted">
                  Minimum 2, Maximum 10 sections (Rewards Only)
                </Form.Text>
              </Form.Group>

              <div className="mb-3">
                <Form.Label>Rewards for Each Section</Form.Label>
                <div
                  className="row g-2"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {sectionRewards.map((reward, index) => (
                    <div key={index} className="col-6">
                      <Form.Group>
                        <Form.Label className="small">
                          Section {index + 1}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={reward}
                          onChange={(e) =>
                            handleRewardChange(index, e.target.value)
                          }
                          size="sm"
                          placeholder="Enter reward"
                          className="mb-2"
                        />

                        {/* Image Upload for Rewards */}
                        <div className="d-flex align-items-center gap-2">
                          <Form.Control
                            type="file"
                            size="sm"
                            accept="image/*"
                            onChange={(e) => {
                              const target = e.target as HTMLInputElement;
                              const file = target.files?.[0];
                              if (file) {
                                handleImageUpload(index, file);
                              }
                            }}
                            disabled={uploadingImages[index]}
                            style={{ fontSize: "0.75rem" }}
                          />
                          {uploadingImages[index] && (
                            <Spinner size="sm" animation="border" />
                          )}
                        </div>

                        {/* Show uploaded image preview */}
                        {sectionImages[index] && (
                          <div className="mt-2">
                            <div className="d-flex align-items-center justify-content-between">
                              <img
                                src={`http://localhost:5000${sectionImages[index]}`}
                                alt={`Reward ${index + 1}`}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                }}
                              />
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeImage(index)}
                                className="ms-2"
                                style={{
                                  fontSize: "0.7rem",
                                  padding: "2px 6px",
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </Form.Group>
                    </div>
                  ))}
                </div>
                <Form.Text className="text-muted">
                  Customize rewards for each section individually
                </Form.Text>
              </div>

              <Alert variant="info" className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Reward Sections:</strong> {sectionRewards.length}{" "}
                    configured
                  </div>
                  <small className="text-muted">Rewards Only Mode</small>
                </div>
              </Alert>

              <div className="d-grid gap-2">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      Save Configuration
                    </>
                  )}
                </Button>

                {/* Activation/Deactivation Button */}
                {!isActive ? (
                  <Button
                    variant="warning"
                    size="lg"
                    onClick={handleActivateWheel}
                    disabled={isActivating || isSaving}
                  >
                    {isActivating ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Activating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-play-circle me-2"></i>
                        Activate Dragon Wheel
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline-danger"
                    size="lg"
                    onClick={handleDeactivateWheel}
                    disabled={isActivating}
                  >
                    {isActivating ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Deactivating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-pause-circle me-2"></i>
                        Deactivate Dragon Wheel
                      </>
                    )}
                  </Button>
                )}
              </div>

              {isActive && (
                <Alert variant="warning" className="mt-3 mb-0">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    The Dragon wheel is currently active and available to users.
                  </small>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Dragon Wheel Preview</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                {/* Premium Dragon Wheel Container */}
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                    marginBottom: "30px",
                  }}
                >
                  {/* Main Dragon Wheel Container */}
                  <div
                    className="dragon-wheel-container position-relative"
                    style={{
                      width: "450px",
                      height: "450px",
                      borderRadius: "50%",
                      background: "#f8f9fa",
                      boxShadow:
                        "0 15px 40px rgba(0,0,0,0.2), inset 0 0 15px rgba(0,0,0,0.1)",
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    {/* Wheel Sections */}
                    <svg
                      width="450"
                      height="450"
                      style={{ position: "absolute", top: 0, left: 0 }}
                    >
                      {Array.from({ length: wheelSections }, (_, index) => {
                        const sectionAngle = 360 / wheelSections;
                        const startAngle =
                          (index * sectionAngle - 90) * (Math.PI / 180);
                        const endAngle =
                          ((index + 1) * sectionAngle - 90) * (Math.PI / 180);
                        const midAngle = (startAngle + endAngle) / 2;

                        const radius = 225;
                        const centerX = 225;
                        const centerY = 225;

                        // Calculate path for pie slice
                        const x1 = centerX + radius * Math.cos(startAngle);
                        const y1 = centerY + radius * Math.sin(startAngle);
                        const x2 = centerX + radius * Math.cos(endAngle);
                        const y2 = centerY + radius * Math.sin(endAngle);

                        const largeArcFlag = sectionAngle > 180 ? 1 : 0;
                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                        // Premium alternating colors for Dragon wheel
                        const isEven = index % 2 === 0;
                        const sectionColor = isEven ? "#ff6b9d" : "#9b59b6";

                        return (
                          <g key={index}>
                            {/* Section Path */}
                            <path
                              d={pathData}
                              fill={sectionColor}
                              stroke="white"
                              strokeWidth="3"
                              style={{
                                transition: "all 0.3s ease",
                                filter: "brightness(1)",
                              }}
                              className="dragon-wheel-section-path"
                            />

                            {/* Section Text */}
                            <text
                              x={centerX + radius * 0.65 * Math.cos(midAngle)}
                              y={centerY + radius * 0.65 * Math.sin(midAngle)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize={wheelSections > 10 ? "12" : "14"}
                              fontWeight="bold"
                              style={{
                                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                                pointerEvents: "none",
                              }}
                              transform={`rotate(${
                                (midAngle * 180) / Math.PI
                              }, ${
                                centerX + radius * 0.65 * Math.cos(midAngle)
                              }, ${
                                centerY + radius * 0.65 * Math.sin(midAngle)
                              })`}
                            >
                              <tspan
                                x={centerX + radius * 0.65 * Math.cos(midAngle)}
                                dy="-8"
                              >
                                Section {index + 1}
                              </tspan>
                              <tspan
                                x={centerX + radius * 0.65 * Math.cos(midAngle)}
                                dy="16"
                                fontSize={wheelSections > 10 ? "10" : "12"}
                              >
                                {sectionRewards[index]}
                              </tspan>
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Premium Center Hub */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        border: "4px solid white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "14px",
                        boxShadow:
                          "0 6px 20px rgba(0,0,0,0.3), inset 0 3px 8px rgba(255,255,255,0.3)",
                        zIndex: 15,
                        textAlign: "center",
                      }}
                    >
                      <div>
                        {isActive && (
                          <div style={{ fontSize: "12px", marginTop: "2px" }}>
                            🐲 ACTIVE
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Premium Pointer/Arrow */}
                  </div>
                </div>

                {/* Add CSS for hover effects and premium animations */}
                <style>{`
                                  .dragon-wheel-section-path {
                                    transition: all 0.3s ease;
                                  }
                                  
                                  .dragon-wheel-section-path:hover {
                                    filter: brightness(1.2) saturate(1.1);
                                    transform: scale(1.02);
                                  }
                                  
                                  .dragon-wheel-container {
                                    animation: dragonWheelGlow 4s ease-in-out infinite alternate;
                                  }
                                  
                                  @keyframes dragonWheelGlow {
                                    0% {
                                      box-shadow: 0 15px 40px rgba(0,0,0,0.2), inset 0 0 15px rgba(0,0,0,0.1);
                                    }
                                    100% {
                                      box-shadow: 0 20px 50px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2), 0 0 15px rgba(102, 126, 234, 0.2);
                                    }
                                  }
                                `}</style>

                <div className="mt-4">
                  <h6>Section Details:</h6>
                  <div className="row">
                    {Array.from({ length: wheelSections }, (_, index) => (
                      <div key={index} className="col-3 col-md-2 mb-2">
                        <div
                          className="badge bg-primary"
                          style={{
                            fontSize: "0.75rem",
                            position: "relative",
                          }}
                        >
                          Section {index + 1}
                          <br />
                          {sectionRewards[index]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === "success"
                ? "Success"
                : toastVariant === "warning"
                ? "Warning"
                : "Error"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default BigSpinWheel;
