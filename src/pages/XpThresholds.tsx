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
  Table,
  Badge,
  Modal,
} from "react-bootstrap";
import {
  getXpThresholdsRequest,
  createXpThresholdRequest,
  updateXpThresholdRequest,
  getGameTypesRequest,
  createSpecificThresholdRequest,
  getLoginRegistrationThresholdsRequest,
} from "../store/Api/requests";

interface XpThresholdItem {
  id: number;
  game_name: string;
  game_type: string;
  min_xp_required: number;
  level_required?: number;
  is_active: boolean;
  unlock_message?: string;
  lock_message?: string;
  icon_url?: string;
  sort_order: number;
  requires_consecutive_days?: number;
  additional_requirements?: any;
  reward_on_unlock?: any;
  cooldown_hours?: number;
  max_plays_per_day?: number;
  created_at: string;
  updated_at: string;
}

interface XpThresholdFormData {
  id?: number;
  game_name: string;
  game_type: string;
  min_xp_required: number;
  level_required: number;
  is_active: boolean;
  unlock_message: string;
  lock_message: string;
  icon_url: string;
  sort_order: number;
  requires_consecutive_days: number;
  cooldown_hours: number;
  max_plays_per_day: number;
}

interface GameType {
  value: string;
  label: string;
}

const XpThresholds = () => {
  const [xpThresholds, setXpThresholds] = useState<XpThresholdItem[]>([]);
  const [loginRegThresholds, setLoginRegThresholds] = useState<
    XpThresholdItem[]
  >([]);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateThresholdModal, setShowCreateThresholdModal] =
    useState(false);
  const [editingItem, setEditingItem] = useState<XpThresholdItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">(
    "success"
  );

  // New state for create threshold modal
  const [thresholdType, setThresholdType] = useState<
    "app_login" | "new_registration"
  >("app_login");
  const [xpValue, setXpValue] = useState<number>(0);

  const [formData, setFormData] = useState<XpThresholdFormData>({
    game_name: "",
    game_type: "spin_wheel",
    min_xp_required: 0,
    level_required: 0,
    is_active: true,
    unlock_message: "",
    lock_message: "",
    icon_url: "",
    sort_order: 0,
    requires_consecutive_days: 0,
    cooldown_hours: 0,
    max_plays_per_day: 0,
  });

  // Load data on component mount
  useEffect(() => {
    loadXpThresholds();
    loadGameTypes();
    loadLoginRegistrationThresholds();
  }, []);

  const loadXpThresholds = async () => {
    setIsLoading(true);
    try {
      const response = await getXpThresholdsRequest({ limit: 50 });
      if (response.flag) {
        setXpThresholds(response.result.thresholds || []);
      }
    } catch (error) {
      console.error("Failed to load XP thresholds:", error);
      showNotification("Failed to load XP thresholds", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGameTypes = async () => {
    try {
      const response = await getGameTypesRequest();
      if (response.flag) {
        setGameTypes(response.result || []);
      }
    } catch (error) {
      console.error("Failed to load game types:", error);
    }
  };

  const loadLoginRegistrationThresholds = async () => {
    try {
      const response = await getLoginRegistrationThresholdsRequest();
      if (response.flag) {
        setLoginRegThresholds(response.result || []);
      }
    } catch (error) {
      console.error("Failed to load login/registration thresholds:", error);
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

  const handleInputChange = (
    field: keyof XpThresholdFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.game_name.trim()) {
      showNotification("Please enter a game name", "danger");
      return;
    }

    if (formData.min_xp_required < 0) {
      showNotification("Minimum XP required cannot be negative", "danger");
      return;
    }

    setIsSaving(true);
    try {
      const apiData = {
        game_name: formData.game_name,
        game_type: formData.game_type as
          | "spin_wheel"
          | "quiz"
          | "daily_challenge"
          | "achievement"
          | "custom",
        min_xp_required: formData.min_xp_required,
        level_required:
          formData.level_required > 0 ? formData.level_required : undefined,
        is_active: formData.is_active,
        unlock_message: formData.unlock_message || undefined,
        lock_message: formData.lock_message || undefined,
        icon_url: formData.icon_url || undefined,
        sort_order: formData.sort_order,
        requires_consecutive_days:
          formData.requires_consecutive_days > 0
            ? formData.requires_consecutive_days
            : undefined,
        cooldown_hours:
          formData.cooldown_hours > 0 ? formData.cooldown_hours : undefined,
        max_plays_per_day:
          formData.max_plays_per_day > 0
            ? formData.max_plays_per_day
            : undefined,
      };

      if (editingItem) {
        await updateXpThresholdRequest(editingItem.id, apiData);
        showNotification("XP threshold updated successfully!");
      } else {
        await createXpThresholdRequest(apiData);
        showNotification("XP threshold created successfully!");
      }

      handleCloseModal();
      loadXpThresholds();
    } catch (error: any) {
      console.error("Failed to save XP threshold:", error);
      const errorMessage =
        error?.message || "Failed to save XP threshold. Please try again.";
      showNotification(errorMessage, "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: XpThresholdItem) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      game_name: item.game_name,
      game_type: item.game_type,
      min_xp_required: item.min_xp_required,
      level_required: item.level_required || 0,
      is_active: item.is_active,
      unlock_message: item.unlock_message || "",
      lock_message: item.lock_message || "",
      icon_url: item.icon_url || "",
      sort_order: item.sort_order,
      requires_consecutive_days: item.requires_consecutive_days || 0,
      cooldown_hours: item.cooldown_hours || 0,
      max_plays_per_day: item.max_plays_per_day || 0,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      game_name: "",
      game_type: "spin_wheel",
      min_xp_required: 0,
      level_required: 0,
      is_active: true,
      unlock_message: "",
      lock_message: "",
      icon_url: "",
      sort_order: 0,
      requires_consecutive_days: 0,
      cooldown_hours: 0,
      max_plays_per_day: 0,
    });
  };

  const handleCreateThreshold = async () => {
    // Validation
    if (xpValue < 0) {
      showNotification("XP value cannot be negative", "danger");
      return;
    }

    setIsSaving(true);
    try {
      await createSpecificThresholdRequest({
        threshold_type: thresholdType,
        xp_value: xpValue,
      });
      showNotification(
        `${
          thresholdType === "app_login" ? "App Login" : "New Registration"
        } threshold created successfully!`
      );
      setShowCreateThresholdModal(false);
      setThresholdType("app_login");
      setXpValue(0);
      loadLoginRegistrationThresholds();
    } catch (error: any) {
      console.error("Failed to create threshold:", error);
      const errorMessage =
        error?.message || "Failed to create threshold. Please try again.";
      showNotification(errorMessage, "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const getGameTypeLabel = (gameType: string) => {
    const type = gameTypes.find((t) => t.value === gameType);
    return type ? type.label : gameType;
  };

  if (isLoading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading XP threshold configuration...</p>
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
              <h2 className="mb-0">Configurable XP Thresholds</h2>
              <p className="text-muted mb-0">
                Configure when games become available and set unlock
                requirements
              </p>
            </div>
            {/* <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={() => setShowCreateThresholdModal(true)}
                disabled={isLoading}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Threshold
              </Button>
            </div> */}
          </div>
        </Col>
      </Row>

      {/* Login/Registration Thresholds */}
      {loginRegThresholds.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Login & Registration Thresholds</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>XP Value</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginRegThresholds.map((threshold) => (
                      <tr key={threshold.id}>
                        <td>
                          <Badge
                            bg={
                              threshold.game_type === "app_login"
                                ? "primary"
                                : "info"
                            }
                          >
                            {threshold.game_type === "app_login"
                              ? "App Login"
                              : "New Registration"}
                          </Badge>
                        </td>
                        <td>
                          <strong>{threshold.min_xp_required}</strong> XP
                        </td>
                        <td>
                          {threshold.is_active ? (
                            <Badge bg="success">Active</Badge>
                          ) : (
                            <Badge bg="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">
                            {threshold.unlock_message || "No description"}
                          </small>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(threshold)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* XP Thresholds List */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Game Unlock Thresholds</h5>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading thresholds...</p>
                </div>
              ) : xpThresholds.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-controller fs-1 text-muted mb-3"></i>
                  <p className="text-muted">No XP thresholds configured yet.</p>
                  <Button variant="primary" onClick={() => setShowModal(true)}>
                    Create First Threshold
                  </Button>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Game Name</th>
                      <th>Type</th>
                      <th>XP Required</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xpThresholds.map((threshold) => (
                      <tr key={threshold.id}>
                        <td>
                          <strong>{threshold.game_name}</strong>
                          {threshold.unlock_message && (
                            <div className="text-muted small">
                              {threshold.unlock_message}
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge bg="info">
                            {getGameTypeLabel(threshold.game_type)}
                          </Badge>
                        </td>
                        <td>
                          <strong>
                            {threshold.min_xp_required.toLocaleString()}
                          </strong>{" "}
                          XP
                        </td>

                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(threshold)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          {/* <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(threshold.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button> */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Threshold Modal */}
      <Modal
        show={showCreateThresholdModal}
        onHide={() => setShowCreateThresholdModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Create XP Threshold</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Threshold Type *</Form.Label>
              <Form.Select
                value={thresholdType}
                onChange={(e) =>
                  setThresholdType(
                    e.target.value as "app_login" | "new_registration"
                  )
                }
              >
                <option value="app_login">App Login</option>
                <option value="new_registration">New Registration</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Choose the type of action that will earn XP points
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>XP Value *</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={xpValue}
                onChange={(e) => setXpValue(parseInt(e.target.value) || 0)}
                placeholder="Enter XP value"
              />
              <Form.Text className="text-muted">
                Amount of XP points to award for this action
              </Form.Text>
            </Form.Group>

            <Alert variant="info">
              <small>
                <strong>Note:</strong>{" "}
                {thresholdType === "app_login"
                  ? "App Login rewards are limited to once per week with a 7-day cooldown."
                  : "New Registration xp are given once per user upon account creation."}
              </small>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCreateThresholdModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateThreshold}
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
                Creating...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Create Threshold
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingItem ? "Edit XP Threshold" : "Add XP Threshold"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Game Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.game_name}
                    onChange={(e) =>
                      handleInputChange("game_name", e.target.value)
                    }
                    placeholder="e.g., Big Spin Wheel"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum XP Required *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.min_xp_required}
                    onChange={(e) =>
                      handleInputChange(
                        "min_xp_required",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
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
                {editingItem ? "Update" : "Create"} Threshold
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

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
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default XpThresholds;
