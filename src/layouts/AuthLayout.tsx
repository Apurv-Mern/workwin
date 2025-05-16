import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';

const AuthLayout: React.FC = () => {
  return (
    <div className="auth-layout bg-light min-vh-100 d-flex align-items-center py-5">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <div className="card shadow-sm p-4">
              <div className="text-center mb-4">
                <h1 className="h4 fw-bold text-primary">Work Win Admin</h1>
                <p className="text-muted">Administrative Dashboard</p>
              </div>
              <Outlet />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AuthLayout; 