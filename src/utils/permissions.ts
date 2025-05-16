import type { AuthUser, UserRole } from "../types/Auth";

// Define role hierarchy (higher index means higher access level)
const ROLE_HIERARCHY: UserRole[] = ["user", "employer", "admin", "super-admin"];

/**
 * Checks if a user has a specific permission
 */
export const hasPermission = (
  user: AuthUser | null,
  permission: string
): boolean => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

/**
 * Checks if a user has any of the specified permissions
 */
export const hasAnyPermission = (
  user: AuthUser | null,
  permissions: string[]
): boolean => {
  if (!user || !user.permissions) return false;
  return permissions.some((permission) =>
    user.permissions.includes(permission)
  );
};

/**
 * Checks if a user has all of the specified permissions
 */
export const hasAllPermissions = (
  user: AuthUser | null,
  permissions: string[]
): boolean => {
  if (!user || !user.permissions) return false;
  return permissions.every((permission) =>
    user.permissions.includes(permission)
  );
};

/**
 * Checks if a user has a specific role or higher
 */
export const hasRole = (user: AuthUser | null, role: UserRole): boolean => {
  if (!user) return false;

  const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(role);

  return userRoleIndex >= requiredRoleIndex;
};

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = (role: UserRole): string[] => {
  switch (role) {
    case "super-admin":
      return [
        "manage_all_users",
        "manage_admins",
        "manage_employers",
        "view_all_reports",
        "manage_rewards",
        "manage_levels",
        "manage_leaderboard",
        "set_kpi_metrics",
        "full_dashboard_access",
      ];
    case "admin":
      return [
        "manage_users",
        "view_reports",
        "manage_rewards",
        "manage_levels",
        "manage_leaderboard",
        "set_kpi_metrics",
        "dashboard_access",
      ];
    case "employer":
      return [
        "view_users",
        "view_reports",
        "view_rewards",
        "view_leaderboard",
        "limited_dashboard_access",
      ];
    case "user":
    default:
      return [];
  }
};

/**
 * Get combined permissions for a user (from both role and explicit permissions)
 */
export const getUserPermissions = (user: AuthUser | null): string[] => {
  if (!user) return [];

  // Get role-based permissions
  const rolePermissions = getRolePermissions(user.role);

  // Combine with explicit permissions if they exist
  const userPermissions = user.permissions || [];

  // Remove duplicates using Array.from instead of spread
  return Array.from(new Set([...rolePermissions, ...userPermissions]));
};

/**
 * Enhanced permission check that combines role-based and explicit permissions
 */
export const hasPermissionEnhanced = (
  user: AuthUser | null,
  permission: string
): boolean => {
  if (!user) return false;

  const combinedPermissions = getUserPermissions(user);
  return combinedPermissions.includes(permission);
};

/**
 * Enhanced permission check that checks if a user has any of the specified permissions
 * This combines role-based and explicit permissions
 */
export const hasAnyPermissionEnhanced = (
  permissions: string[],
  user: AuthUser | null
): boolean => {
  if (!user) return false;

  const combinedPermissions = getUserPermissions(user);
  return permissions.some((permission) =>
    combinedPermissions.includes(permission)
  );
};
