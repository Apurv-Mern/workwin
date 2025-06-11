import { useEffect } from "react";
import { Table, Container, Card } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { FetchLeaderboard } from "../store/slices/userSlice";

const LeaderBoard = () => {
  const { leaderBoard } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(FetchLeaderboard());
  }, []);

  console.log({ leaderBoard });

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Body>
          <h2 className="mb-4">Leaderboard</h2>
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
              {leaderBoard?.map((user: any, idx) => (
                <tr key={user.rank}>
                  <td>{idx + 1}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.totalUserXp}</td>
                  <td>{user.curr_levels}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LeaderBoard;
