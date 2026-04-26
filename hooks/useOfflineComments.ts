import * as CommentRepo from "@/db/commentRepository";
import * as SyncService from "@/services/syncService";
import * as NetworkService from "@/services/networkService";
import type { IGetCommentsResponse } from "@/types/CommentTypes";
import { QueryFunctionContext } from "react-query/types/core/types";

const PAGE_SIZE = 10;

/**
 * Comments for a post — reads from SQLite with offset pagination.
 * On first call (offset=0), pulls latest from backend if online.
 */
export const getCommentsFromDb = async ({
  queryKey,
  pageParam = 0,
}: QueryFunctionContext<[string, number]>): Promise<IGetCommentsResponse> => {
  const [_key, postId] = queryKey;
  const offset = pageParam as number;

  // On first page load, pull from backend to populate SQLite
  if (offset === 0 && NetworkService.isOnline()) {
    await SyncService.pullComments(postId);
  }

  const comments = await CommentRepo.getCommentsPaginated(
    postId,
    PAGE_SIZE,
    offset
  );

  return {
    comments,
    nextCursor: comments.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
};
