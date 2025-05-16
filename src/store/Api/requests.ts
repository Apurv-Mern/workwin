import { api } from "../../config/axiosSetup";
import type { LoginCredentials } from "../../types/Auth";
import { login } from "./endpoints";

// Define the API requests
export const LoginRequest = async (data: LoginCredentials) => {
  try {
    const response = await api.post(login, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};
