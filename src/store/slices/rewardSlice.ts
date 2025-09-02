import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createRewardRequest,
  getRewardsRequest,
  updateRewardRequest,
  deleteRewardRequest,
  assignRewardsRequest,
} from "../Api/requests";

interface RewardState {
  rewards: [];
  isLoading: boolean;
  error: string | null;
}

const initialState: RewardState = {
  rewards: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchRewards = createAsyncThunk(
  "rewards/fetchRewards",
  async (reward_state: string, { rejectWithValue }) => {
    try {
      const rewards = await getRewardsRequest(reward_state);
      return rewards.result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch rewards");
    }
  }
);

export const createReward = createAsyncThunk(
  "rewards/createReward",
  async (rewardData: any, { rejectWithValue }) => {
    try {
      const reward = await createRewardRequest(rewardData);
      return reward;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create reward");
    }
  }
);

export const updateReward = createAsyncThunk(
  "rewards/updateReward",
  async (rewardData: any, { rejectWithValue }) => {
    try {
      const reward = await updateRewardRequest(rewardData);
      return reward;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update reward");
    }
  }
);

export const deleteReward = createAsyncThunk(
  "rewards/deleteReward",
  async (id: any, { rejectWithValue }) => {
    try {
      const reward = await deleteRewardRequest(id);
      return reward;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete reward");
    }
  }
);

export const assignRewards = createAsyncThunk(
  "rewards/assignRewards",
  async (data: any, { rejectWithValue }) => {
    try {
      const reward = await assignRewardsRequest(data);
      return reward;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to assign reward");
    }
  }
);

const rewardSlice = createSlice({
  name: "rewards",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Rewards
      .addCase(fetchRewards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRewards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rewards = action.payload.data;
      })
      .addCase(fetchRewards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Reward
      .addCase(createReward.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createReward.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rewards = action.payload;
      })
      .addCase(createReward.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Reward
      .addCase(updateReward.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateReward.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateReward.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Reward
      .addCase(deleteReward.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteReward.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteReward.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Assign Rewards
      .addCase(assignRewards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignRewards.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the rewards state with the new assignments
        if (action.payload?.data) {
          state.rewards = action.payload.data;
        }
      })
      .addCase(assignRewards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default rewardSlice.reducer;
