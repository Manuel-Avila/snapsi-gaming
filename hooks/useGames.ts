import api from "@/api/apiClient";
import type { ICreateGameReviewData, IGameCategory } from "@/types/GameTypes";
import { QueryFunctionContext } from "react-query/types/core/types";
import * as NetworkService from "@/services/networkService";
import * as GameMetadataRepo from "@/db/gameMetadataRepository";

const OFFLINE_DEFAULT_CATEGORIES: IGameCategory[] = [
  { id: -1, name: "Action" },
  { id: -2, name: "Adventure" },
  { id: -3, name: "RPG" },
  { id: -4, name: "Shooter" },
  { id: -5, name: "Sports" },
  { id: -6, name: "Strategy" },
  { id: -7, name: "Puzzle" },
  { id: -8, name: "Racing" },
];

export const useGames = () => {
  const searchGames = async (search: string, page: number = 1) => {
    if (NetworkService.isOnline()) {
      try {
        const response = await api.get("/games/search", {
          params: { search, page },
        });

        if (page === 1 && response.data?.results) {
          await GameMetadataRepo.upsertGames(response.data.results);
        }

        return response.data;
      } catch {
        // Fall back to local cache
      }
    }

    const cachedResults = await GameMetadataRepo.searchGames(search);
    return { results: cachedResults, next: null, previous: null };
  };

  const searchGamesInfinite = async ({
    queryKey,
    pageParam = 1,
  }: QueryFunctionContext<[string, string]>) => {
    const [_key, search] = queryKey;
    if (NetworkService.isOnline()) {
      try {
        const params: any = { page: pageParam };
        if (search) {
          params.search = search;
        }
        const response = await api.get("/games/search", { params });

        if (pageParam === 1 && response.data?.results) {
          await GameMetadataRepo.upsertGames(response.data.results);
        }

        return response.data;
      } catch {
        // Fall back to local cache
      }
    }

    const cachedResults = await GameMetadataRepo.searchGames(search);
    return { results: cachedResults, next: null, previous: null };
  };

  const getCategories = async () => {
    if (NetworkService.isOnline()) {
      try {
        const response = await api.get("/games/categories");
        if (response.data?.results) {
          await GameMetadataRepo.upsertCategories(response.data.results);
        }
        return response.data;
      } catch {
        // Fall back to local cache
      }
    }

    const cachedCategories = await GameMetadataRepo.getCategories();
    return {
      results:
        cachedCategories.length > 0
          ? cachedCategories
          : OFFLINE_DEFAULT_CATEGORIES,
    };
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
