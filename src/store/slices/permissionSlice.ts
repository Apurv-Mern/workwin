import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  CreateRole,
  EditPermissionListRequest,
  PermissionListRequest,
} from "../Api/requests";

// Types for role and permission
interface Permission {
  id: number;
  name: string;
}
interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
}

interface PermissionState {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PermissionState = {
  roles: [],
  isLoading: false,
  error: null,
};

export const fetchRolesAndPermissions = createAsyncThunk(
  "permissions/fetchRolesAndPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await PermissionListRequest();
      return response.result.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch permissions");
    }
  }
);
export const createRolesAndPermissions = createAsyncThunk(
  "permissions/createRolesAndPermissions",
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await CreateRole(data);
      return response.result.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch permissions");
    }
  }
);
export const editRolesAndPermissions = createAsyncThunk(
  "permissions/editRolesAndPermissions",
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await EditPermissionListRequest(data);
      return response.result.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch permissions");
    }
  }
);

const permissionSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRolesAndPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRolesAndPermissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRolesAndPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default permissionSlice.reducer;
