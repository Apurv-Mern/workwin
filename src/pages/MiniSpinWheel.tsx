import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {
  saveWheelConfigurationRequest,
  getWheelConfigurationRequest,
  uploadRewardImageRequest,
} from "../store/Api/requests";

const MiniSpinWheel = () => {
  const [wheelSections, setWheelSections] = useState(8);
  const [sectionXpValues, setSectionXpValues] = useState<number[]>(
    Array.from({ length: 8 }, (_, index) => (index + 1) * 100)
  );
  const [sectionRewards, setSectionRewards] = useState<string[]>(
    Array.from({ length: 8 }, (_, index) => `Reward ${index + 1}`)
  );
  const [sectionTypes, setSectionTypes] = useState<("XP" | "Rewards")[]>(
    Array.from({ length: 8 }, (_, index) =>
      index % 2 === 0 ? "XP" : "Rewards"
    )
  );
  const [sectionImages, setSectionImages] = useState<string[]>(
    Array.from({ length: 8 }, () => "")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">(
    "success"
  );
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
      const response = await getWheelConfigurationRequest(1);
      console.log("API Response:", response); // Debug log

      // Handle the actual API response structure
      if (response.flag && response.result) {
        const { numberOfSections, sections } = response.result;

        setWheelSections(numberOfSections);

        // Determine section types based on the data in sections array
        const newSectionTypes: ("XP" | "Rewards")[] = [];
        const xpValues: number[] = [];
        const rewardTexts: string[] = [];
        const imageUrls: string[] = [];

        if (sections && Array.isArray(sections)) {
          for (let i = 0; i < numberOfSections; i++) {
            const section = sections[i];
            const xpValue = section?.xpValue;

            // Determine if this section contains XP (number) or Reward (string)
            if (typeof xpValue === "number") {
              newSectionTypes[i] = "XP";
              xpValues[i] = xpValue;
              rewardTexts[i] = `Reward ${i + 1}`; // Default reward text
            } else if (typeof xpValue === "string") {
              newSectionTypes[i] = "Rewards";
              xpValues[i] = (i + 1) * 100; // Default XP value
              rewardTexts[i] = xpValue; // Use the string as reward text
            } else {
              // Fallback for missing data
              newSectionTypes[i] = i % 2 === 0 ? "XP" : "Rewards";
              xpValues[i] = (i + 1) * 100;
              rewardTexts[i] = `Reward ${i + 1}`;
            }

            // Load image URLs if they exist
            imageUrls[i] = "";
          }
        } else {
          // Fallback if no sections data available
          for (let i = 0; i < numberOfSections; i++) {
            newSectionTypes[i] = i % 2 === 0 ? "XP" : "Rewards";
            xpValues[i] = (i + 1) * 100;
            rewardTexts[i] = `Reward ${i + 1}`;
            imageUrls[i] = "";
          }
        }

        // Load reward images if they exist
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

        setSectionTypes(newSectionTypes);
        setSectionXpValues(xpValues);
        setSectionRewards(rewardTexts);
        setSectionImages(imageUrls);

        console.log("Loaded data:", {
          newSectionTypes,
          xpValues,
          rewardTexts,
          imageUrls,
        }); // Debug log
      }
    } catch (error: any) {
      console.log("No existing configuration found or failed to load:", error);
      // Keep default values if no configuration exists
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (
    message: string,
    variant: "success" | "danger" = "success"
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

    // Validate XP sections - must be positive integers
    const xpSections = sectionTypes
      .map((type, index) => ({ type, index }))
      .filter((s) => s.type === "XP");
    const invalidXpSections = xpSections.filter(
      (s) =>
        sectionXpValues[s.index] < 0 ||
        !Number.isInteger(sectionXpValues[s.index])
    );
    if (invalidXpSections.length > 0) {
      showNotification("All XP values must be positive integers", "danger");
      return;
    }

    // Validate reward sections - must be non-empty strings
    const rewardSections = sectionTypes
      .map((type, index) => ({ type, index }))
      .filter((s) => s.type === "Rewards");
    const invalidRewardSections = rewardSections.filter(
      (s) => !sectionRewards[s.index] || sectionRewards[s.index].trim() === ""
    );
    if (invalidRewardSections.length > 0) {
      showNotification("All reward descriptions must be filled", "danger");
      return;
    }

    setIsSaving(true);
    try {
      // Create mixed data array based on section types
      const mixedData = sectionTypes.map((type, index) =>
        type === "XP" ? sectionXpValues[index] : sectionRewards[index]
      );

      const configData = {
        id: 1,
        sections: wheelSections,
        xpValues: mixedData, // Mixed array of XP values and reward texts
        sectionTypes: sectionTypes, // Send section types to backend
        totalXP: totalXP,
        type: "mixed", // Indicate this is a mixed configuration
        reward_images: sectionImages, // Include reward images
      };
      const response = await saveWheelConfigurationRequest(configData);

      if (response) {
        showNotification("Wheel configuration saved successfully!");
      }
    } catch (error: any) {
      console.error("Failed to save wheel configuration:", error);
      const errorMessage =
        error?.message ||
        "Failed to save wheel configuration. Please try again.";
      showNotification(errorMessage, "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWheelSectionsChange = (newSections: number) => {
    setWheelSections(newSections);

    // Adjust XP values array to match new section count
    const newXpValues = Array.from({ length: newSections }, (_, index) => {
      return sectionXpValues[index] || (index + 1) * 100;
    });
    setSectionXpValues(newXpValues);

    // Adjust rewards array to match new section count
    const newRewards = Array.from({ length: newSections }, (_, index) => {
      return sectionRewards[index] || `Reward ${index + 1}`;
    });
    setSectionRewards(newRewards);

    // Adjust section types array (alternating XP and Rewards)
    const newSectionTypes = Array.from({ length: newSections }, (_, index) =>
      index % 2 === 0 ? ("XP" as const) : ("Rewards" as const)
    );
    setSectionTypes(newSectionTypes);

    // Adjust images array to match new section count
    const newImages = Array.from({ length: newSections }, (_, index) => {
      return sectionImages[index] || "";
    });
    setSectionImages(newImages);
  };

  const handleSectionTypeChange = (
    sectionIndex: number,
    type: "XP" | "Rewards"
  ) => {
    const newSectionTypes = [...sectionTypes];
    newSectionTypes[sectionIndex] = type;
    setSectionTypes(newSectionTypes);
  };

  const handleRewardChange = (sectionIndex: number, reward: string) => {
    const newRewards = [...sectionRewards];
    newRewards[sectionIndex] = reward;
    setSectionRewards(newRewards);
  };

  const handleXpValueChange = (sectionIndex: number, xpValue: number) => {
    const newXpValues = [...sectionXpValues];
    newXpValues[sectionIndex] = xpValue;
    setSectionXpValues(newXpValues);
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

  const totalXP = sectionXpValues.reduce((sum, xp) => sum + xp, 0);

  if (isLoading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading wheel configuration...</p>
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
              <h2 className="mb-0">Wheel Configuration</h2>
              <p className="text-muted mb-0">
                Configure wheel sections and XP values for your rewards system!
              </p>
            </div>
            {/* <Button
              variant="outline-primary"
              onClick={loadWheelConfiguration}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : (
                <i className="bi bi-arrow-clockwise me-2"></i>
              )}
              Refresh
            </Button> */}
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Wheel Configuration</h5>
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
                  Minimum 2, Maximum 10 sections (Mix of XP and Rewards)
                </Form.Text>
              </Form.Group>

              <div className="mb-3">
                <Form.Label>Configure Each Section</Form.Label>
                <div
                  className="row g-2"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  {sectionTypes.map((sectionType, index) => (
                    <div key={index} className="col-12 mb-3">
                      <Card>
                        <Card.Body className="p-2">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <Form.Label className="small mb-0">
                              Section {index + 1}
                            </Form.Label>
                            <Form.Select
                              size="sm"
                              style={{ width: "auto" }}
                              value={sectionType}
                              onChange={(e) =>
                                handleSectionTypeChange(
                                  index,
                                  e.target.value as "XP" | "Rewards"
                                )
                              }
                            >
                              <option value="XP">XP</option>
                              <option value="Rewards">Rewards</option>
                            </Form.Select>
                          </div>

                          {sectionType === "XP" ? (
                            <Form.Control
                              type="number"
                              min="1"
                              value={sectionXpValues[index]}
                              onChange={(e) =>
                                handleXpValueChange(
                                  index,
                                  parseInt(e.target.value) || 100
                                )
                              }
                              size="sm"
                              placeholder="Enter XP value"
                            />
                          ) : (
                            <div>
                              <Form.Control
                                type="text"
                                value={sectionRewards[index]}
                                onChange={(e) =>
                                  handleRewardChange(index, e.target.value)
                                }
                                size="sm"
                                placeholder="Enter reward description"
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
                                      src={`${sectionImages[index]}`}
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
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
                <Form.Text className="text-muted">
                  Configure each section individually as XP or Reward
                </Form.Text>
              </div>

              {/* <Alert variant="info" className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Total XP Pool:</strong> {totalXP.toLocaleString()}{" "}
                    XP
                  </div>
                  <small className="text-muted">
                    {sectionXpValues.length} sections configured
                  </small>
                </div>
              </Alert> */}

              <Button
                variant="success"
                size="lg"
                onClick={handleSave}
                className="w-100"
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
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Wheel Preview</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                {/* Professional Wheel Container matching the reference design */}
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                    marginBottom: "20px",
                  }}
                >
                  {/* Main Wheel Container */}
                  <div
                    className="wheel-container position-relative"
                    style={{
                      width: "320px",
                      height: "320px",
                      borderRadius: "50%",
                      background: "#f8f9fa",
                      boxShadow:
                        "0 8px 25px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.1)",
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    {/* Wheel Sections */}
                    <svg
                      width="320"
                      height="320"
                      style={{ position: "absolute", top: 0, left: 0 }}
                    >
                      {Array.from({ length: wheelSections }, (_, index) => {
                        const sectionAngle = 360 / wheelSections;
                        const startAngle =
                          (index * sectionAngle - 90) * (Math.PI / 180); // Start from top
                        const endAngle =
                          ((index + 1) * sectionAngle - 90) * (Math.PI / 180);
                        const midAngle = (startAngle + endAngle) / 2;

                        const radius = 160;
                        const centerX = 160;
                        const centerY = 160;

                        // Calculate path for pie slice
                        const x1 = centerX + radius * Math.cos(startAngle);
                        const y1 = centerY + radius * Math.sin(startAngle);
                        const x2 = centerX + radius * Math.cos(endAngle);
                        const y2 = centerY + radius * Math.sin(endAngle);

                        const largeArcFlag = sectionAngle > 180 ? 1 : 0;
                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                        // Alternating colors like the reference
                        const isEven = index % 2 === 0;
                        const sectionColor = isEven ? "#ff9999" : "#b19cd9"; // Pink and Purple alternating

                        return (
                          <g key={index}>
                            {/* Section Path */}
                            <path
                              d={pathData}
                              fill={sectionColor}
                              stroke="white"
                              strokeWidth="2"
                              style={{
                                transition: "all 0.3s ease",
                                filter: "brightness(1)",
                              }}
                              className="wheel-section-path"
                            />

                            {/* Section Text */}
                            <text
                              x={centerX + radius * 0.7 * Math.cos(midAngle)}
                              y={centerY + radius * 0.7 * Math.sin(midAngle)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize={wheelSections > 10 ? "10" : "12"}
                              fontWeight="bold"
                              style={{
                                textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                                pointerEvents: "none",
                              }}
                              transform={`rotate(${
                                (midAngle * 180) / Math.PI
                              }, ${
                                centerX + radius * 0.7 * Math.cos(midAngle)
                              }, ${
                                centerY + radius * 0.7 * Math.sin(midAngle)
                              })`}
                            >
                              <tspan
                                x={centerX + radius * 0.7 * Math.cos(midAngle)}
                                dy="-6"
                              >
                                Section {index + 1}
                              </tspan>
                              <tspan
                                x={centerX + radius * 0.7 * Math.cos(midAngle)}
                                dy="12"
                                fontSize={wheelSections > 10 ? "8" : "10"}
                              >
                                {sectionTypes[index] === "XP"
                                  ? `${sectionXpValues[index]} XP`
                                  : sectionRewards[index]}
                              </tspan>
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Decorative Dots around the rim */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                      }}
                    >
                      {Array.from({ length: 24 }, (_, index) => {
                        const dotAngle = index * 15 * (Math.PI / 180); // 24 dots around the circle
                        const dotRadius = 155;
                        const dotX = 160 + dotRadius * Math.cos(dotAngle);
                        const dotY = 160 + dotRadius * Math.sin(dotAngle);

                        return (
                          <div
                            key={index}
                            style={{
                              position: "absolute",
                              left: dotX - 3,
                              top: dotY - 3,
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: "#666",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Center Hub */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4285f4, #1a73e8)",
                        border: "3px solid white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "12px",
                        boxShadow:
                          "0 4px 15px rgba(0,0,0,0.2), inset 0 2px 5px rgba(255,255,255,0.3)",
                        zIndex: 10,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Add CSS for hover effects and animations */}
                <style>{`
                  .wheel-section-path {
                    transition: all 0.3s ease;
                  }
                  
                  .wheel-section-path:hover {
                    filter: brightness(1.1);
                    transform: scale(1.02);
                  }
                  
                  .wheel-container {
                    animation: wheelShadow 3s ease-in-out infinite alternate;
                  }
                  
                  @keyframes wheelShadow {
                    0% {
                      box-shadow: 0 8px 25px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.1);
                    }
                    100% {
                      box-shadow: 0 12px 35px rgba(0,0,0,0.2), inset 0 0 15px rgba(0,0,0,0.15);
                    }
                  }
                `}</style>

                <div className="mt-4">
                  <h6>Section Details:</h6>
                  <div className="row">
                    {Array.from({ length: wheelSections }, (_, index) => {
                      const isHighestXP =
                        sectionXpValues[index] === Math.max(...sectionXpValues);
                      const isLowestXP =
                        sectionXpValues[index] === Math.min(...sectionXpValues);

                      return (
                        <div key={index} className="col-3 col-md-2 mb-2">
                          <div
                            className={`badge ${
                              isHighestXP
                                ? "bg-warning text-dark"
                                : isLowestXP
                                ? "bg-light text-dark"
                                : "bg-secondary"
                            }`}
                            style={{
                              fontSize: "0.75rem",
                              position: "relative",
                            }}
                          >
                            {isHighestXP && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: "-5px",
                                  right: "-5px",
                                  fontSize: "8px",
                                }}
                              >
                                👑
                              </span>
                            )}
                            Section {index + 1}
                            <br />
                            {sectionTypes[index] === "XP"
                              ? `${sectionXpValues[index]} XP`
                              : sectionRewards[index]}
                          </div>
                        </div>
                      );
                    })}
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
              {toastVariant === "success" ? "Success" : "Error"}
            </strong>
          </Toast.Header>
          <Toast.Body
            className={toastVariant === "success" ? "text-white" : "text-white"}
          >
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default MiniSpinWheel;
