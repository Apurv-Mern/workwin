import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { createUserInterface, User } from "../../types/Permission";
import {
  CreateUsers,
  DeleteUsersByIdRequest,
  EditUsersById,
  GetAllUsersRequest,
  GetEmployerRequest,
  getLeaderBoardRequest,
  getXpRecordsRequest,
  getProgressReportRequest,
  getUserWeightRequest,
  postUserExcelUploadRequest,
  postUserWeightRequest,
  UserWithEmployerRequest,
} from "../Api/requests";

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  employer: [];
  usersWithEmployerCode: [];
  userWeights: [];
  leaderBoard: [];
  progressReport: [];
  xpRecords: any[];
  xpPagination: any | null;
  xpStats: any | null;
  xpCalculation: any | null;
  xpWeekInfo: any | null; // Added for week date information
}

const initialState: UserState = {
  users: [],
  isLoading: false,
  error: null,
  employer: [],
  usersWithEmployerCode: [],
  userWeights: [],
  leaderBoard: [],
  progressReport: [],
  xpRecords: [],
  xpPagination: null,
  xpStats: null,
  xpCalculation: null,
  xpWeekInfo: null,
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

export const DeleteUsersById = createAsyncThunk(
  "users/deleteUsers",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await DeleteUsersByIdRequest(id);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

export const GetEmployeer = createAsyncThunk(
  "users/GetEmployeer",
  async (_, { rejectWithValue }) => {
    try {
      const response = await GetEmployerRequest();
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);
export const UsersWithEmployerCode = createAsyncThunk(
  "users/UsersWithEmployerCode",
  async (data, { rejectWithValue }) => {
    try {
      const response = await UserWithEmployerRequest(data);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

export const GetUsersWeightsCode = createAsyncThunk(
  "users/GetUsersWeightsCode",
  async (id, { rejectWithValue }) => {
    try {
      const response = await getUserWeightRequest(id);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);
export const PostUsersWeightsCode = createAsyncThunk(
  "users/PostUsersWeightsCode",
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await postUserWeightRequest(data);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

export const PostUsersExcelUploadCode = createAsyncThunk(
  "users/PostUsersWeightsCodes",
  async ({ file }: { file: File }, { rejectWithValue }) => {
    try {
      const response = await postUserExcelUploadRequest(file);
      console.log(response);
      return response;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);
export const FetchLeaderboard = createAsyncThunk(
  "users/PostUsersWeightsCode",
  async (employerCode: string | undefined, { rejectWithValue }) => {
    try {
      const response = await getLeaderBoardRequest(employerCode);
      return response.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

export const FetchXpRecords = createAsyncThunk(
  "users/xpRecords",
  async (
    query:
      | {
          page?: number;
          pageSize?: number;
          location?: string;
          client?: string;
          week_start_date?: string;
        }
      | undefined,
    { rejectWithValue }
  ) => {
    try {
      const response = await getXpRecordsRequest(query || {});
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

export const FetchProgressReport = createAsyncThunk(
  "users/progressReport",
  async (id: any, { rejectWithValue }) => {
    try {
      const response = await getProgressReportRequest(id);
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
      })

      // Get Users with Employer Code
      .addCase(UsersWithEmployerCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(UsersWithEmployerCode.fulfilled, (state, action) => {
        state.isLoading = false;
        state.usersWithEmployerCode = action.payload?.data;
      })
      .addCase(UsersWithEmployerCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Get Users Weights Code
      .addCase(GetUsersWeightsCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(GetUsersWeightsCode.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userWeights = action.payload?.data;
      })
      .addCase(GetUsersWeightsCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Get LeaderBoard Code
      .addCase(FetchLeaderboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(FetchLeaderboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leaderBoard = action.payload?.data;
      })
      .addCase(FetchLeaderboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Get Progress Report Code
      .addCase(FetchProgressReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(FetchProgressReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.progressReport = action.payload;
      })
      .addCase(FetchProgressReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // XP Records
      .addCase(FetchXpRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(FetchXpRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.xpRecords = action.payload?.data || [];
        state.xpPagination = action.payload?.pagination || null;
        state.xpStats = action.payload?.statistics || null;
        state.xpCalculation = action.payload?.xpCalculation || null;
        state.xpWeekInfo = action.payload?.weekInfo || null; // Store week information
      })
      .addCase(FetchXpRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default userSlice.reducer;
