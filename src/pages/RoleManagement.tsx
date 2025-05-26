import React, { useEffect, useState } from "react";
import { Table, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { useAppSelector, useAppDispatch } from "../hooks/reduxHooks";
import CreateRoleModal from "../components/CreateRoleModal";
import {
  createRolesAndPermissions,
  editRolesAndPermissions,
  fetchRolesAndPermissions,
} from "../store/slices/permissionSlice";
import { usePermissions } from "../utils/handlePermissions";
import { toast } from "react-toastify";
import EditRoleModal from "../components/EditRoleModal";

const RolesManagement: React.FC = () => {
  const roles = useAppSelector((state: any) => state.permissions.roles) || [];
  const { isLoading, error } = useAppSelector(
    (state: any) => state.permissions
  );
  const { hasPermission } = usePermissions();
  const dispatch = useAppDispatch();
  useEffect(() => {
    (async () => {
      await dispatch(fetchRolesAndPermissions());
    })();
  }, []);

  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [selectedEditRole, setselectedEditRole] = useState(false);

  const handleCreateRole = async (data: any) => {
    const res = await dispatch(createRolesAndPermissions(data));
    if (createRolesAndPermissions.fulfilled.match(res)) {
      toast.success("User created successfully!");
      await dispatch(fetchRolesAndPermissions());
    }
  };

  const handleEdit = (user: any) => {
    setselectedEditRole(user);
    setShowEditRole(true);
  };

  const handleEditRole = async (data: any) => {
    const res = await dispatch(editRolesAndPermissions(data));
    if (editRolesAndPermissions.fulfilled.match(res)) {
      toast.success("Role Updated successfully!");
      await dispatch(fetchRolesAndPermissions());
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontWeight: 600 }}>Roles Management</h2>
      {hasPermission("role.create") && (
        <Button onClick={() => setShowCreateRole(true)}>Create Role</Button>
      )}
      {isLoading && (
        <div className="mb-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading roles...
        </div>
      )}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      <Table hover responsive className="mb-0" style={{ background: "#fff" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            {hasPermission("permission.view") && <th>Permissions</th>}
            {hasPermission("role.edit") && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {(roles || []).map((role: any) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td>{role.description}</td>
              {hasPermission("permission.view") && (
                <td>
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions.map((perm: any) => (
                      <Badge key={perm.id} bg="info" className="me-1 mb-1">
                        {perm.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted">No permissions</span>
                  )}
                </td>
              )}
              {hasPermission("role.edit") && (
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-1"
                    onClick={() => handleEdit(role)}
                  >
                    Edit
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      <CreateRoleModal
        show={showCreateRole}
        onHide={() => setShowCreateRole(false)}
        onSave={handleCreateRole}
      />
      <EditRoleModal
        show={showEditRole}
        onHide={() => setShowEditRole(false)}
        role={selectedEditRole}
        onSave={handleEditRole}
      />
    </div>
  );
};

export default RolesManagement;
