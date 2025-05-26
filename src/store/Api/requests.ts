import { api } from "../../config/axiosSetup";
import type { LoginCredentials } from "../../types/Auth";
import type { createUserInterface } from "../../types/Permission";
import {
  login,
  roleBasedPermission,
  allUsers,
  createUser,
  editUser,
  createRoles,
  getAllEmployer,
} from "./endpoints";

// Define the API requests
export const LoginRequest = async (data: LoginCredentials) => {
  try {
    const response = await api.post(login, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const PermissionListRequest = async () => {
  try {
    const response = await api.get(roleBasedPermission);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const GetAllUsersRequest = async () => {
  try {
    const response = await api.get(allUsers);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const CreateUsers = async (data: createUserInterface) => {
  try {
    const response = await api.post(createUser, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const EditUsersById = async (data: any) => {
  try {
    const { id } = data;
    const response = await api.put(`${editUser}/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const GetEmployerRequest = async () => {
  try {
    const response = await api.get(getAllEmployer);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const CreateRole = async (data: any) => {
  try {
    console.log({ data });
    const response = await api.post(`${createRoles}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const EditPermissionListRequest = async (data: any) => {
  try {
    console.log({ data });
    const { id } = data;
    const response = await api.put(`${roleBasedPermission}/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};
