import React, { useEffect } from "react";
import { Row, Col, Card } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { fetchUsers } from "../store/slices/userSlice";
import { toast } from "react-toastify";

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state: any) => state.users);

  useEffect(() => {
    dispatch(fetchUsers()).catch(() => toast.error("Failed to load users"));
  }, [dispatch]);

  const totalUsers = Array.isArray(users) ? users.length : 0;
  const activeUsers = Array.isArray(users)
    ? users.filter((u: any) => (u.status || "").toLowerCase() === "active")
        .length
    : 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Dashboard</h2>
      </div>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                  <i className="bi bi-people fs-4 text-primary"></i>
                </div>
                <h6 className="text-uppercase text-muted mb-0">Total Users</h6>
              </div>
              <h2 className="display-6 mb-0">{totalUsers}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                  <i className="bi bi-person-check fs-4 text-success"></i>
                </div>
                <h6 className="text-uppercase text-muted mb-0">Active Users</h6>
              </div>
              <h2 className="display-6 mb-0">{activeUsers}</h2>
            </Card.Body>
          </Card>
        </Col>

        {/* <Col sm={6} lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <div className="rounded-circle bg-info bg-opacity-10 p-2 me-3">
                  <i className="bi bi-award fs-4 text-info"></i>
                </div>
                <h6 className="text-uppercase text-muted mb-0">
                  Total Rewards
                </h6>
              </div>
              <h2 className="display-6 mb-0">{totalRewards}</h2>
            </Card.Body>
          </Card>
        </Col> */}
      </Row>

      {/* <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white p-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Top Performer</h5>
            </Card.Header>
            <Card.Body>
              {topPerformer ? (
                <div className="d-flex align-items-center">
                  <div
                    className="avatar-initial rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                    style={{ width: "48px", height: "48px" }}
                  >
                    {String(topPerformer.name || topPerformer.email || "U")
                      .trim()
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-bold">
                      {topPerformer.name || topPerformer.email}
                    </div>
                    <div className="small text-muted">Leaderboard</div>
                  </div>
                  <div className="text-end">
                    <Badge bg="primary">
                      {Number(topPerformer.totalUserXp || 0).toLocaleString()}{" "}
                      XP
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-muted">No performer data available.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row> */}
    </div>
  );
};

export default Dashboard;
