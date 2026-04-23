import api from "@/api/apiClient";
import type { ICreateGameReviewData } from "@/types/GameTypes";
import { QueryFunctionContext } from "react-query/types/core/types";

export const useGames = () => {
  const searchGames = async (search: string, page: number = 1) => {
    const response = await api.get("/games/search", {
      params: { search, page },
    });
    return response.data;
  };

  const searchGamesInfinite = async ({
    queryKey,
    pageParam = 1,
  }: QueryFunctionContext<[string, string]>) => {
    const [_key, search] = queryKey;
    const params: any = { page: pageParam };
    if (search) {
      params.search = search;
    }
    const response = await api.get("/games/search", { params });
    return response.data;
  };

  const getCategories = async () => {
    const response = await api.get("/games/categories");
    return response.data;
  };

  const createReview = async (data: ICreateGameReviewData) => {
    const response = await api.post("/games/reviews", data);
    return response.data;
  };

  const getUserReviews = async ({
    queryKey,
    pageParam,
  }: QueryFunctionContext<[string, string]>) => {
    const [_key, username] = queryKey;
    const cursor = pageParam;
    const limit = 10;
    const response = await api.get(`/games/reviews/user/${username}`, {
      params: { limit, cursor },
    });

    return response.data;
  };

  return {
    searchGames,
    searchGamesInfinite,
    getCategories,
    createReview,
    getUserReviews,
  };
};
