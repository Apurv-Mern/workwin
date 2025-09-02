import React from "react";
import { Modal, Button, ProgressBar } from "react-bootstrap";

interface ViewRewardModalProps {
  show: boolean;
  onHide: () => void;
  progressReport?: any;
}

const ViewRewardModal: React.FC<ViewRewardModalProps> = ({
  show,
  onHide,
  progressReport,
}) => {
  const report = progressReport?.userDetails;
  const reward = progressReport?.userRewards;

  const maxLevel = 10;
  const progressPercentage = ((report?.curr_levels || 0) / maxLevel) * 100;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Progress Report</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h4 className="mb-3">{report?.name || ""}</h4>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span>Level Progress</span>
            <span>
              Level {report?.curr_levels || 0} of {maxLevel}
            </span>
          </div>
          <ProgressBar
            now={progressPercentage}
            label={`${Math.round(progressPercentage)}%`}
            variant="success"
            className="mb-3"
          />
          <div className="row">
            <div className="col-md-6">
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Total XP</h5>
                  <h2 className="text-primary">{report?.totalUserXp || 0}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Current Level</h5>
                  <h2 className="text-success">{report?.curr_levels || 0}</h2>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rewards-section">
          <h5 className="mb-3">Rewards</h5>
          {reward && reward.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reward Name</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reward.map((rewards: any, index: number) => {
                    console.log({ rewards });
                    return (
                      <tr key={index}>
                        <td>{rewards.name}</td>
                        <td>{rewards.description}</td>
                        <td>
                          <span
                            className={`badge bg-${
                              rewards.reward_state === "active"
                                ? "success"
                                : "secondary"
                            }`}
                          >
                            {rewards.reward_state}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No rewards assigned yet</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ViewRewardModal;
