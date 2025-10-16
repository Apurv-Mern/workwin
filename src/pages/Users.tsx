import React, { useState, useEffect } from "react";
import { Button, Table, Badge, Form, InputGroup } from "react-bootstrap";
import EditUserModal from "../components/EditUserModal";
import DeleteUserModal from "../components/DeleteUserModal";
import {
  createUsers,
  editUsersById,
  fetchUsers,
  DeleteUsersById,
  FetchProgressReport,
} from "../store/slices/userSlice";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import CreateUserModal from "../components/CreateUserModal";
import { toast } from "react-toastify";
import { usePermissions } from "../utils/handlePermissions";
import * as XLSX from "xlsx";
import ViewRewardModal from "../components/ViewRewardModal";

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
  const { users, progressReport } = useAppSelector((state: any) => state.users);
  const { hasPermission } = usePermissions();

  // Derive available employers (with employerCode)
  const employers = (users || []).filter(
    (u: any) =>
      u.roles?.some((r: any) => r.name === "Employer") && u.employerCode
  );

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<any>(null);
  const [uploadedUsers, setUploadedUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInRole = (loggedInUser.role || "User") as RoleKey;

  console.log({ selectedUserForView });
  useEffect(() => {
    (async () => {
      await dispatch(fetchUsers());
    })();
  }, [dispatch]);

  const isSuperAdmin = (user: any) => {
    return user.roles?.some((role: any) => role.name === "SuperAdmin");
  };

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
    } else if (createUsers.rejected.match(res)) {
      const msg =
        (res.payload as any)?.message ||
        String(res.payload ?? "Failed to create user");
      toast.error(msg);
    }
  };

  const handleEditModel = async (user: any) => {
    setShowEdit(false);
    const res = await dispatch(editUsersById(user));
    if (editUsersById.fulfilled.match(res)) {
      toast.success("User updated successfully!");
      dispatch(fetchUsers());
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDelete(false);
    const res = await dispatch(DeleteUsersById(selectedUser.id));
    if (DeleteUsersById.fulfilled.match(res)) {
      toast.success("User deleted successfully!");
      dispatch(fetchUsers());
    }
  };

  const handleView = (user: any) => {
    setSelectedUserForView(user);
    setShowView(true);
  };

  const filterFn = roleVisibility[loggedInRole] || (() => true);
  const filteredUsers = users.filter((user: any) => {
    const userRole = user.roles?.[0]?.name;
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return filterFn(userRole) && matchesSearch;
  });

  // Download sample sheet
  const handleDownloadSample = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Email", "Password"],
      ["", "", ""],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "user_sample.xlsx");
  };

  const getProgressReport = async (user: any) => {
    handleView(user);
    const payload = { userId: user.id };
    const res = await dispatch(FetchProgressReport(payload));
    if (FetchProgressReport.fulfilled.match(res)) {
      toast.success("Progress report fetched successfully!");
    }
  };

  // Handle bulk upload
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
      // Remove header row
      const users = data
        .slice(1)
        .filter((row) => row[0] || row[1] || row[2])
        .map((row) => ({
          name: row[0] || "",
          email: row[1] || "",
          password: row[2] || "",
          status: "inactive",
          empCode: "", // to be selected from dropdown
        }));
      setUploadedUsers(users);
    };
    reader.readAsBinaryString(file);
  };

  // Approve/Unapprove logic
  const handleApprove = (idx: number) => {
    setUploadedUsers((users) =>
      users.map((u, i) => (i === idx ? { ...u, status: "active" } : u))
    );
  };
  const handleUnapprove = (idx: number) => {
    setUploadedUsers((users) =>
      users.map((u, i) => (i === idx ? { ...u, status: "inactive" } : u))
    );
  };

  const updateEmpCode = (idx: number, empCode: string) => {
    setUploadedUsers((users) =>
      users.map((u, i) => (i === idx ? { ...u, empCode } : u))
    );
  };

  // Bulk submit handler
  const handleBulkSubmit = async () => {
    const activeUsers = uploadedUsers.filter((u) => u.status === "active");
    if (activeUsers.length === 0) {
      toast.error("No users marked as active to submit.");
      return;
    }
    // Ensure all active users have an employer selected
    const missingEmp = activeUsers.find((u) => !u.empCode);
    if (missingEmp) {
      toast.error("Please select Employer for all active users.");
      return;
    }
    let successCount = 0;
    let failCount = 0;
    let res: any = null;
    for (const user of activeUsers) {
      const [firstname, ...rest] = (user.name || "").split(" ");
      const lastname = rest.join(" ");
      const payload = {
        firstname: firstname || user.name || "",
        lastname: lastname || "as",
        email: user.email,
        roleId: "4",
        password: String(user.password),
        employerCode: user.empCode, // send selected empCode
      };
      // eslint-disable-next-line no-await-in-loop
      res = await dispatch(createUsers(payload));
      if (createUsers.fulfilled.match(res)) {
        successCount++;
      } else {
        failCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} user(s) created successfully!`);
      setUploadedUsers([]);
      dispatch(fetchUsers());
    }
    if (failCount > 0) {
      const msg = (res?.payload as string) || "Some users failed to create.";
      toast.error(`${failCount} user(s) failed to create, ${msg}`);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontWeight: 600 }}>Users</h2>
      <div className="mb-3 d-flex gap-2">
        <Button variant="outline-primary" onClick={handleDownloadSample}>
          Download Sample Sheet
        </Button>
        <Form.Label
          htmlFor="bulk-upload"
          className="btn btn-outline-success mb-0"
        >
          Bulk Upload Users
        </Form.Label>
        <Form.Control
          id="bulk-upload"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleBulkUpload}
        />
      </div>
      {/* Uploaded users table */}
      {uploadedUsers.length > 0 && (
        <div className="mb-4">
          <h5>Uploaded Users (Pending Approval)</h5>
          <Table
            hover
            responsive
            className="mb-0"
            style={{ background: "#fff" }}
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Password</th>
                <th>Employer</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {uploadedUsers.map((user, idx) => (
                <tr key={idx}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.password}</td>
                  <td style={{ minWidth: 220 }}>
                    <Form.Select
                      size="sm"
                      value={user.empCode || ""}
                      onChange={(e) => updateEmpCode(idx, e.target.value)}
                    >
                      <option value="">Select Employer</option>
                      {employers.map((emp: any) => (
                        <option key={emp.id} value={emp.employerCode}>
                          {emp.name} ({emp.employerCode})
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Badge bg={user.status === "active" ? "success" : "danger"}>
                      {user.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    {user.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleUnapprove(idx)}
                      >
                        Unapprove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => handleApprove(idx)}
                      >
                        Approve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 text-end">
            <Button variant="primary" onClick={handleBulkSubmit}>
              Submit Active Users
            </Button>
          </div>
        </div>
      )}
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
        <div
          className="mb-2 d-flex align-items-center"
          style={{ maxWidth: 400 }}
        >
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <div className="mb-2" style={{ color: "#666" }}>
          Found {users.length} of {users.length} users
        </div>
        <Table hover responsive className="mb-0" style={{ background: "#fff" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Employer Code</th>
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
                <td>{user.employerCode}</td>
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
                  {user.roles.map((role: any) =>
                    role.name === "User" ? (
                      <Button
                        key={role.id}
                        variant="outline-info"
                        size="sm"
                        className="me-1"
                        onClick={() => getProgressReport(user)}
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                    ) : null
                  )}
                  {!isSuperAdmin(user) && hasPermission("user.delete") && (
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
      <ViewRewardModal
        show={showView}
        onHide={() => setShowView(false)}
        progressReport={progressReport}
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
