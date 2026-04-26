import * as ReviewRepo from "@/db/reviewRepository";
import * as SyncService from "@/services/syncService";
import * as NetworkService from "@/services/networkService";
import type { IGameReview } from "@/types/GameTypes";
import { QueryFunctionContext } from "react-query/types/core/types";

const PAGE_SIZE = 10;

type ReviewsResponse = {
  reviews: IGameReview[];
  nextCursor: number | null;
};

/**
 * User reviews — reads from SQLite with offset pagination.
 * On first page, pulls from backend if online to populate cache.
 */
export const getUserReviewsFromDb = async ({
  queryKey,
  pageParam = 0,
}: QueryFunctionContext<[string, string]>): Promise<ReviewsResponse> => {
  const [_key, username] = queryKey;
  const offset = pageParam as number;

  // On first page load, pull from backend
  if (offset === 0 && NetworkService.isOnline()) {
    await SyncService.pullUserReviews(username);
  }

  const reviews = await ReviewRepo.getReviewsByUsername(
    username,
    PAGE_SIZE,
    offset
  );

  return {
    reviews,
    nextCursor: reviews.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
};
