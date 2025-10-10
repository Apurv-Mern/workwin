import React from "react";
import { Modal, Button, Alert } from "react-bootstrap";

interface SpinWheelWinnersHelpProps {
  show: boolean;
  onHide: () => void;
}

const SpinWheelWinnersHelp: React.FC<SpinWheelWinnersHelpProps> = ({
  show,
  onHide,
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-question-circle me-2"></i>
          Spin Wheel Winners Guide
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="mb-4">
          <Alert.Heading>
            <i className="bi bi-info-circle me-2"></i>
            About Spin Wheel Winners
          </Alert.Heading>
          This section shows all users who have won rewards (not XP) from
          spinning wheels in the system.
        </Alert>

        <div className="mb-4">
          <h5>🎯 Features Available:</h5>
          <ul className="list-unstyled ps-3">
            <li className="mb-2">
              <i className="bi bi-check-circle text-success me-2"></i>
              <strong>Filter by Wheel Type:</strong> View winners from Pixie
              Wheel (small) or Dragon Wheel (big)
            </li>
            <li className="mb-2">
              <i className="bi bi-check-circle text-success me-2"></i>
              <strong>Date Range Filter:</strong> Filter winners by specific
              date ranges
            </li>
            <li className="mb-2">
              <i className="bi bi-check-circle text-success me-2"></i>
              <strong>Pagination:</strong> Browse through large sets of winners
              efficiently
            </li>
            <li className="mb-2">
              <i className="bi bi-check-circle text-success me-2"></i>
              <strong>Real-time Data:</strong> See the latest reward winners
              immediately
            </li>
          </ul>
        </div>

        <div className="mb-4">
          <h5>🔍 How to Use Filters:</h5>
          <ol className="ps-3">
            <li className="mb-2">
              <strong>Wheel Type:</strong> Select "Pixie Wheel" for small wheel
              winners or "Dragon Wheel" for big wheel winners
            </li>
            <li className="mb-2">
              <strong>Date From/To:</strong> Use date pickers to select a
              specific time range
            </li>
            <li className="mb-2">
              <strong>Search:</strong> Click the search button to apply your
              filters
            </li>
            <li className="mb-2">
              <strong>Clear:</strong> Use the reset button to clear all filters
            </li>
          </ol>
        </div>

        <div className="mb-4">
          <h5>📊 Understanding the Data:</h5>
          <div className="row">
            <div className="col-md-6">
              <ul className="list-unstyled">
                <li className="mb-2">
                  <strong>Winner:</strong> User name and email
                </li>
                <li className="mb-2">
                  <strong>Reward:</strong> Description of the reward won
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <ul className="list-unstyled">
                <li className="mb-2">
                  <strong>Wheel Type:</strong> Which wheel they spun
                </li>
                <li className="mb-2">
                  <strong>XP Earned:</strong> XP points earned with the reward
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Alert variant="warning" className="mb-0">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Note:</strong> This section only shows reward winners, not
          XP-only spins. Users must have won actual rewards from the spin wheel
          to appear here.
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Got it!
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SpinWheelWinnersHelp;
