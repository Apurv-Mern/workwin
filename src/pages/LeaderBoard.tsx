import { useEffect, useState } from "react";
import { Table, Container, Card, Form, Row, Col } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { FetchLeaderboard, GetEmployeer } from "../store/slices/userSlice";

const LeaderBoard = () => {
  const { leaderBoard, employer, isLoading } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();
  const [selectedEmployer, setSelectedEmployer] = useState<string>("");

  useEffect(() => {
    // Load employers on component mount
    dispatch(GetEmployeer());
    // Load all leaderboard initially
    dispatch(FetchLeaderboard(undefined));
  }, [dispatch]);

  const handleEmployerChange = (employerCode: string) => {
    setSelectedEmployer(employerCode);
    // Fetch leaderboard based on selected employer
    dispatch(FetchLeaderboard(employerCode || undefined));
  };

  console.log({ leaderBoard, employer });

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Body>
          <Row className="mb-4">
            <Col>
              <h2 className="mb-0">Leaderboard</h2>
            </Col>
            <Col md="auto">
              <Form.Group>
                <Form.Label>Filter by Employee</Form.Label>
                <Form.Select
                  value={selectedEmployer}
                  onChange={(e) => handleEmployerChange(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">All Employees</option>
                  {employer?.map((emp: any) => (
                    <option key={emp.id} value={emp.employerCode}>
                      {emp.name} ({emp.employerCode})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Email</th>
                <th>XP</th>
                <th>Current Levels</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : leaderBoard?.length > 0 ? (
                leaderBoard.map((user: any, idx) => (
                  <tr key={user.id || idx}>
                    <td>{idx + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.totalUserXp?.toLocaleString() || 0}</td>
                    <td>{user.curr_levels}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    No users found in leaderboard
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LeaderBoard;
