import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Dropdown, Spinner } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { fetchRolesAndPermissions } from "../store/slices/permissionSlice";

interface CreateRoleModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (role: {
    name: string;
    description: string;
    permissions: number[];
  }) => void;
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  show,
  onHide,
  onSave,
}) => {
  const dispatch = useAppDispatch();
  const roles = useAppSelector((state: any) => state.permissions.roles) || [];
  const { isLoading } = useAppSelector((state: any) => state.permissions);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [showPermissionsDropdown, setShowPermissionsDropdown] = useState(false);

  // Flatten all unique permissions from all roles
  const allPermissions = Array.from(
    new Map(
      roles
        .flatMap((role: any) => role.permissions)
        .map((perm: any) => [perm.id, perm])
    ).values()
  );

  useEffect(() => {
    if (show) {
      dispatch(fetchRolesAndPermissions());
      setRoleName("");
      setDescription("");
      setSelectedPermissions([]);
    }
  }, [show, dispatch]);

  const handlePermissionToggle = (permId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: roleName.trim(),
      description,
      permissions: selectedPermissions,
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Role</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Role Name</Form.Label>
            <Form.Control
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
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
            <Form.Label>Permissions</Form.Label>
            {isLoading ? (
              <div className="d-flex align-items-center">
                <Spinner size="sm" className="me-2" />
                Loading...
              </div>
            ) : (
              <Dropdown
                show={showPermissionsDropdown}
                onToggle={setShowPermissionsDropdown}
                className="w-100"
                autoClose="outside"
              >
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 text-start"
                  id="dropdown-permissions"
                >
                  {selectedPermissions.length === 0
                    ? "Select permissions"
                    : allPermissions
                        .filter((perm: any) =>
                          selectedPermissions.includes(perm.id)
                        )
                        .map((perm: any) => perm.name)
                        .join(", ")}
                </Dropdown.Toggle>
                <Dropdown.Menu
                  style={{ maxHeight: 250, overflowY: "auto", minWidth: 250 }}
                >
                  {allPermissions.length > 0 ? (
                    allPermissions.map((perm: any) => (
                      <Dropdown.Item key={perm.id} as="div" className="px-2">
                        <Form.Check
                          type="checkbox"
                          id={`perm-${perm.id}`}
                          label={perm.name}
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => handlePermissionToggle(perm.id)}
                        />
                      </Dropdown.Item>
                    ))
                  ) : (
                    <Dropdown.Item as="div" className="px-2 text-muted">
                      No permissions
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </Form.Group>
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

export default CreateRoleModal;
