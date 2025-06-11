import React, { useEffect, useState } from "react";
import {
  Tabs,
  Tab,
  Form,
  Button,
  Container,
  Row,
  Col,
  Table,
  Image,
  Spinner,
} from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import {
  createReward,
  fetchRewards,
  updateReward,
  deleteReward,
} from "../store/slices/rewardSlice";
import { toast } from "react-toastify";
import { usePermissions } from "../utils/handlePermissions";
import EditRewardModal from "../components/EditRewardModal";
import DeleteRewardModal from "../components/DeleteRewardModal";

const Reward = () => {
  const [key, setKey] = useState("current");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { hasPermission } = usePermissions();
  const dispatch = useAppDispatch();
  const { rewards, isLoading } = useAppSelector((state: any) => state.rewards);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchRewards(key));
  }, [dispatch, key]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      description,
      reward_state: key,
      file: selectedFile,
    };
    const res = await dispatch(createReward(payload));
    if (createReward.fulfilled.match(res)) {
      toast.success("Reward created successfully");
      setName("");
      setDescription("");
      setSelectedFile(null);
      dispatch(fetchRewards(key));
    }
  };

  const handleEditReward = (reward: any) => {
    setSelectedReward(reward);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedReward: any) => {
    const res = await dispatch(updateReward(updatedReward));
    if (updateReward.fulfilled.match(res)) {
      toast.success("Reward updated successfully");
      dispatch(fetchRewards(key));
    } else {
      toast.error("Failed to update reward");
    }
  };

  const handleDeleteReward = (reward: any) => {
    setRewardToDelete(reward);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (reward: any) => {
    console.log({ reward });
    const res = await dispatch(deleteReward(reward.id));
    if (deleteReward.fulfilled.match(res)) {
      toast.success("Reward deleted successfully");
      dispatch(fetchRewards(key));
    } else {
      toast.error("Failed to delete reward");
    }
    setShowDeleteModal(false);
    setRewardToDelete(null);
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Rewards</h2>
      {hasPermission("reward.create") && (
        <Form onSubmit={handleSubmit} className="mb-4">
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group controlId="formName">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter name"
                  value={name}
                  onChange={handleNameChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="formDescription">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter description"
                  value={description}
                  onChange={handleDescriptionChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="formFile">
                <Form.Label>Choose Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button type="submit" variant="primary" className="w-100 mt-2">
                Submit
              </Button>
            </Col>
          </Row>
        </Form>
      )}

      <Tabs
        id="reward-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k || "current")}
        className="mb-3"
      >
        <Tab eventKey="current" title="Current Rewards">
          <div className="p-3">
            {isLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : rewards && rewards.length > 0 ? (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Image</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward: any, idx: number) => (
                    <tr key={reward.id || idx}>
                      <td>{reward.name}</td>
                      <td>{reward.description}</td>

                      <td>
                        {reward.filename ? (
                          <Image
                            src={reward.filename}
                            alt={reward.name}
                            thumbnail
                            style={{ maxWidth: 100 }}
                          />
                        ) : (
                          <span className="text-muted">No image</span>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleEditReward(reward)}
                        >
                          Edit
                        </Button>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteReward(reward)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="text-muted">No rewards found.</div>
            )}
          </div>
        </Tab>

        <Tab eventKey="upcoming" title="Upcoming Rewards">
          <div className="p-3">
            {isLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : rewards && rewards.length > 0 ? (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Image</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward: any, idx: number) => (
                    <tr key={reward.id || idx}>
                      <td>{reward.name}</td>
                      <td>{reward.description}</td>
                      <td>
                        {reward.filename ? (
                          <Image
                            src={reward.filename}
                            alt={reward.name}
                            thumbnail
                            style={{ maxWidth: 100 }}
                          />
                        ) : (
                          <span className="text-muted">No image</span>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleEditReward(reward)}
                        >
                          Edit
                        </Button>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteReward(reward)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="text-muted">No rewards found.</div>
            )}
          </div>
        </Tab>
      </Tabs>

      <EditRewardModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        reward={selectedReward}
        onSave={handleSaveEdit}
      />
      <DeleteRewardModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        reward={rewardToDelete}
        onDelete={handleConfirmDelete}
      />
    </Container>
  );
};

export default Reward;
