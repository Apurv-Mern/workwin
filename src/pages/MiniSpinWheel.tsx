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
import { saveWheelConfigurationRequest, getWheelConfigurationRequest } from "../store/Api/requests";

const MiniSpinWheel = () => {
  const [wheelSections, setWheelSections] = useState(8);
  const [sectionXpValues, setSectionXpValues] = useState<number[]>(
    Array.from({ length: 8 }, (_, index) => (index + 1) * 100)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">("success");

  // Load existing configuration on component mount
  useEffect(() => {
    loadWheelConfiguration();
  }, []);

  const loadWheelConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await getWheelConfigurationRequest();
      if (response.success && response.data) {
        const { numberOfSections, sections } = response.data;
        setWheelSections(numberOfSections);

        // Extract XP values from sections array
        const xpValues = sections.map((section: any) => section.xpValue);
        setSectionXpValues(xpValues);
      }
    } catch (error: any) {
      console.log('No existing configuration found or failed to load:', error);
      // Keep default values if no configuration exists
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, variant: "success" | "danger" = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const handleSave = async () => {
    // Validation
    if (wheelSections < 2 || wheelSections > 20) {
      showNotification('Number of sections must be between 2 and 20', 'danger');
      return;
    }

    if (sectionXpValues.some(xp => xp < 0 || !Number.isInteger(xp))) {
      showNotification('All XP values must be positive integers', 'danger');
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        sections: wheelSections,
        xpValues: sectionXpValues,
        totalXP: totalXP
      };

      console.log('Saving wheel configuration:', configData);
      const response = await saveWheelConfigurationRequest(configData);

      if (response) {
        showNotification('Wheel configuration saved successfully!');
      }
    } catch (error: any) {
      console.error('Failed to save wheel configuration:', error);
      const errorMessage = error?.message || 'Failed to save wheel configuration. Please try again.';
      showNotification(errorMessage, 'danger');
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
            <Button
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
            </Button>
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
                  max="20"
                  value={wheelSections}
                  onChange={(e) =>
                    handleWheelSectionsChange(parseInt(e.target.value) || 8)
                  }
                />
                <Form.Text className="text-muted">
                  Minimum 2, Maximum 20 sections
                </Form.Text>
              </Form.Group>

              <div className="mb-3">
                <Form.Label>XP Values for Each Section</Form.Label>
                <div className="row g-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {sectionXpValues.map((xpValue, index) => (
                    <div key={index} className="col-6">
                      <Form.Group>
                        <Form.Label className="small">Section {index + 1}</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          value={xpValue}
                          onChange={(e) =>
                            handleXpValueChange(index, parseInt(e.target.value) || 100)
                          }
                          size="sm"
                        />
                      </Form.Group>
                    </div>
                  ))}
                </div>
                <Form.Text className="text-muted">
                  Customize XP for each section individually
                </Form.Text>
              </div>

              <Alert variant="info" className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Total XP Pool:</strong> {totalXP.toLocaleString()} XP
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
                {/* Pointer/Arrow at the top */}
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "0",
                      height: "0",
                      borderLeft: "15px solid transparent",
                      borderRight: "15px solid transparent",
                      borderTop: "30px solid #dc3545",
                      position: "absolute",
                      top: "290px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 10,
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                    }}
                  />

                  <div
                    className="wheel-container d-inline-block position-relative"
                    style={{
                      width: "320px",
                      height: "320px",
                      border: "8px solid #2c3e50",
                      borderRadius: "50%",
                      backgroundColor: "#34495e",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Wheel sections */}
                    {Array.from({ length: wheelSections }, (_, index) => {
                      const sectionAngle = 360 / wheelSections;
                      const rotation = sectionAngle * index;

                      return (
                        <div
                          key={index}
                          className="wheel-section position-absolute"
                          style={{
                            width: "50%",
                            height: "50%",
                            transformOrigin: "100% 100%",
                            transform: `rotate(${rotation}deg)`,
                            clipPath: `polygon(0 100%, 100% 100%, 100% ${100 - (100 / wheelSections)}%)`,
                            background: `linear-gradient(45deg, 
                              hsl(${(index * 360) / wheelSections}, 70%, 55%), 
                              hsl(${(index * 360) / wheelSections}, 70%, 45%))`,
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderBottom: "none",
                            borderRight: "none",
                          }}
                        >
                          {/* Section content */}
                          <div
                            style={{
                              position: "absolute",
                              top: "15%",
                              left: "25%",
                              transform: `rotate(${-rotation + sectionAngle / 2}deg)`,
                              color: "white",
                              fontWeight: "bold",
                              fontSize: wheelSections > 12 ? "8px" : "10px",
                              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                              textAlign: "center",
                              lineHeight: "1.1",
                              width: "40px",
                            }}
                          >
                            <div>#{index + 1}</div>
                            <div style={{ fontSize: wheelSections > 12 ? "6px" : "8px" }}>
                              {sectionXpValues[index]} XP
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Center hub */}
                    <div
                      className="position-absolute top-50 start-50 translate-middle"
                      style={{
                        width: "80px",
                        height: "80px",
                        background: "linear-gradient(135deg, #3498db, #2980b9)",
                        borderRadius: "50%",
                        border: "4px solid #ecf0f1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "10px",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 2px 5px rgba(255,255,255,0.3)",
                        zIndex: 5,
                      }}
                    >
                      WHEEL
                    </div>

                    {/* Outer rim decoration */}
                    <div
                      className="position-absolute"
                      style={{
                        top: "-4px",
                        left: "-4px",
                        right: "-4px",
                        bottom: "-4px",
                        borderRadius: "50%",
                        border: "2px solid #bdc3c7",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Add CSS for hover effects */}
                <style>{`
                  .wheel-section {
                    transition: all 0.3s ease;
                  }
                  
                  .wheel-section:hover {
                    filter: brightness(1.1);
                  }
                `}</style>

                <div className="mt-4">
                  <h6>Section Details:</h6>
                  <div className="row">
                    {Array.from({ length: wheelSections }, (_, index) => {
                      const isHighestXP = sectionXpValues[index] === Math.max(...sectionXpValues);
                      const isLowestXP = sectionXpValues[index] === Math.min(...sectionXpValues);

                      return (
                        <div key={index} className="col-3 col-md-2 mb-2">
                          <div
                            className={`badge ${isHighestXP
                              ? "bg-warning text-dark"
                              : isLowestXP
                                ? "bg-light text-dark"
                                : "bg-secondary"
                              }`}
                            style={{ fontSize: "0.75rem", position: "relative" }}
                          >
                            {isHighestXP && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: "-5px",
                                  right: "-5px",
                                  fontSize: "8px"
                                }}
                              >
                                👑
                              </span>
                            )}
                            Section {index + 1}
                            <br />
                            {sectionXpValues[index]} XP
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
          <Toast.Body className={toastVariant === "success" ? "text-white" : "text-white"}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default MiniSpinWheel;

