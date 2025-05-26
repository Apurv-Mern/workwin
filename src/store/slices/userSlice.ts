import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { createUserInterface, User } from "../../types/Permission";
import {
  CreateUsers,
  EditUsersById,
  GetAllUsersRequest,
  GetEmployerRequest,
} from "../Api/requests";

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  employer: [];
}

const initialState: UserState = {
  users: [],
  isLoading: false,
  error: null,
  employer: [],
};

export const createUsers = createAsyncThunk(
  "users/createUsers",
  async (data: createUserInterface, { rejectWithValue }) => {
    try {
      const response = await CreateUsers(data);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await GetAllUsersRequest();
      return response.result.data as User[];
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);
export const editUsersById = createAsyncThunk(
  "users/editUsers",
  async (data, { rejectWithValue }) => {
    try {
      const response = await EditUsersById(data);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);
export const GetEmployeer = createAsyncThunk(
  "users/editUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await GetEmployerRequest();
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Get Users
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Users
      .addCase(createUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })

      .addCase(createUsers.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Get Employer
      .addCase(GetEmployeer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })

      .addCase(GetEmployeer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employer = action.payload?.data;
      })
      .addCase(GetEmployeer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default userSlice.reducer;
