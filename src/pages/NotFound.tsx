import React from "react";
import { Link } from "react-router-dom";
import { Container, Button, Card } from "react-bootstrap";

// Type assertion to fix Button as={Link} type issue
const LinkButton = Button as any;

const NotFound: React.FC = () => {
  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <Card className="text-center p-5">
        <Card.Body>
          <h1 className="mb-4">404</h1>
          <h2 className="mb-4">Page Not Found</h2>
          <p className="mb-4">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <LinkButton as={Link} to="/dashboard" variant="primary">
            Go to Dashboard
          </LinkButton>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NotFound;
