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
  Table,
  Badge,
} from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { GetEmployeer } from "../store/slices/userSlice";
import {
  createBonusSeasonRequest,
  getBonusSeasonsRequest,
  deleteBonusSeasonRequest,
} from "../store/Api/requests";

interface BonusSeasonFormData {
  employer_code: string;
  season_type: "easter" | "christmas" | "summer" | "winter" | "custom" | "";
  duration_months: number;
  multiplier: number;
  start_date: string;
  end_date: string;
}

interface BonusSeasonItem {
  id: number;
  name: string;
  employer_code: string;
  season_type: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  bonus_multiplier: number;
  bonus_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const BonusSeason = () => {
  const { employer, isLoading } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();

  const [bonusSeasons, setBonusSeasons] = useState<BonusSeasonItem[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [formData, setFormData] = useState<BonusSeasonFormData>({
    employer_code: "",
    season_type: "",
    duration_months: 1,
    multiplier: 1,
    start_date: "",
    end_date: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">(
    "success"
  );

  // Load employers and bonus seasons on component mount
  useEffect(() => {
    dispatch(GetEmployeer());
    loadBonusSeasons();
  }, [dispatch]);

  // Load existing bonus seasons
  const loadBonusSeasons = async () => {
    setLoadingSeasons(true);
    try {
      const response = await getBonusSeasonsRequest({ limit: 50 });
      console.log("Bonus Seasons Response:", response);
      if (response.flag) {
        setBonusSeasons(response.result.seasons || []);
      }
    } catch (error) {
      console.error("Failed to load bonus seasons:", error);
      showNotification("Failed to load bonus seasons", "danger");
    } finally {
      setLoadingSeasons(false);
    }
  };

  // Calculate end date when start date or duration changes
  useEffect(() => {
    if (formData.start_date && formData.duration_months) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.duration_months);
      setFormData((prev) => ({
        ...prev,
        end_date: endDate.toISOString().split("T")[0],
      }));
    }
  }, [formData.start_date, formData.duration_months]);

  const showNotification = (
    message: string,
    variant: "success" | "danger" = "success"
  ) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const handleInputChange = (
    field: keyof BonusSeasonFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.employer_code) {
      showNotification("Please select an employer", "danger");
      return;
    }

    if (!formData.season_type) {
      showNotification("Please select a season type", "danger");
      return;
    }

    if (!formData.start_date) {
      showNotification("Please select a start date", "danger");
      return;
    }

    if (formData.duration_months < 1 || formData.duration_months > 12) {
      showNotification("Duration must be between 1 and 12 months", "danger");
      return;
    }

    setIsSaving(true);
    try {
      const apiData = {
        name: `${
          formData.season_type.charAt(0).toUpperCase() +
          formData.season_type.slice(1)
        } Season`,
        employer_code: formData.employer_code,
        season_type: formData.season_type as
          | "easter"
          | "christmas"
          | "summer"
          | "winter"
          | "custom",
        duration_months: formData.duration_months,
        start_date: formData.start_date,
        end_date: formData.end_date,
        bonus_multiplier: formData.multiplier,
        bonus_type: "percentage" as const,
        is_active: true,
      };

      console.log("Saving bonus season:", apiData);
      await createBonusSeasonRequest(apiData);
      showNotification("Bonus season configuration saved successfully!");

      // Reset form and reload data
      setFormData({
        employer_code: "",
        season_type: "",
        duration_months: 1,
        multiplier: 1,
        start_date: "",
        end_date: "",
      });

      // Reload the list
      loadBonusSeasons();
    } catch (error: any) {
      console.error("Failed to save bonus season configuration:", error);
      showNotification(
        "Failed to save bonus season configuration. Please try again.",
        "danger"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      employer_code: "",
      season_type: "",
      duration_months: 1,
      multiplier: 1,
      start_date: "",
      end_date: "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this bonus season?")) {
      return;
    }

    try {
      await deleteBonusSeasonRequest(id);
      showNotification("Bonus season deleted successfully!");
      loadBonusSeasons();
    } catch (error: any) {
      console.error("Failed to delete bonus season:", error);
      showNotification("Failed to delete bonus season", "danger");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getEmployerName = (employerCode: string) => {
    const emp = (employer as any)?.find(
      (e: any) => e.employerCode === employerCode
    );
    return emp ? emp.name : employerCode;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0">Bonus Season Configuration</h2>
              <p className="text-muted mb-0">
                Configure seasonal bonus periods for employers
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Existing Bonus Seasons List */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Existing Bonus Seasons</h5>
            </Card.Header>
            <Card.Body>
              {loadingSeasons ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading bonus seasons...</p>
                </div>
              ) : bonusSeasons.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-calendar-event fs-1 text-muted mb-3"></i>
                  <p className="text-muted">No bonus seasons configured yet.</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Season Name</th>
                      <th>Employer</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Period</th>
                      <th>Multiplier</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonusSeasons.map((season) => (
                      <tr key={season.id}>
                        <td>
                          <strong>{season.name}</strong>
                        </td>
                        <td>{getEmployerName(season.employer_code)}</td>
                        <td>
                          <Badge bg="info">
                            {season.season_type.charAt(0).toUpperCase() +
                              season.season_type.slice(1)}
                          </Badge>
                        </td>
                        <td>{season.duration_months} months</td>
                        <td>
                          <div>{formatDate(season.start_date)}</div>
                          <div className="text-muted small">
                            to {formatDate(season.end_date)}
                          </div>
                        </td>
                        <td>
                          <Badge bg="success">{season.bonus_multiplier}x</Badge>
                        </td>
                        <td>
                          {season.is_active ? (
                            <Badge bg="success">Active</Badge>
                          ) : (
                            <Badge bg="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(season.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
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

      <Row>
        <Col lg={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Season Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Select Employer</Form.Label>
                      <Form.Select
                        value={formData.employer_code}
                        onChange={(e) =>
                          handleInputChange("employer_code", e.target.value)
                        }
                        disabled={isLoading}
                      >
                        <option value="">Choose an employer...</option>
                        {employer?.map((emp: any) => (
                          <option key={emp.id} value={emp.employerCode}>
                            {emp.name} ({emp.employerCode})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Select the employer for this bonus season
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Season Type</Form.Label>
                      <Form.Select
                        value={formData.season_type}
                        onChange={(e) =>
                          handleInputChange("season_type", e.target.value)
                        }
                      >
                        <option value="">Choose season...</option>
                        <option value="easter">Easter</option>
                        <option value="christmas">Christmas</option>
                        <option value="summer">Summer</option>
                        <option value="winter">Winter</option>
                        <option value="custom">Custom</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Select the type of seasonal bonus
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (Months)</Form.Label>
                      <Form.Select
                        value={formData.duration_months}
                        onChange={(e) =>
                          handleInputChange(
                            "duration_months",
                            parseInt(e.target.value)
                          )
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (month) => (
                            <option key={month} value={month}>
                              {month} {month === 1 ? "Month" : "Months"}
                            </option>
                          )
                        )}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        How long should this bonus season last?
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Multiplier</Form.Label>
                      <Form.Control
                        min={1}
                        type="number"
                        step="0.1"
                        value={formData.multiplier}
                        onChange={(e) =>
                          handleInputChange(
                            "multiplier",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                      <Form.Text className="text-muted">
                        How much should the bonus be multiplied by?
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          handleInputChange("start_date", e.target.value)
                        }
                      />
                      <Form.Text className="text-muted">
                        When should the bonus season begin?
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.end_date}
                        onChange={(e) =>
                          handleInputChange("end_date", e.target.value)
                        }
                        readOnly
                      />
                      <Form.Text className="text-muted">
                        Automatically calculated based on start date and
                        duration
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-3 mt-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
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

                  <Button
                    variant="outline-secondary"
                    size="lg"
                    onClick={handleReset}
                    disabled={isSaving || isLoading}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reset
                  </Button>
                </div>
              </Form>
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
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default BonusSeason;
