import { useEffect, useState } from "react";
import {
  Button,
  Container,
  Row,
  Col,
  Table,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useAppDispatch } from "../hooks/reduxHooks";
import { FetchLeaderboard } from "../store/slices/userSlice";
import { toast } from "react-toastify";
import { getSpinWheelRewardWinnersRequest } from "../store/Api/requests";
import type { SpinWheelRewardWinnersQuery } from "../store/Api/requests";

const Reward = () => {
  const dispatch = useAppDispatch();

  // Spin Wheel Winners State
  const [spinWheelWinners, setSpinWheelWinners] = useState<any[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [winnersQuery, setWinnersQuery] = useState<SpinWheelRewardWinnersQuery>(
    {
      page: 1,
      limit: 10,
    }
  );
  const [winnersPagination, setWinnersPagination] = useState<any>(null);
  const [winnersFilters] = useState({
    wheelType: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    dispatch(FetchLeaderboard());
    // Load spin wheel winners on component mount
    fetchSpinWheelWinners();
  }, [dispatch]);

  // Fetch spin wheel winners function
  const fetchSpinWheelWinners = async () => {
    setWinnersLoading(true);
    try {
      const query = {
        ...winnersQuery,
        ...winnersFilters,
      };
      const response = await getSpinWheelRewardWinnersRequest(query);
      console.log("API Response:", response); // Debug log

      // Handle the API response structure: response.result.success and response.result.data
      if (response.flag && response.result && response.result.success) {
        setSpinWheelWinners(response.result.data || []);
        setWinnersPagination(response.result.pagination);
      } else {
        toast.error("Failed to fetch spin wheel winners");
      }
    } catch (error) {
      console.error("Error fetching spin wheel winners:", error);
      toast.error("Error fetching spin wheel winners");
    } finally {
      setWinnersLoading(false);
    }
  };

  const handleWinnersPageChange = (page: number) => {
    setWinnersQuery((prev) => ({ ...prev, page }));
    fetchSpinWheelWinners();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatWheelType = (type: string) => {
    if (
      type.includes("small") ||
      type.includes("mini") ||
      type.includes("pixie")
    ) {
      return <Badge bg="info">Pixie Wheel</Badge>;
    } else if (type.includes("big") || type.includes("dragon")) {
      return <Badge bg="warning">Dragon Wheel</Badge>;
    }
    return <Badge bg="secondary">{type}</Badge>;
  };

  return (
    <Container className="py-4">
      {/* <h2 className="mb-4">Spin Wheel Reward Winners</h2> */}

      {/* Header with Help Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-trophy me-2"></i>
          Spin Wheel Reward Winners
        </h4>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={fetchSpinWheelWinners}
            disabled={winnersLoading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            {winnersLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {/* <Row className="mb-4">
        <Col md={12}>
          <div className="bg-light p-3 rounded">
            <h6 className="mb-3">🔍 Filter Options</h6>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Wheel Type</Form.Label>
                  <Form.Select
                    value={winnersFilters.wheelType}
                    onChange={(e) =>
                      handleWinnersFilterChange("wheelType", e.target.value)
                    }
                  >
                    <option value="">All Wheels</option>
                    <option value="small">Pixie Wheel</option>
                    <option value="big">Dragon Wheel</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date From</Form.Label>
                  <Form.Control
                    type="date"
                    value={winnersFilters.dateFrom}
                    onChange={(e) =>
                      handleWinnersFilterChange("dateFrom", e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date To</Form.Label>
                  <Form.Control
                    type="date"
                    value={winnersFilters.dateTo}
                    onChange={(e) =>
                      handleWinnersFilterChange("dateTo", e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <div className="d-flex gap-2 w-100">
                  <Button
                    variant="primary"
                    onClick={handleWinnersSearch}
                    className="flex-grow-1"
                  >
                    <i className="bi bi-search me-2"></i>Search
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={clearWinnersFilters}
                    title="Clear all filters"
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
        </Col>
      </Row> */}

      {/* Winners Table */}
      {winnersLoading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <div className="mt-2">Loading spin wheel winners...</div>
        </div>
      ) : spinWheelWinners && spinWheelWinners.length > 0 ? (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Winner</th>
                <th>Reward</th>
                <th>Wheel Type</th>
                <th>Date Won</th>
                {/* <th>XP Earned</th> */}
              </tr>
            </thead>
            <tbody>
              {spinWheelWinners.map((winner: any, idx: number) => (
                <tr key={winner.id || idx}>
                  <td>
                    <div>
                      <strong>{winner.user_name}</strong>
                      <br />
                      <small className="text-muted">{winner.user_email}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{winner.reward_value}</strong>
                      <br />
                      <small className="text-muted">{winner.description}</small>
                      <br />
                      <Badge bg="success">Reward</Badge>
                    </div>
                  </td>
                  <td>{formatWheelType(winner.type)}</td>
                  <td>{formatDate(winner.date)}</td>
                  {/* <td>
                    <Badge bg="primary">{winner.xp_earned} XP</Badge>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Pagination */}
          {winnersPagination && (
            <Row className="mt-3">
              <Col md={6}>
                <div className="d-flex align-items-center">
                  <span className="text-muted">
                    Showing{" "}
                    {(winnersPagination.currentPage - 1) *
                      winnersPagination.pageSize +
                      1}{" "}
                    to{" "}
                    {Math.min(
                      winnersPagination.currentPage *
                        winnersPagination.pageSize,
                      winnersPagination.totalRecords
                    )}{" "}
                    of {winnersPagination.totalRecords} results
                  </span>
                </div>
              </Col>
              <Col md={6}>
                <div className="d-flex justify-content-end">
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={!winnersPagination.hasPreviousPage}
                      onClick={() =>
                        handleWinnersPageChange(
                          winnersPagination.currentPage - 1
                        )
                      }
                    >
                      <i className="bi bi-chevron-left"></i> Previous
                    </Button>
                    <span className="align-self-center px-2">
                      Page {winnersPagination.currentPage} of{" "}
                      {winnersPagination.totalPages}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={!winnersPagination.hasNextPage}
                      onClick={() =>
                        handleWinnersPageChange(
                          winnersPagination.currentPage + 1
                        )
                      }
                    >
                      Next <i className="bi bi-chevron-right"></i>
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </>
      ) : (
        <div className="text-center py-5">
          <div className="text-muted">
            <i className="bi bi-trophy display-1 d-block mb-3"></i>
            <h5>No winners found</h5>
            <p>No spin wheel reward winners match your current filters.</p>
          </div>
        </div>
      )}
    </Container>
  );
};

export default Reward;
