import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  Nav,
  Container,
  Button,
  Dropdown,
} from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { logout } from "../store/slices/authSlice";
import { usePermissions } from "../utils/handlePermissions";

// Type assertion for Link buttons
const LinkNavItem = Nav.Link as any;

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { hasPermission } = usePermissions();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    window.innerWidth < 992
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleSidebar = () => {
    const newCollapsedState = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsedState);

    // For mobile: if expanding, also open the mobile menu
    if (window.innerWidth < 992 && !newCollapsedState) {
      setMobileMenuOpen(true);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="admin-layout d-flex flex-column min-vh-100">
      {/* Top Navbar */}
      <Navbar bg="primary" variant="dark" expand="lg" className="sticky-top">
        <Container fluid className="px-2 px-md-3">
          {/* Add sidebar toggle button for mobile view */}
          <Button
            variant="outline-light"
            className="me-2 d-lg-none"
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label="Toggle Sidebar"
          >
            <i className={`bi ${mobileMenuOpen ? "bi-x-lg" : "bi-list"}`}></i>
          </Button>

          <Navbar.Brand
            as={Link}
            to="/dashboard"
            className="d-flex align-items-center"
          >
            <i className="bi bi-lightning-charge-fill me-2"></i>
            <span className="d-none d-sm-inline">Work Win Mini-Game App</span>
          </Navbar.Brand>

          {/* Mobile menu toggle */}
          <div className="d-flex align-items-center">
            <Dropdown align="end" className="ms-auto">
              <Dropdown.Toggle
                variant="outline-light"
                id="dropdown-user"
                className="d-flex align-items-center"
              >
                <i className="bi bi-person-circle me-1"></i>
                <span className="d-none d-sm-inline">
                  {/* {user?.name || "User"} */}
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu align="end" className="dropdown-menu-end">
                <Dropdown.Item disabled className="py-2">
                  <small className="text-muted d-block">
                    Signed in as {user?.name}
                  </small>
                  <strong
                    className="d-block text-truncate"
                    style={{ maxWidth: "200px" }}
                  >
                    {/* {user?.email} */}
                  </strong>
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="py-2">
                  <i className="bi bi-box-arrow-right me-2"></i> Log Out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Container>
      </Navbar>

      <div className="d-flex flex-grow-1">
        {/* Sidebar */}
        <div
          className={`sidebar bg-light border-end ${sidebarCollapsed ? "collapsed" : ""
            } ${mobileMenuOpen ? "mobile-open" : ""}`}
          style={{
            width: sidebarCollapsed ? "60px" : "250px",
            transition: "width 0.3s ease, transform 0.3s ease",
            position: "fixed",
            height: "calc(100vh - 56px)",
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div className="d-flex justify-content-end p-2 d-lg-none">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={toggleMobileMenu}
            >
              <i className="bi bi-x"></i>
            </Button>
          </div>

          <Nav className="flex-column">
            <LinkNavItem
              as={Link}
              to="/dashboard"
              className={`py-3 ${location.pathname === "/dashboard"
                ? "active bg-primary text-white"
                : ""
                }`}
            >
              <i className="bi bi-speedometer2 me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                Dashboard
              </span>
            </LinkNavItem>
            {hasPermission("user.read") && (
              <LinkNavItem
                as={Link}
                to="/users"
                className={`py-3 ${location.pathname.startsWith("/users")
                  ? "active bg-primary text-white"
                  : ""
                  }`}
              >
                <i className="bi bi-people me-3"></i>
                <span className={sidebarCollapsed ? "d-none" : ""}>Users</span>
              </LinkNavItem>
            )}
            {hasPermission("role.view") && (
              <LinkNavItem
                as={Link}
                to="/role/management"
                className={`py-3 ${location.pathname === "/role/management"
                  ? "active bg-primary text-white"
                  : ""
                  }`}
              >
                <i className="bi bi-trophy me-3"></i>
                <span className={sidebarCollapsed ? "d-none" : ""}>
                  Role Management
                </span>
              </LinkNavItem>
            )}

            <LinkNavItem
              as={Link}
              to="/xp-system"
              className={`py-3 ${location.pathname === "/xp-system"
                ? "active bg-primary text-white"
                : ""
                }`}
            >
              <i className="bi bi-trophy me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                Attendance Based XP System
              </span>
            </LinkNavItem>
            {hasPermission("leaderboard.read") && (
              <LinkNavItem
                as={Link}
                to="/leaderboard"
                className={`py-3 ${location.pathname === "/leaderboard"
                  ? "active bg-primary text-white"
                  : ""
                  }`}
              >
                <i className="bi bi-trophy me-3"></i>
                <span className={sidebarCollapsed ? "d-none" : ""}>
                  LeaderBoard
                </span>
              </LinkNavItem>
            )}

            {hasPermission("reward.read") && (
              <LinkNavItem
                as={Link}
                to="/reward"
                className={`py-3 ${location.pathname === "/reward"
                  ? "active bg-primary text-white"
                  : ""
                  }`}
              >
                <i className="bi bi-bar-chart-steps me-3"></i>
                <span className={sidebarCollapsed ? "d-none" : ""}>Reward</span>
              </LinkNavItem>
            )}

            <LinkNavItem
              as={Link}
              to="/mini-spin-wheel"
              className={`py-3 ${location.pathname === "/mini-spin-wheel"
                ? "active bg-primary text-white"
                : ""
                }`}
            >
              <i className="bi bi-arrow-clockwise me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                Pixie Wheel
              </span>
            </LinkNavItem>

            <LinkNavItem
              as={Link}
              to="/big-spin-wheel"
              className={`py-3 ${location.pathname === "/big-spin-wheel"
                ? "active bg-primary text-white"
                : ""
                }`}
            >
              <i className="bi bi-disc me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                Dragon Wheel
              </span>
            </LinkNavItem>

            <LinkNavItem
              as={Link}
              to="/bonus-season"
              className={`py-3 ${location.pathname === "/bonus-season"
                ? "active bg-primary text-white"
                : ""
                }`}
            >
              <i className="bi bi-calendar-event me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                Bonus Season
              </span>
            </LinkNavItem>

            <LinkNavItem
              as={Link}
              to="/xp-thresholds"
              className={`py-3 ${location.pathname === "/xp-thresholds"
                ? "active bg-primary text-white"
                : ""
                }`}
            >
              <i className="bi bi-sliders me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                XP Thresholds
              </span>
            </LinkNavItem>

            {/* 
            <LinkNavItem
              as={Link}
              to="/leaderboard"
              className={`py-3 ${
                location.pathname === "/leaderboard"
                  ? "active bg-primary text-white"
                  : ""
              }`}
            >
              <i className="bi bi-graph-up me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                Leaderboard
              </span>
            </LinkNavItem> */}

            {/* <LinkNavItem
              as={Link}
              to="/kpi-settings"
              className={`py-3 ${
                location.pathname === "/kpi-settings"
                  ? "active bg-primary text-white"
                  : ""
              }`}
            >
              <i className="bi bi-sliders me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>
                KPI Settings
              </span>
            </LinkNavItem> */}

            {/* <LinkNavItem
              as={Link}
              to="/settings"
              className={`py-3 ${
                location.pathname === "/settings"
                  ? "active bg-primary text-white"
                  : ""
              }`}
            >
              <i className="bi bi-gear me-3"></i>
              <span className={sidebarCollapsed ? "d-none" : ""}>Settings</span>
            </LinkNavItem> */}
          </Nav>

          <div className="mt-auto p-3 border-top d-none d-lg-block">
            <Button
              variant="outline-primary"
              size="sm"
              className="w-100 d-flex align-items-center justify-content-center"
              onClick={toggleSidebar}
            >
              <i
                className={`bi bi-chevron-${sidebarCollapsed ? "right" : "left"
                  } me-1`}
              ></i>
              {!sidebarCollapsed && <span>Collapse</span>}
            </Button>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {mobileMenuOpen && (
          <div
            className="sidebar-overlay d-lg-none"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 999,
            }}
            onClick={toggleMobileMenu}
          />
        )}

        {/* Main Content */}
        <main
          className="flex-grow-1 p-3 p-md-4 responsive-main"
          style={{
            marginLeft: sidebarCollapsed ? "60px" : "250px",
            transition: "margin-left 0.3s ease",
          }}
        >
          <Container fluid className="mb-4">
            <Outlet />
          </Container>
        </main>
      </div>

      {/* CSS for responsive behavior */}
      <style>
        {`
        @media (max-width: 991.98px) {
          .responsive-main {
            margin-left: 0 !important;
          }
          .sidebar:not(.mobile-open) {
            transform: translateX(${sidebarCollapsed ? "-60px" : "-250px"});
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .sidebar {
            transition: transform 0.3s ease, width 0.3s ease;
          }
          .dropdown-menu {
            position: fixed !important;
            top: 56px !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
          }
          .dropdown-menu-end {
            left: 0 !important;
            right: 0 !important;
          }
          .navbar-brand {
            font-size: 1rem;
          }
        }
        @media (max-width: 575.98px) {
          .container-fluid {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
          .navbar-brand {
            font-size: 0.9rem;
          }
          .btn-outline-light {
            padding: 0.25rem 0.5rem;
          }
          .dropdown-toggle {
            padding: 0.25rem 0.5rem;
          }
        }
        `}
      </style>
    </div>
  );
};

export default AdminLayout;
