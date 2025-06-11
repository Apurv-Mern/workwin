import React, { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import * as XLSX from "xlsx"; // Namespace import
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import {
  GetEmployeer,
  GetUsersWeightsCode,
  PostUsersExcelUploadCode,
  PostUsersWeightsCode,
  UsersWithEmployerCode,
} from "../store/slices/userSlice";
import type { UserWeight } from "../types/Permission";
import { toast } from "react-toastify";

const XpSystem = () => {
  const dispatch = useAppDispatch();

  const [selectedEmployer, setSelectedEmployer] = useState<string>("");
  const [selectedEmployerForWeights, setSelectedEmployerForWeights] =
    useState<string>("");
  const { employer, usersWithEmployerCode } = useAppSelector(
    (state) => state.users
  );

  const { userWeights }: { userWeights: UserWeight[] } = useAppSelector(
    (state) => state.users
  );

  const { user } = useAppSelector((state) => state.auth);
  const roleId = user?.Roles[0]?.id;
  const [fields, setFields] = useState({
    emp_Id: selectedEmployerForWeights,
    attendance: "",
    punctuality: "",
    shiftCompletion: "",
    consistency: "",
  });
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    dispatch(GetEmployeer());
  }, []);

  useEffect(() => {
    if (selectedEmployerForWeights) {
      dispatch(GetUsersWeightsCode(selectedEmployerForWeights as any));
    }
  }, [selectedEmployerForWeights]);

  useEffect(() => {
    if (selectedEmployer) {
      dispatch(
        UsersWithEmployerCode({ employerCode: selectedEmployer } as any)
      );
    }
  }, [selectedEmployer]);

  useEffect(() => {
    if (userWeights && userWeights.length > 0) {
      const uw = userWeights[0];
      setFields({
        emp_Id: uw.emp_Id?.toString() || "",
        attendance: uw.attendance || "0.00",
        punctuality: uw.punctuality || "0.00",
        shiftCompletion: uw.shift_completion || "0.00",
        consistency: uw.consistency || "0.00",
      });
    } else {
      // Set all to zero if nothing returned
      setFields({
        emp_Id: selectedEmployerForWeights,
        attendance: "0.00",
        punctuality: "0.00",
        shiftCompletion: "0.00",
        consistency: "0.00",
      });
    }
  }, [userWeights]);

  const handleDownload = () => {
    if (!selectedEmployer || !usersWithEmployerCode) return;
    const wb = XLSX.utils.book_new();

    const data = [
      // First row - main headers (merge these cells in Excel)
      [
        "Name",
        "Email",
        "Attendance",
        "",
        "Punctuality",
        "",
        "Shift Completion",
        "",
        "Consistency (Streaks)",
        "",
      ],
      // Second row - subheaders
      [
        "",
        "",
        "Approved Shifts",
        "Expected Shifts",
        "On-Time Shifts",
        "Approved Shifts",
        "Completed Shifts",
        "Assigned Shifts",
        "Streak Days",
        "Max Possible Streak",
      ],
      // Data rows
      ...usersWithEmployerCode.map((user: any) => [
        user.name || "",
        user.email || "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Add merges for the header cells
    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge main header cells
    ws["!merges"].push(
      { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } },
      { s: { r: 0, c: 6 }, e: { r: 0, c: 7 } },
      { s: { r: 0, c: 8 }, e: { r: 0, c: 9 } }
    );

    ws["!cols"] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "XP Allocation");
    const fileName = `XP_System.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const res = await dispatch(PostUsersExcelUploadCode(file));

      if (PostUsersExcelUploadCode.fulfilled.match(res)) {
        toast.success("File uploaded successfully!");
      }
    }
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow only numbers and decimals
    if (!/^\d*\.?\d*$/.test(value)) return;
    const newFields = { ...fields, [name]: value };
    setFields(newFields);
    // Validation: max value is 1 for any field
    if (value && parseFloat(value) > 1) {
      setError("Maximum value for any field is 1.");
      return;
    }
    // Validation: sum of all fields must not exceed 1
    const sum =
      (parseFloat(newFields.attendance) || 0) +
      (parseFloat(newFields.punctuality) || 0) +
      (parseFloat(newFields.shiftCompletion) || 0) +
      (parseFloat(newFields.consistency) || 0);
    if (sum > 1) {
      setError("The sum of all fields must not exceed 1.");
    } else {
      setError("");
    }
  };

  const handleFieldFocus = (field: string) => {
    setFocusedField(field);
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  const handleSave = () => {
    dispatch(PostUsersWeightsCode(fields));
  };
  console.log({ fields });

  return (
    <div>
      {(roleId === 1 || roleId === 2) && (
        <Form.Group className="mb-3">
          <Form.Label>Employer List</Form.Label>
          <Form.Select
            value={selectedEmployer}
            onChange={(e) => setSelectedEmployer(e.target.value)}
            required
          >
            <option value="">Please select a Employer</option>
            {employer.map((emp: any) => (
              <option key={emp.id} value={emp.employerCode}>
                {emp.name} | {emp.email}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      <div className="mb-3">
        <Button
          variant="primary"
          onClick={handleDownload}
          className="me-2"
          disabled={!selectedEmployer}
        >
          Download Sample Format
        </Button>
        <label htmlFor="excel-upload" className="btn btn-success mb-0">
          Upload Excel
        </label>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>

      <div className="mb-3">
        <div className="mb-3 p-2 bg-light border rounded">Weights</div>

        <div className="mb-3">
          <Form.Group className="mb-3">
            <Form.Label>Employer List</Form.Label>
            <Form.Select
              value={selectedEmployerForWeights}
              onChange={(e) => setSelectedEmployerForWeights(e.target.value)}
              required
            >
              <option value="">Please select a Employer for set weights</option>
              {employer.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} | {emp.email}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>

        {selectedEmployerForWeights && (
          <div>
            <Form.Label>Attendance</Form.Label>
            <Form.Control
              type="number"
              step="any"
              min="0"
              max="1"
              name="attendance"
              value={fields.attendance}
              onChange={handleFieldChange}
              onFocus={() => handleFieldFocus("attendance")}
              onBlur={handleFieldBlur}
              placeholder="Attendance"
              disabled={
                error === "The sum of all fields must not exceed 1." &&
                focusedField !== "attendance"
              }
            />
            <Form.Label>Punctuality</Form.Label>
            <Form.Control
              type="number"
              step="any"
              min="0"
              max="1"
              name="punctuality"
              value={fields.punctuality}
              onChange={handleFieldChange}
              onFocus={() => handleFieldFocus("punctuality")}
              onBlur={handleFieldBlur}
              placeholder="Punctuality"
              disabled={
                error === "The sum of all fields must not exceed 1." &&
                focusedField !== "punctuality"
              }
            />
            <Form.Label>Shift Completion</Form.Label>
            <Form.Control
              type="number"
              step="any"
              min="0"
              max="1"
              name="shiftCompletion"
              value={fields.shiftCompletion}
              onChange={handleFieldChange}
              onFocus={() => handleFieldFocus("shiftCompletion")}
              onBlur={handleFieldBlur}
              placeholder="Shift Completion"
              disabled={
                error === "The sum of all fields must not exceed 1." &&
                focusedField !== "shiftCompletion"
              }
            />
            <Form.Label>Consistency (Streaks)</Form.Label>
            <Form.Control
              type="number"
              step="any"
              min="0"
              max="1"
              name="consistency"
              value={fields.consistency}
              onChange={handleFieldChange}
              onFocus={() => handleFieldFocus("consistency")}
              onBlur={handleFieldBlur}
              placeholder="Consistency (Streaks)"
              disabled={
                error === "The sum of all fields must not exceed 1." &&
                focusedField !== "consistency"
              }
            />
            {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
            <div className="mb-3">
              <Button variant="primary" onClick={handleSave} className="me-2">
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default XpSystem;
