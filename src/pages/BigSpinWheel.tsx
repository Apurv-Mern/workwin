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
    Badge,
} from "react-bootstrap";
import {
    saveWheelConfigurationRequest,
    getWheelConfigurationRequest,
    activateBigWheelRequest,
    deactivateBigWheelRequest,
    getBigWheelStatusRequest,
} from "../store/Api/requests";

const BigSpinWheel = () => {
    const [wheelSections, setWheelSections] = useState(8);
    const [sectionXpValues, setSectionXpValues] = useState<number[]>(
        Array.from({ length: 8 }, (_, index) => (index + 1) * 200)
    );
    const [rewardType, setRewardType] = useState<"XP" | "Rewards">("XP");
    const [sectionRewards, setSectionRewards] = useState<string[]>(
        Array.from({ length: 8 }, (_, index) => `Big Reward ${index + 1}`)
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

    // Load existing configuration on component mount
    useEffect(() => {
        loadWheelConfiguration();
    }, []);

    const loadBigWheelStatus = async () => {
        try {
            const response = await getBigWheelStatusRequest();
            console.log("Big Wheel Status Response:", response);
            if (response.flag && response.result) {
                setIsActive(response.result.isActive || false);
            }
        } catch (error: any) {
            console.log("Failed to load big wheel status:", error);
        }
    };

    const loadWheelConfiguration = async () => {
        setIsLoading(true);
        try {
            const response = await getWheelConfigurationRequest(2);
            console.log("API Response:", response)

            if (response.flag && response.result) {
                const {
                    numberOfSections,
                    sections,
                    isBig: wheelIsActive,
                    type,
                } = response.result;
                setWheelSections(numberOfSections);
                setIsActive(wheelIsActive || false);

                // Set reward type based on API response
                if (type) {
                    setRewardType(type === "xp" ? "XP" : "Rewards");
                }

                const xpValues = sections.map((section: any) => section.xpValue);
                setSectionXpValues(xpValues);

                // If type is rewards, also set the reward texts
                if (type === "rewards") {
                    const rewardTexts = sections.map((section: any) => section.xpValue); // Load from xpValue field since rewards are stored there
                    setSectionRewards(rewardTexts);
                } else {
                    // For XP type, keep default reward texts
                    const defaultRewards = Array.from({ length: numberOfSections }, (_, index) => `Big Reward ${index + 1}`);
                    setSectionRewards(defaultRewards);
                }
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
                id: 2,
                sections: wheelSections,
                xpValues: rewardType === "XP" ? sectionXpValues : sectionRewards, // Send rewards in xpValues when type is rewards
                rewardTexts: sectionRewards,
                totalXP: totalXP,
                type: rewardType.toLowerCase(), // Send "xp" or "rewards"
            };

            console.log("Current reward type:", rewardType);
            console.log("Section rewards:", sectionRewards);
            console.log("Section XP values:", sectionXpValues);
            console.log("Saving big wheel configuration:", configData);
            const response = await saveWheelConfigurationRequest(configData);
            console.log("Save Response:", response); // Debug log

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
            console.log("Activate Response:", response); // Debug log
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
            console.log("Deactivate Response:", response); // Debug log
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
        // Adjust XP values array to match new section count with higher values
        const newXpValues = Array.from({ length: newSections }, (_, index) => {
            return sectionXpValues[index] || (index + 1) * 200; // Higher default for big wheel
        });
        setSectionXpValues(newXpValues);

        // Adjust rewards array to match new section count
        const newRewards = Array.from({ length: newSections }, (_, index) => {
            return sectionRewards[index] || `Big Reward ${index + 1}`;
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
                    <p className="mt-3">Loading big wheel configuration...</p>
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
                                Big Spin the Wheel Configuration
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
                                Configure the big wheel with higher XP rewards and activate it
                                for users!
                            </p>
                        </div>
                        {/* <Button
                            variant="outline-primary"
                            onClick={() => {
                                loadWheelConfiguration();
                                loadBigWheelStatus();
                            }}
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
                            <h5 className="mb-0">Big Wheel Configuration</h5>
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
                                        onChange={(e) => setXpValue(parseInt(e.target.value) || 200)}
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
                                                                parseInt(e.target.value) || 200
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
                                        ? "Customize XP for each section (recommended: higher values than mini wheel)"
                                        : "Customize rewards for each section individually"}
                                </Form.Text>
                            </div>

                            <Alert variant="info" className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    {
                                        rewardType === "XP" && (
                                            <div>
                                                <strong>Total XP:</strong> {totalXP.toLocaleString()}{" "}
                                                XP
                                            </div>
                                        )
                                    }

                                    <small className="text-muted">
                                        {sectionXpValues.length} sections configured
                                    </small>
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
                                                Activate Big Wheel
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
                                                Deactivate Big Wheel
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {isActive && (
                                <Alert variant="warning" className="mt-3 mb-0">
                                    <small>
                                        <i className="bi bi-info-circle me-1"></i>
                                        The big wheel is currently active and available to users.
                                    </small>
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={8}>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Big Wheel Preview</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="text-center">
                                {/* Professional Big Wheel Container matching the reference design */}
                                <div
                                    style={{
                                        position: "relative",
                                        display: "inline-block",
                                        marginBottom: "30px",
                                    }}
                                >
                                    {/* Main Big Wheel Container */}
                                    <div
                                        className="big-wheel-container position-relative"
                                        style={{
                                            width: "450px", // Bigger than mini wheel
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
                                                    (index * sectionAngle - 90) * (Math.PI / 180); // Start from top
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

                                                // Premium alternating colors for big wheel
                                                const isEven = index % 2 === 0;
                                                const sectionColor = isEven ? "#ff6b9d" : "#9b59b6"; // Brighter pink and purple for premium feel

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
                                                            className="big-wheel-section-path"
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
                                                            transform={`rotate(${(midAngle * 180) / Math.PI
                                                                }, ${centerX + radius * 0.65 * Math.cos(midAngle)
                                                                }, ${centerY + radius * 0.65 * Math.sin(midAngle)
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
                                                                {rewardType === "XP"
                                                                    ? `${sectionXpValues[index].toLocaleString()} XP`
                                                                    : sectionRewards[index]}
                                                            </tspan>
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>

                                        {/* Premium Decorative Dots around the rim */}
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
                                            {Array.from({ length: 32 }, (_, index) => {
                                                const dotAngle = index * 11.25 * (Math.PI / 180); // 32 dots around the circle
                                                const dotRadius = 218;
                                                const dotX = 225 + dotRadius * Math.cos(dotAngle);
                                                const dotY = 225 + dotRadius * Math.sin(dotAngle);

                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            position: "absolute",
                                                            left: dotX - 4,
                                                            top: dotY - 4,
                                                            width: "8px",
                                                            height: "8px",
                                                            borderRadius: "50%",
                                                            backgroundColor: "#555",
                                                            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>

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
                                                        🎯 ACTIVE
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Premium Pointer/Arrow */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "-15px",
                                                left: "50%",
                                                transform: "translateX(-50%)",
                                                width: "0",
                                                height: "0",
                                                borderLeft: "20px solid transparent",
                                                borderRight: "20px solid transparent",
                                                borderBottom: "35px solid #e74c3c",
                                                zIndex: 20,
                                                filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))",
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Add CSS for hover effects and premium animations */}
                                <style>{`
                                  .big-wheel-section-path {
                                    transition: all 0.3s ease;
                                  }
                                  
                                  .big-wheel-section-path:hover {
                                    filter: brightness(1.2) saturate(1.1);
                                    transform: scale(1.02);
                                  }
                                  
                                  .big-wheel-container {
                                    animation: bigWheelGlow 4s ease-in-out infinite alternate;
                                  }
                                  
                                  @keyframes bigWheelGlow {
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
                                                            ? `${sectionXpValues[index].toLocaleString()} XP`
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
