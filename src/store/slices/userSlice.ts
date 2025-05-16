// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import type { PayloadAction } from "@reduxjs/toolkit";
// import type { AuthUser } from "../../types/Auth";
// // import UserService, { User } from "../../services/user.service";

// interface UserState {
//   users: User[];
//   selectedUser: User | null;
//   isLoading: boolean;
//   error: string | null;
// }

// const initialState: UserState = {
//   users: [],
//   selectedUser: null,
//   isLoading: false,
//   error: null,
// };

// // Async thunks
// export const fetchUsers = createAsyncThunk(
//   "users/fetchUsers",
//   async (_, { rejectWithValue }) => {
//     try {
//       const users = await UserService.getAllUsers();
//       return users;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to fetch users");
//     }
//   }
// );

// export const fetchUserById = createAsyncThunk(
//   "users/fetchUserById",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       const user = await UserService.getUserById(id);
//       return user;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to fetch user");
//     }
//   }
// );

// export const createUser = createAsyncThunk(
//   "users/createUser",
//   async (
//     userData: Omit<User, "id" | "createdAt" | "updatedAt">,
//     { rejectWithValue }
//   ) => {
//     try {
//       const newUser = await UserService.createUser(userData);
//       return newUser;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to create user");
//     }
//   }
// );

// export const updateUser = createAsyncThunk(
//   "users/updateUser",
//   async (
//     { id, userData }: { id: string; userData: Partial<User> },
//     { rejectWithValue }
//   ) => {
//     try {
//       const updatedUser = await UserService.updateUser(id, userData);
//       return updatedUser;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to update user");
//     }
//   }
// );

// export const deleteUser = createAsyncThunk(
//   "users/deleteUser",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       await UserService.deleteUser(id);
//       return id;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to delete user");
//     }
//   }
// );

// export const resetPassword = createAsyncThunk(
//   "users/resetPassword",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       await UserService.resetPassword(id);
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to reset password");
//     }
//   }
// );

// const userSlice = createSlice({
//   name: "users",
//   initialState,
//   reducers: {
//     setSelectedUser: (state, action: PayloadAction<User | null>) => {
//       state.selectedUser = action.payload;
//     },
//     clearError: (state) => {
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // Fetch Users
//       .addCase(fetchUsers.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(fetchUsers.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.users = action.payload;
//       })
//       .addCase(fetchUsers.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Fetch User by ID
//       .addCase(fetchUserById.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(fetchUserById.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.selectedUser = action.payload;
//       })
//       .addCase(fetchUserById.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Create User
//       .addCase(createUser.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(createUser.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.users.push(action.payload);
//       })
//       .addCase(createUser.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Update User
//       .addCase(updateUser.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(updateUser.fulfilled, (state, action) => {
//         state.isLoading = false;
//         const index = state.users.findIndex(
//           (user) => user.id === action.payload.id
//         );
//         if (index !== -1) {
//           state.users[index] = action.payload;
//         }
//         if (state.selectedUser?.id === action.payload.id) {
//           state.selectedUser = action.payload;
//         }
//       })
//       .addCase(updateUser.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Delete User
//       .addCase(deleteUser.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(deleteUser.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.users = state.users.filter((user) => user.id !== action.payload);
//         if (state.selectedUser?.id === action.payload) {
//           state.selectedUser = null;
//         }
//       })
//       .addCase(deleteUser.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Reset Password
//       .addCase(resetPassword.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(resetPassword.fulfilled, (state) => {
//         state.isLoading = false;
//       })
//       .addCase(resetPassword.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       });
//   },
// });

// export const { setSelectedUser, clearError } = userSlice.actions;
// export default userSlice.reducer;
