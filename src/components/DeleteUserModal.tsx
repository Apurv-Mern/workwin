import React from "react";
import { Modal, Button } from "react-bootstrap";

interface DeleteUserModalProps {
  show: boolean;
  onHide: () => void;
  user: any;
  onDelete: (user: any) => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  show,
  onHide,
  user,
  onDelete,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete User</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to delete <strong>{user?.name}</strong>?
        </p>
        <div style={{ color: "#c00" }}>This action cannot be undone.</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onDelete(user);
            onHide();
          }}
        >
          Delete User
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteUserModal;
