export interface PermissionList {
  ids: [];
  name: String;
  description: String;
}

export interface Permission {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
}

export interface createUserInterface {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  password: string;
}
