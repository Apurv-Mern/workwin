import React, { useState, useEffect } from "react";
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
} from "react-bootstrap";
import {
  saveWheelConfigurationRequest,
  getWheelConfigurationRequest,
} from "../store/Api/requests";

const MiniSpinWheel = () => {
  const [wheelSections, setWheelSections] = useState(8);
  const [sectionXpValues, setSectionXpValues] = useState<number[]>(
    Array.from({ length: 8 }, (_, index) => (index + 1) * 100)
  );
  const [rewardType, setRewardType] = useState<"XP" | "Rewards">("XP");
  const [sectionRewards, setSectionRewards] = useState<string[]>(
    Array.from({ length: 8 }, (_, index) => `Reward ${index + 1}`)
  );
  const [xpValue, setXpValue] = useState<number>(100);
  const [rewardText, setRewardText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">(
    "success"
  );

  // Load existing configuration on component mount
  useEffect(() => {
    loadWheelConfiguration();
  }, []);

  const loadWheelConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await getWheelConfigurationRequest(1);
      console.log("Mini Wheel API Response:", response); // Debug log

      // Handle the actual API response structure
      if (response.flag && response.result) {
        const { numberOfSections, sections, type } = response.result;

        console.log("Setting mini wheel sections:", numberOfSections); // Debug log
        console.log("Setting mini sections data:", sections); // Debug log
        console.log("Setting mini wheel type:", type); // Debug log

        setWheelSections(numberOfSections);

        // Set reward type based on API response
        if (type) {
          setRewardType(type === "xp" ? "XP" : "Rewards");
        }

        // Extract XP values from sections array
        const xpValues = sections.map((section: any) => section.xpValue);
        console.log("Setting mini XP values:", xpValues); // Debug log
        setSectionXpValues(xpValues);

        // If type is rewards, also set the reward texts
        if (type === "rewards") {
          const rewardTexts = sections.map((section: any) => section.xpValue); // Load from xpValue field since rewards are stored there
          setSectionRewards(rewardTexts);
        } else {
          // For XP type, keep default reward texts
          const defaultRewards = Array.from({ length: numberOfSections }, (_, index) => `Reward ${index + 1}`);
          setSectionRewards(defaultRewards);
        }
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

  const handleSave = async () => {
    // Validation
    if (wheelSections < 2 || wheelSections > 20) {
      showNotification("Number of sections must be between 2 and 20", "danger");
      return;
    }

    if (rewardType === "XP" && sectionXpValues.some((xp) => xp < 0 || !Number.isInteger(xp))) {
      showNotification("All XP values must be positive integers", "danger");
      return;
    }

    if (rewardType === "Rewards" && sectionRewards.some((reward) => !reward || reward.trim() === "")) {
      showNotification("All reward descriptions must be filled", "danger");
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        id: 1,
        sections: wheelSections,
        xpValues: rewardType === "XP" ? sectionXpValues : sectionRewards, // Send rewards in xpValues when type is rewards
        rewardTexts: sectionRewards,
        totalXP: totalXP,
        type: rewardType.toLowerCase(), // Send "xp" or "rewards"
      };

      console.log("Current reward type:", rewardType);
      console.log("Section rewards:", sectionRewards);
      console.log("Section XP values:", sectionXpValues);
      console.log("Saving wheel configuration:", configData);
      const response = await saveWheelConfigurationRequest(configData);
      console.log("Mini Save Response:", response); // Debug log

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
                <Form.Label>Reward Type</Form.Label>
                <Form.Select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as "XP" | "Rewards")}
                >
                  <option value="XP">XP</option>
                  <option value="Rewards">Rewards</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose between XP points or custom rewards
                </Form.Text>
              </Form.Group>

              {/* {rewardType === "XP" && (
                <Form.Group className="mb-3">
                  <Form.Label>XP Value</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={xpValue}
                    onChange={(e) => setXpValue(parseInt(e.target.value) || 100)}
                  />
                  <Form.Text className="text-muted">
                    Enter XP value for sections
                  </Form.Text>
                </Form.Group>
              )}

              {rewardType === "Rewards" && (
                <Form.Group className="mb-3">
                  <Form.Label>Reward Text</Form.Label>
                  <Form.Control
                    type="text"
                    value={rewardText}
                    onChange={(e) => setRewardText(e.target.value)}
                    placeholder="Enter reward description"
                  />
                  <Form.Text className="text-muted">
                    Enter text description for the reward
                  </Form.Text>
                </Form.Group>
              )} */}

              {/* <Form.Group className="mb-3">
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
                  Minimum 2, Maximum 10 sections
                </Form.Text>
              </Form.Group> */}

              <div className="mb-3">
                <Form.Label>
                  {rewardType === "XP" ? "XP Values for Each Section" : "Rewards for Each Section"}
                </Form.Label>
                <div
                  className="row g-2"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {rewardType === "XP" ? (
                    sectionXpValues.map((xpValue, index) => (
                      <div key={index} className="col-6">
                        <Form.Group>
                          <Form.Label className="small">
                            Section {index + 1}
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            value={xpValue}
                            onChange={(e) =>
                              handleXpValueChange(
                                index,
                                parseInt(e.target.value) || 100
                              )
                            }
                            size="sm"
                          />
                        </Form.Group>
                      </div>
                    ))
                  ) : (
                    sectionRewards.map((reward, index) => (
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
                          />
                        </Form.Group>
                      </div>
                    ))
                  )}
                </div>
                <Form.Text className="text-muted">
                  {rewardType === "XP"
                    ? "Customize XP for each section individually"
                    : "Customize rewards for each section individually"}
                </Form.Text>
              </div>

              <Alert variant="info" className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Total XP Pool:</strong> {totalXP.toLocaleString()}{" "}
                    XP
                  </div>
                  <small className="text-muted">
                    {sectionXpValues.length} sections configured
                  </small>
                </div>
              </Alert>

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
                              transform={`rotate(${(midAngle * 180) / Math.PI
                                }, ${centerX + radius * 0.7 * Math.cos(midAngle)
                                }, ${centerY + radius * 0.7 * Math.sin(midAngle)
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
                                {rewardType === "XP"
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
                    >
                    </div>

                    {/* Pointer/Arrow */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-10px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "0",
                        height: "0",
                        borderLeft: "15px solid transparent",
                        borderRight: "15px solid transparent",
                        borderBottom: "25px solid #34a853",
                        zIndex: 15,
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                      }}
                    />
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
                            className={`badge ${isHighestXP
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
                            {rewardType === "XP"
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

