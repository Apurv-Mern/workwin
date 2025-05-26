import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { fetchRolesAndPermissions } from "../store/slices/permissionSlice";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { usePermissions } from "../utils/handlePermissions";

interface EditUserModalProps {
  show: boolean;
  onHide: () => void;
  user: any;
  onSave: (user: any) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  show,
  onHide,
  user,
  onSave,
}) => {
  const dispatch = useAppDispatch();
  const { roles } = useAppSelector((state: any) => state.permissions);
  const { user: loggedIn } = useAppSelector((state: any) => state.auth);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [role, setRole] = useState("");

  const { hasPermission } = usePermissions();
  useEffect(() => {
    if (show) {
      dispatch(fetchRolesAndPermissions() as any);
    }
  }, [show, dispatch]);

  useEffect(() => {
    if (user) {
      const [first, ...rest] = user.name ? user.name.split(" ") : ["", ""];
      setFirstName(first || "");
      setLastName(rest.join(" ") || "");
      setEmail(user.email || "");
      setActive(user.status === "active");
      setRole(user?.roles[0]?.id?.toString() || "");
    }
  }, [user, roles]);

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInRole = loggedInUser.role;

  const roleHierarchy = ["SuperAdmin", "SubAdmin", "Employer", "User"];

  const loggedInRoleIndex = roleHierarchy.indexOf(loggedInRole);
  const availableRoles = roles.filter(
    (r: any) => roleHierarchy.indexOf(r.name) > loggedInRoleIndex
  );

  const handleEditUsers = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: user.id,
      name: `${firstName} ${lastName}`.trim(),
      email,
      status: active ? "Active" : "Inactive",
      roleId: role,
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{"Edit User"}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleEditUsers}>
        <Modal.Body>
          <div className="row">
            <div className="col">
              <Form.Group className="mb-3">
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </Form.Group>
            </div>
            <div className="col">
              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          {loggedIn.role === "SuperAdmin" && hasPermission("user.update") ? (
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {availableRoles.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          ) : (
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <div
                style={{
                  padding: "0.375rem 0.75rem",
                  background: "#f8f9f",
                  borderRadius: 4,
                }}
              >
                {user?.roles?.[0]?.name || ""}
              </div>
            </Form.Group>
          )}

          <Form.Group className="mb-3" controlId="activeCheckbox">
            <Form.Check
              type="checkbox"
              label="Active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {"Update"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
