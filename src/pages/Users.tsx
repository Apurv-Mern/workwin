import React, { useState, useEffect } from "react";
import { Button, Table, Badge } from "react-bootstrap";
import EditUserModal from "../components/EditUserModal";
import DeleteUserModal from "../components/DeleteUserModal";
import {
  createUsers,
  editUsersById,
  fetchUsers,
} from "../store/slices/userSlice";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import CreateUserModal from "../components/CreateUserModal";
import { toast } from "react-toastify";
import { usePermissions } from "../utils/handlePermissions";

type RoleKey = "SuperAdmin" | "SubAdmin" | "Employer";

const roleColors: Record<string, string> = {
  SuperAdmin: "danger",
  SubAdmin: "warning",
  Employer: "info",
  User: "secondary",
};

const roleLabels: Record<string, string> = {
  SuperAdmin: "Super Admin",
  SubAdmin: "SubAdmin",
  Employer: "Employer",
  User: "User",
};

const roleBadge = (role: string) => {
  const color = roleColors[role] || "secondary";
  const label = roleLabels[role] || role;
  return <Badge bg={color}>{label}</Badge>;
};

const statusBadge = (status: string) => {
  if (status === "active") return <Badge bg="success">Active</Badge>;
  return <Badge bg="danger">In Active</Badge>;
};

const roleVisibility: Record<RoleKey, (roleName: string) => boolean> = {
  SuperAdmin: () => true,
  SubAdmin: (roleName) => roleName !== "SuperAdmin",
  Employer: (roleName) => roleName !== "SuperAdmin" && roleName !== "SubAdmin",
};

const Users: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state: any) => state.users);
  const { hasPermission } = usePermissions();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInRole = (loggedInUser.role || "User") as RoleKey;

  useEffect(() => {
    (async () => {
      await dispatch(fetchUsers());
    })();
  }, [dispatch]);

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setShowEdit(true);
  };
  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setShowDelete(true);
  };
  const handleCreateRoleModel = async (data: any) => {
    setShowCreate(true);
    console.log({ data });
    const res = await dispatch(createUsers(data));
    if (createUsers.fulfilled.match(res)) {
      toast.success("User created successfully!");
      dispatch(fetchUsers());
    }
  };

  const handleEditModel = async (user: any) => {
    setShowEdit(false);
    console.log({ user });
    const res = await dispatch(editUsersById(user));
    if (editUsersById.fulfilled.match(res)) {
      toast.success("User updated successfully!");
      dispatch(fetchUsers());
    }
  };

  const handleDeleteConfirm = () => {
    setShowDelete(false);
  };

  const filterFn = roleVisibility[loggedInRole] || (() => true);
  const filteredUsers = users.filter((user: any) => {
    const userRole = user.roles?.[0]?.name;
    return filterFn(userRole);
  });

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontWeight: 600 }}>Users</h2>
      {hasPermission("user.create") && (
        <Button
          variant="primary"
          className="mb-3"
          onClick={() => {
            setShowCreate(true);
          }}
        >
          Create User
        </Button>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          padding: 24,
          marginTop: 24,
        }}
      >
        {/* <InputGroup className="mb-2">
          <InputGroup.Text>
            <i className="bi bi-search"></i>
          </InputGroup.Text>
          <Form.Control
            placeholder="Search by name, email, role, or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup> */}
        <div className="mb-2" style={{ color: "#666" }}>
          Found {users.length} of {users.length} users
        </div>
        <Table hover responsive className="mb-0" style={{ background: "#fff" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              {(hasPermission("user.update") ||
                hasPermission("user.delete")) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: any, idx: number) => (
              <tr
                key={user.email}
                style={idx % 2 === 3 ? { background: "#f5f5f5" } : {}}
              >
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {user.roles.map((role: any) => (
                    <div key={role.id}>{roleBadge(role.name)}</div>
                  ))}
                </td>
                <td>{statusBadge(user.status)}</td>
                <td>
                  {hasPermission("user.update") && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleEdit(user)}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </Button>
                  )}
                  {/* <Button variant="outline-warning" size="sm" className="me-1">
                    <i className="bi bi-key"></i>
                  </Button> */}
                  {hasPermission("user.delete") && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(user)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <EditUserModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        user={selectedUser}
        onSave={handleEditModel}
      />
      <DeleteUserModal
        show={showDelete}
        onHide={() => setShowDelete(false)}
        user={selectedUser}
        onDelete={handleDeleteConfirm}
      />
      <CreateUserModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        onSave={handleCreateRoleModel}
      />
    </div>
  );
};

export default Users;
