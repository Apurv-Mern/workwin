import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { LoginCredentials, AuthState } from "../../types/Auth";
import { LoginRequest } from "../Api/requests";

// Initial state
const initialState: AuthState = {
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user") || "null")
    : null,
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await LoginRequest(credentials);
      return response;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.message || "Login failed");
      }
      return rejectWithValue("Login failed. Please try again.");
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  return null;
});

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Login Request
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload?.result;
        // Ensure permissions are defined
        if (state.user && !state.user.permissions) {
          state.user.permissions = [];
        }
        state.token = action.payload.token;

        localStorage.setItem("token", action.payload?.result?.token);
        localStorage.setItem("user", JSON.stringify(action.payload.result));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      });
  },
});

export default authSlice.reducer;
