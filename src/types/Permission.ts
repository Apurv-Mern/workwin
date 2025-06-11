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
  firstname: string;
  lastname: string;
  email: string;
  roleId: string;
  password: string;
}

export interface UserWeight {
  emp_Id: string;
  attendance: string;
  punctuality: string;
  shift_completion: string;
  consistency: string;
}
