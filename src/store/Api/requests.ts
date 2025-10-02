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
  userWithEmployer,
  userWeights,
  userExcelUpload,
  createReward,
  getRewards,
  updateReward,
  deleteReward,
  leaderBoard,
  xpRecords,
  deleteUsers,
  assignRewards,
  progressReport,
  wheelSaveConfiguration,
  wheelGetConfiguration,
  bigWheelActivate,
  bigWheelDeactivate,
  bigWheelStatus,
  bonusSeasons,
  bonusSeasonsById,
  activeBonusSeason,
  xpThresholds,
  xpThresholdsById,
  xpThresholdsGameTypes,
  xpThresholdsUserStatus,
  uploadRewardImage,
  createXpThreshold,
  loginRegistrationThresholds,
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

export const DeleteUsersByIdRequest = async (id: number) => {
  try {
    const response = await api.delete(`${deleteUsers}/${id}`);
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
export const UserWithEmployerRequest = async (data: any) => {
  try {
    console.log({ data });
    const { employerCode } = data;
    const response = await api.get(`${userWithEmployer}/${employerCode}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};
export const getUserWeightRequest = async (id: any) => {
  try {
    const response = await api.get(`${userWeights}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const postUserWeightRequest = async (data: any) => {
  try {
    const response = await api.post(`${userWeights}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};
export const postUserExcelUploadRequest = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(`${userExcelUpload} `, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const getLeaderBoardRequest = async (employerCode?: string) => {
  try {
    const url = employerCode
      ? `${leaderBoard}?employerCode=${employerCode}`
      : leaderBoard;
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export interface XpRecordQuery {
  page?: number;
  pageSize?: number;
  location?: string;
  client?: string;
  week_start_date?: string; // Optional - if not provided, current week will be auto-calculated
}

export interface XpRecordResponse {
  success: boolean;
  data: any[];
  weekInfo: {
    currentWeekStart: string;
    currentWeekEnd: string;
    autoCalculated: boolean;
    weekDescription: string;
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  xpCalculation: {
    formula: string;
    description: string;
    xpPerDay: number;
    maxWeeklyXP: number;
  };
  statistics: {
    highestXP: number;
    lowestXP: number;
    averageXP: number;
    totalEmployees: number;
  };
}

export const getXpRecordsRequest = async (
  query: XpRecordQuery = {}
): Promise<XpRecordResponse> => {
  try {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.location) params.set("location", query.location);
    if (query.client) params.set("client", query.client);
    if (query.week_start_date)
      params.set("week_start_date", query.week_start_date);

    const qs = params.toString();
    const url = qs ? `${xpRecords}?${qs}` : `${xpRecords}`;
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const createRewardRequest = async (data: any) => {
  try {
    const { file, name, description, reward_state } = data;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("description", description);
    formData.append("reward_state", reward_state);
    const response = await api.post(`${createReward}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};
export const getRewardsRequest = async (reward_state: string) => {
  try {
    const response = await api.get(
      `${getRewards}?reward_state=${reward_state}`
    );
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const updateRewardRequest = async (data: any) => {
  try {
    const { id } = data;
    const response = await api.put(`${updateReward}/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const deleteRewardRequest = async (id: any) => {
  try {
    const response = await api.delete(`${deleteReward}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const assignRewardsRequest = async (data: any) => {
  try {
    const response = await api.post(`${assignRewards}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const getProgressReportRequest = async (id: any) => {
  try {
    const { userId } = id;
    const response = await api.get(`${progressReport}/${userId}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export interface WheelConfigurationData {
  id?: number;
  sections: number;
  xpValues: (number | string)[];
  rewardTexts?: string[];
  totalXP: number;
  type?: string;
}

export interface BigWheelActivate {
  id: number;
}

export const saveWheelConfigurationRequest = async (
  data: WheelConfigurationData
) => {
  try {
    const response = await api.post(wheelSaveConfiguration, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const getWheelConfigurationRequest = async (id: any) => {
  try {
    const response = await api.get(`${wheelGetConfiguration}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const activateBigWheelRequest = async (data: BigWheelActivate) => {
  try {
    const response = await api.post(bigWheelActivate, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const deactivateBigWheelRequest = async (data: BigWheelActivate) => {
  try {
    const response = await api.post(bigWheelDeactivate, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

export const getBigWheelStatusRequest = async () => {
  try {
    const response = await api.get(bigWheelStatus);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// ===== BONUS SEASON INTERFACES AND REQUESTS =====

export interface BonusSeasonData {
  id?: number;
  name: string;
  employer_code: string;
  season_type: "easter" | "christmas" | "summer" | "winter" | "custom";
  duration_months: number;
  description?: string;
  start_date: string;
  end_date: string;
  bonus_multiplier: number;
  bonus_type: "percentage" | "fixed_amount";
  fixed_bonus_amount?: number;
  is_active: boolean;
  applies_to_games?: string[];
  min_xp_threshold?: number;
  max_participants?: number;
}

export interface BonusSeasonQuery {
  page?: number;
  limit?: number;
  is_active?: boolean;
}

// Get all bonus seasons
export const getBonusSeasonsRequest = async (query: BonusSeasonQuery = {}) => {
  try {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.is_active !== undefined)
      params.set("is_active", String(query.is_active));

    const qs = params.toString();
    const url = qs ? `${bonusSeasons}?${qs}` : bonusSeasons;
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Get specific bonus season by ID
export const getBonusSeasonByIdRequest = async (id: number) => {
  try {
    const response = await api.get(`${bonusSeasonsById}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Create new bonus season
export const createBonusSeasonRequest = async (data: BonusSeasonData) => {
  try {
    const response = await api.post(bonusSeasons, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Update bonus season
export const updateBonusSeasonRequest = async (
  id: number,
  data: Partial<BonusSeasonData>
) => {
  try {
    const response = await api.put(`${bonusSeasonsById}/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Delete bonus season
export const deleteBonusSeasonRequest = async (id: number) => {
  try {
    const response = await api.delete(`${bonusSeasonsById}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Get currently active bonus season
export const getActiveBonusSeasonRequest = async () => {
  try {
    const response = await api.get(activeBonusSeason);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// ===== XP THRESHOLD INTERFACES AND REQUESTS =====

export interface XpThresholdData {
  id?: number;
  game_name: string;
  game_type:
    | "spin_wheel"
    | "quiz"
    | "daily_challenge"
    | "achievement"
    | "custom";
  min_xp_required: number;
  level_required?: number;
  is_active: boolean;
  unlock_message?: string;
  lock_message?: string;
  icon_url?: string;
  sort_order: number;
  requires_consecutive_days?: number;
  additional_requirements?: any;
  reward_on_unlock?: any;
  cooldown_hours?: number;
  max_plays_per_day?: number;
}

export interface XpThresholdQuery {
  page?: number;
  limit?: number;
  game_type?: string;
  is_active?: boolean;
}

export interface GameType {
  value: string;
  label: string;
}

// Get all XP thresholds
export const getXpThresholdsRequest = async (query: XpThresholdQuery = {}) => {
  try {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.game_type) params.set("game_type", query.game_type);
    if (query.is_active !== undefined)
      params.set("is_active", String(query.is_active));

    const qs = params.toString();
    const url = qs ? `${xpThresholds}?${qs}` : xpThresholds;
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Get specific XP threshold by ID
export const getXpThresholdByIdRequest = async (id: number) => {
  try {
    const response = await api.get(`${xpThresholdsById}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Create new XP threshold
export const createXpThresholdRequest = async (data: XpThresholdData) => {
  try {
    const response = await api.post(xpThresholds, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Update XP threshold
export const updateXpThresholdRequest = async (
  id: number,
  data: Partial<XpThresholdData>
) => {
  try {
    const response = await api.put(`${xpThresholdsById}/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Delete XP threshold
export const deleteXpThresholdRequest = async (id: number) => {
  try {
    const response = await api.delete(`${xpThresholdsById}/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Get available game types
export const getGameTypesRequest = async () => {
  try {
    const response = await api.get(xpThresholdsGameTypes);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Get user's unlock status for all games
export const getUserGameStatusRequest = async (userId: number) => {
  try {
    const response = await api.get(
      `${xpThresholdsUserStatus}/${userId}/status`
    );
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Upload reward image
export const uploadRewardImageRequest = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("rewardImage", file);

    const response = await api.post(uploadRewardImage, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Create specific threshold for app login or registration
export const createSpecificThresholdRequest = async (data: {
  threshold_type: "app_login" | "new_registration";
  xp_value: number;
}) => {
  try {
    const response = await api.post(createXpThreshold, data);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};

// Get login and registration thresholds
export const getLoginRegistrationThresholdsRequest = async () => {
  try {
    const response = await api.get(loginRegistrationThresholds);
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
};
