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

export const getLeaderBoardRequest = async () => {
  try {
    const response = await api.get(`${leaderBoard}`);
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
  week_start_date?: string;
}

export const getXpRecordsRequest = async (query: XpRecordQuery = {}) => {
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
