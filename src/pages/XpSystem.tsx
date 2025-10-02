import React, { useEffect, useState } from "react";
import {
  Table,
  Card,
  Row,
  Col,
  Badge,
  Alert,
  Pagination,
  Spinner,
  Form,
} from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import {
  PostUsersExcelUploadCode,
  FetchXpRecords,
} from "../store/slices/userSlice";
import { toast } from "react-toastify";

const XpSystem = () => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [clientFilter, setClientFilter] = useState("");
  const [debouncedClient, setDebouncedClient] = useState("");

  const {
    xpRecords,
    xpStats,
    xpPagination,
    xpCalculation,
    xpWeekInfo,
    isLoading: storeLoading,
  } = useAppSelector((state) => state.users as any);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedClient(clientFilter.trim());
    }, 400);
    return () => clearTimeout(id);
  }, [clientFilter]);

  useEffect(() => {
    setIsPaginating(true);
    dispatch(
      FetchXpRecords({
        page,
        pageSize,
        client: debouncedClient || undefined,
      })
    ).finally(() => setIsPaginating(false));
  }, [dispatch, page, debouncedClient]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const res = await dispatch(
        PostUsersExcelUploadCode({
          file,
        })
      );

      if (PostUsersExcelUploadCode.fulfilled.match(res)) {
        // call the fetch xp records action
        dispatch(
          FetchXpRecords({
            page: 1,
            pageSize,
            client: debouncedClient || undefined,
          })
        );
        toast.success("File uploaded successfully!");
      }
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const getDayColor = (present: boolean) => {
    return present ? "success" : "secondary";
  };

  const getXPBadgeColor = (xp: number, maxXP: number) => {
    const percentage = (xp / maxXP) * 100;
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "warning";
    return "danger";
  };

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="excel-upload" className="btn btn-success mb-0">
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Uploading...
            </>
          ) : (
            "Upload Excel"
          )}
        </label>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={handleUpload}
          disabled={isLoading}
        />
      </div>

      {/* Existing XP Records from DB */}

      {/* XP Calculation Info */}
      <Alert variant="info" className="mb-4">
        <h5>XP Calculation System</h5>
        <p>
          <strong>Formula:</strong> {xpCalculation?.formula}
        </p>
        <p>
          <strong>Description:</strong> {xpCalculation?.description}
        </p>
        <p>
          <strong>XP per Day:</strong> {xpCalculation?.xpPerDay}
        </p>
        <p>
          <strong>Maximum Weekly XP:</strong> {xpCalculation?.maxWeeklyXP}
        </p>
      </Alert>

      {/* Week Information Alert */}
      {xpWeekInfo && (
        <Alert variant="success" className="mb-4">
          <h5>📅 Current Week Information</h5>
          <p>
            <strong>Week Period:</strong> {xpWeekInfo.weekDescription}
          </p>
          <p>
            <strong>Week Start:</strong> {xpWeekInfo.currentWeekStart} •{" "}
            <strong>Week End:</strong> {xpWeekInfo.currentWeekEnd}
          </p>
          <p className="mb-0">
            <Badge bg={xpWeekInfo.autoCalculated ? "primary" : "secondary"}>
              {xpWeekInfo.autoCalculated
                ? "📊 Auto-calculated Current Week"
                : "📋 Custom Week Filter Applied"}
            </Badge>
          </p>
        </Alert>
      )}

      <div className="mt-4">
        {/* Statistics Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Total Employees</Card.Title>
                <h3 className="text-primary">
                  {xpStats?.totalEmployees || xpStats?.totalEmployees}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Highest XP</Card.Title>
                <h3 className="text-success">
                  {xpStats?.highestXP?.toLocaleString?.() ?? xpStats?.highestXP}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Average XP</Card.Title>
                <h3 className="text-warning">
                  {xpStats?.averageXP?.toLocaleString?.() ?? xpStats?.averageXP}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Lowest XP</Card.Title>
                <h3 className="text-danger">
                  {xpStats?.lowestXP?.toLocaleString?.() ?? xpStats?.lowestXP}
                </h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Existing XP Records</h5>
              <div className="ms-3" style={{ minWidth: 240 }}>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter by client..."
                  value={clientFilter}
                  onChange={(e) => {
                    setPage(1);
                    setClientFilter(e.target.value);
                  }}
                />
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            {storeLoading && xpRecords.length === 0 ? (
              <div className="text-center my-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading records...
              </div>
            ) : (
              <Table
                responsive
                striped
                hover
                className={isPaginating ? "opacity-50" : ""}
              >
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Location</th>
                    <th>Client</th>
                    <th>Total XP</th>
                    <th>Days Present</th>
                    <th>Current Streak</th>
                    <th>Max Streak</th>
                    <th>Total Hours</th>
                    <th>Weekly Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {xpRecords.map((rec: any) => (
                    <tr key={`${rec.person_id}-${rec.upload_date || ""}`}>
                      <td>
                        {rec.full_name ||
                          rec.name ||
                          rec.firstname + " " + rec.surname}
                      </td>
                      <td>{rec.location}</td>
                      <td>{rec.client}</td>
                      <td>
                        <Badge
                          bg={getXPBadgeColor(rec.total_xp, 17500)}
                          className="fs-6"
                        >
                          {Number(rec.total_xp || 0).toLocaleString()} XP
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="info">{rec.total_days_present}/7 days</Badge>
                      </td>
                      <td>{rec.current_streak}</td>
                      <td>{rec.max_streak}</td>
                      <td>{Number(rec.total_hours || 0).toFixed(2)} hrs</td>
                      <td>
                        <div className="d-flex gap-1">
                          {[
                            {
                              key: "sun",
                              present: rec.sunday_present,
                              hours: rec.sunday_hours,
                            },
                            {
                              key: "mon",
                              present: rec.monday_present,
                              hours: rec.monday_hours,
                            },
                            {
                              key: "tue",
                              present: rec.tuesday_present,
                              hours: rec.tuesday_hours,
                            },
                            {
                              key: "wed",
                              present: rec.wednesday_present,
                              hours: rec.wednesday_hours,
                            },
                            {
                              key: "thu",
                              present: rec.thursday_present,
                              hours: rec.thursday_hours,
                            },
                            {
                              key: "fri",
                              present: rec.friday_present,
                              hours: rec.friday_hours,
                            },
                            {
                              key: "sat",
                              present: rec.saturday_present,
                              hours: rec.saturday_hours,
                            },
                          ].map((d) => (
                            <Badge
                              key={d.key}
                              bg={getDayColor(Boolean(d.present))}
                              title={`${d.key.toUpperCase()}: ${
                                d.present ? `${d.hours}h` : "Absent"
                              }`}
                            >
                              {d.key.charAt(0).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {xpPagination && xpPagination.totalPages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination>
                  <Pagination.Prev
                    disabled={page <= 1 || isPaginating}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                  <Pagination.Item active>
                    {xpPagination.currentPage || page}
                  </Pagination.Item>
                  <Pagination.Next
                    disabled={
                      page >= (xpPagination.totalPages || 1) || isPaginating
                    }
                    onClick={() => setPage((p) => p + 1)}
                  />
                </Pagination>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default XpSystem;
