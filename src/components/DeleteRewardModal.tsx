import React from "react";
import { Modal, Button } from "react-bootstrap";

interface DeleteRewardModalProps {
  show: boolean;
  onHide: () => void;
  reward: any;
  onDelete: (reward: any) => void;
}

const DeleteRewardModal: React.FC<DeleteRewardModalProps> = ({
  show,
  onHide,
  reward,
  onDelete,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Reward</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {reward ? (
          <>
            <p>
              Are you sure you want to delete the reward{" "}
              <strong>{reward.name}</strong>?
            </p>
          </>
        ) : (
          <p>No reward selected.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => reward && onDelete(reward)}
          disabled={!reward}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteRewardModal;
