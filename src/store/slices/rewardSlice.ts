// import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
// import RewardService, { Reward } from "../../services/reward.service";

// interface RewardState {
//   rewards: Reward[];
//   selectedReward: Reward | null;
//   isLoading: boolean;
//   error: string | null;
// }

// const initialState: RewardState = {
//   rewards: [],
//   selectedReward: null,
//   isLoading: false,
//   error: null,
// };

// // Async thunks
// export const fetchRewards = createAsyncThunk(
//   "rewards/fetchRewards",
//   async (_, { rejectWithValue }) => {
//     try {
//       const rewards = await RewardService.getAllRewards();
//       return rewards;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to fetch rewards");
//     }
//   }
// );

// export const fetchRewardById = createAsyncThunk(
//   "rewards/fetchRewardById",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       const reward = await RewardService.getRewardById(id);
//       return reward;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to fetch reward");
//     }
//   }
// );

// export const createReward = createAsyncThunk(
//   "rewards/createReward",
//   async (
//     rewardData: Omit<Reward, "id" | "createdAt" | "updatedAt">,
//     { rejectWithValue }
//   ) => {
//     try {
//       const reward = await RewardService.createReward(rewardData);
//       return reward;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to create reward");
//     }
//   }
// );

// export const updateReward = createAsyncThunk(
//   "rewards/updateReward",
//   async (
//     { id, rewardData }: { id: string; rewardData: Partial<Reward> },
//     { rejectWithValue }
//   ) => {
//     try {
//       const reward = await RewardService.updateReward(id, rewardData);
//       return reward;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to update reward");
//     }
//   }
// );

// export const deleteReward = createAsyncThunk(
//   "rewards/deleteReward",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       await RewardService.deleteReward(id);
//       return id;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to delete reward");
//     }
//   }
// );

// export const toggleRewardStatus = createAsyncThunk(
//   "rewards/toggleRewardStatus",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       const reward = await RewardService.toggleRewardStatus(id);
//       return reward;
//     } catch (error: any) {
//       return rejectWithValue(error.message || "Failed to toggle reward status");
//     }
//   }
// );

// const rewardSlice = createSlice({
//   name: "rewards",
//   initialState,
//   reducers: {
//     setSelectedReward: (state, action: PayloadAction<Reward | null>) => {
//       state.selectedReward = action.payload;
//     },
//     clearError: (state) => {
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // Fetch Rewards
//       .addCase(fetchRewards.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(fetchRewards.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.rewards = action.payload;
//       })
//       .addCase(fetchRewards.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Fetch Reward by ID
//       .addCase(fetchRewardById.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(fetchRewardById.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.selectedReward = action.payload;
//       })
//       .addCase(fetchRewardById.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Create Reward
//       .addCase(createReward.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(createReward.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.rewards.push(action.payload);
//       })
//       .addCase(createReward.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Update Reward
//       .addCase(updateReward.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(updateReward.fulfilled, (state, action) => {
//         state.isLoading = false;
//         const index = state.rewards.findIndex(
//           (reward) => reward.id === action.payload.id
//         );
//         if (index !== -1) {
//           state.rewards[index] = action.payload;
//         }
//         if (state.selectedReward?.id === action.payload.id) {
//           state.selectedReward = action.payload;
//         }
//       })
//       .addCase(updateReward.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Delete Reward
//       .addCase(deleteReward.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(deleteReward.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.rewards = state.rewards.filter(
//           (reward) => reward.id !== action.payload
//         );
//         if (state.selectedReward?.id === action.payload) {
//           state.selectedReward = null;
//         }
//       })
//       .addCase(deleteReward.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       })
//       // Toggle Reward Status
//       .addCase(toggleRewardStatus.pending, (state) => {
//         state.isLoading = true;
//         state.error = null;
//       })
//       .addCase(toggleRewardStatus.fulfilled, (state, action) => {
//         state.isLoading = false;
//         const index = state.rewards.findIndex(
//           (reward) => reward.id === action.payload.id
//         );
//         if (index !== -1) {
//           state.rewards[index] = action.payload;
//         }
//         if (state.selectedReward?.id === action.payload.id) {
//           state.selectedReward = action.payload;
//         }
//       })
//       .addCase(toggleRewardStatus.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload as string;
//       });
//   },
// });

// export const { setSelectedReward, clearError } = rewardSlice.actions;
// export default rewardSlice.reducer;
