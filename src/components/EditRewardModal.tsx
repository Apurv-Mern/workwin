import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

interface EditRewardModalProps {
  show: boolean;
  onHide: () => void;
  reward: any;
  onSave: (reward: {
    id: string;
    name: string;
    description: string;
    reward_state: string;
    file?: File | null;
  }) => void;
}

const EditRewardModal: React.FC<EditRewardModalProps> = ({
  show,
  onHide,
  reward,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardState, setRewardState] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (show && reward) {
      setName(reward.name || "");
      setDescription(reward.description || "");
      setRewardState(reward.reward_state || "current");
      setFile(null);
    }
  }, [show, reward]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: reward.id,
      name: name.trim(),
      description,
      reward_state: rewardState,
      file,
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Reward</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Reward State</Form.Label>
            <Form.Select
              value={rewardState}
              onChange={(e) => setRewardState(e.target.value)}
              required
            >
              <option value="current">Current</option>
              <option value="upcoming">Upcoming</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Image</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {reward?.filename && !file && (
              <div className="mt-2">
                <img
                  src={reward.filename}
                  alt={reward.name}
                  style={{ maxWidth: 100 }}
                />
              </div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Update
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditRewardModal;
