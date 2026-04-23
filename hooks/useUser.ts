import api from "@/api/apiClient";
import type { IFollowUserData, IUserProfile } from "@/types/UserTypes";
import { QueryFunctionContext } from "react-query";

export const useUser = () => {
  const getProfile = async ({
    queryKey,
  }: QueryFunctionContext<[string, string]>): Promise<IUserProfile> => {
    const [_key, username] = queryKey;
    const response = await api.get(`/user/${username}`);

    return response.data?.user;
  };

  const followUser = async ({ id, username }: IFollowUserData) => {
    const response = await api.post(`/user/${id}/follow`);
    return response.data;
  };

  const unfollowUser = async ({ id, username }: IFollowUserData) => {
    const response = await api.delete(`/user/${id}/follow`);
    return response.data;
  };

  return { getProfile, followUser, unfollowUser };
};
