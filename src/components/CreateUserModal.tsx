import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { fetchRolesAndPermissions } from "../store/slices/permissionSlice";
import { GetEmployeer } from "../store/slices/userSlice";

interface CreateUserModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (user: any) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  show,
  onHide,
  onSave,
}) => {
  const dispatch = useAppDispatch();
  const { roles, isLoading } = useAppSelector(
    (state: any) => state.permissions
  );

  const { employer } = useAppSelector((state) => state.users);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [password, setPassword] = useState("");

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInRole = loggedInUser.role;
  const roleHierarchy = ["SuperAdmin", "SubAdmin", "Employer", "User"];
  const loggedInRoleIndex = roleHierarchy.indexOf(loggedInRole);
  const availableRoles = roles.filter(
    (r: any) => roleHierarchy.indexOf(r.name) > loggedInRoleIndex
  );

  useEffect(() => {
    if (show) {
      dispatch(fetchRolesAndPermissions());
    }
  }, [show, dispatch]);

  useEffect(() => {
    if (roles.length > 0 && !role) {
      setRole(roles[0].name);
    }

    if (parseInt(role) === 4) {
      dispatch(GetEmployeer());
    }
  }, [roles, role]);

  // const selectedRole = roles.find((r: any) => r.name === role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstname: firstName,
      lastname: lastName,
      email,
      roleId: role,
      password,
      userCode: empCode,
    });
    onHide();
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("");
    setEmpCode("");
    setPassword("");
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create User</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
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
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              disabled={isLoading}
            >
              <option value="">Please select a role</option>
              {availableRoles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          {parseInt(role) === 4 && (
            <Form.Group className="mb-3">
              <Form.Label>All Employer</Form.Label>
              <Form.Select
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Please select a user</option>
                {employer.map((emp: any) => (
                  <option key={emp.id} value={emp.employerCode}>
                    {emp.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            Create
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;
