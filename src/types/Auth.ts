import type { Role } from "./Permission";

export type UserRole = "super-admin" | "admin" | "employer" | "user";

export interface Permission {
  name: string;
  description?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  Roles: Role[];
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}
