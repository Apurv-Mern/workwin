import React from "react";
import { Row, Col, Card } from "react-bootstrap";

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Dashboard</h2>
      </div>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                  <i className="bi bi-people fs-4 text-primary"></i>
                </div>
                <h6 className="text-uppercase text-muted mb-0">Total Users</h6>
              </div>
              {/* <h2 className="display-6 mb-0">{stats.totalUsers}</h2> */}
              <div className="small text-muted mt-2">
                <span className="text-success">
                  <i className="bi bi-arrow-up me-1"></i>12%
                </span>{" "}
                since last month
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                  <i className="bi bi-person-check fs-4 text-success"></i>
                </div>
                <h6 className="text-uppercase text-muted mb-0">Active Users</h6>
              </div>
              {/* <h2 className="display-6 mb-0">{stats.activeUsers}</h2> */}
              <div className="small text-muted mt-2">
                <span className="text-success">
                  <i className="bi bi-arrow-up me-1"></i>8%
                </span>{" "}
                since last month
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={3}>
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
              {/* <h2 className="display-6 mb-0">{stats.totalRewards}</h2> */}
              <div className="small text-muted mt-2">
                <span className="text-success">
                  <i className="bi bi-arrow-up me-1"></i>5%
                </span>{" "}
                since last month
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                  <i className="bi bi-trophy fs-4 text-warning"></i>
                </div>
                <h6 className="text-uppercase text-muted mb-0">
                  Rewards Completed
                </h6>
              </div>
              {/* <h2 className="display-6 mb-0">{stats.completedRewards}</h2> */}
              <div className="small text-muted mt-2">
                <span className="text-success">
                  <i className="bi bi-arrow-up me-1"></i>15%
                </span>{" "}
                since last month
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center p-3">
              <h5 className="mb-0">User Activity</h5>
              <div className="d-flex">
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-secondary active">
                    Week
                  </button>
                  <button className="btn btn-outline-secondary">Month</button>
                  <button className="btn btn-outline-secondary">Year</button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {/* In a real app, this would be a chart component */}
              <div className="text-center py-5 text-muted">
                <i className="bi bi-bar-chart-line fs-1 mb-3"></i>
                <p>User activity chart would be rendered here with real data</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white p-3">
              <h5 className="mb-0">Top Performers</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <ul className="list-group list-group-flush">
                <li className="list-group-item px-3 py-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="avatar-initial rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                      style={{ width: "40px", height: "40px" }}
                    >
                      JD
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">John Doe</div>
                      <div className="small text-muted">
                        Sales Representative
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="badge bg-primary">5,240 XP</div>
                    </div>
                  </div>
                </li>
                <li className="list-group-item px-3 py-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="avatar-initial rounded-circle bg-info text-white d-flex align-items-center justify-content-center me-3"
                      style={{ width: "40px", height: "40px" }}
                    >
                      AJ
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">Alice Johnson</div>
                      <div className="small text-muted">Customer Service</div>
                    </div>
                    <div className="text-end">
                      <div className="badge bg-primary">4,890 XP</div>
                    </div>
                  </div>
                </li>
                <li className="list-group-item px-3 py-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="avatar-initial rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-3"
                      style={{ width: "40px", height: "40px" }}
                    >
                      BS
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">Bob Smith</div>
                      <div className="small text-muted">Marketing</div>
                    </div>
                    <div className="text-end">
                      <div className="badge bg-primary">4,230 XP</div>
                    </div>
                  </div>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* {hasFullAccess && (
        <Row>
          <Col className="mb-4">
            <Card className="shadow-sm">
              <Card.Header className="bg-white p-3">
                <h5 className="mb-0">KPI Performance Metrics</h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={4}>
                    <Card className="border-0 bg-light">
                      <Card.Body className="text-center">
                        <h6 className="mb-2">Sales Target</h6>
                        <div className="display-6 mb-2">78%</div>
                        <div className="progress">
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{ width: "78%" }}
                            aria-valuenow={78}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="border-0 bg-light">
                      <Card.Body className="text-center">
                        <h6 className="mb-2">Customer Satisfaction</h6>
                        <div className="display-6 mb-2">92%</div>
                        <div className="progress">
                          <div
                            className="progress-bar bg-primary"
                            role="progressbar"
                            style={{ width: "92%" }}
                            aria-valuenow={92}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="border-0 bg-light">
                      <Card.Body className="text-center">
                        <h6 className="mb-2">Employee Engagement</h6>
                        <div className="display-6 mb-2">85%</div>
                        <div className="progress">
                          <div
                            className="progress-bar bg-info"
                            role="progressbar"
                            style={{ width: "85%" }}
                            aria-valuenow={85}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )} */}
    </div>
  );
};

export default Dashboard;
// Note: The above code is a simplified version of a dashboard component.
