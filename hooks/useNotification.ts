import api from "@/api/apiClient";
import type { IGetMyNotificationsResponse } from "@/types/NotificationTypes";
import { QueryFunctionContext } from "react-query";

export const useNotification = () => {
  const getMyNotifications = async ({
    pageParam,
  }: QueryFunctionContext): Promise<IGetMyNotificationsResponse> => {
    const cursor = pageParam;
    const limit = 10;

    const response = await api.get("/notifications", {
      params: { limit, cursor },
    });

    return response.data;
  };

  return { getMyNotifications };
};
