import * as CommentRepo from "@/db/commentRepository";
import * as SyncService from "@/services/syncService";
import * as NetworkService from "@/services/networkService";
import type { IGetCommentsResponse } from "@/types/CommentTypes";
import { QueryFunctionContext } from "react-query/types/core/types";

const PAGE_SIZE = 10;

export const getCommentsFromDb = async ({
  queryKey,
  pageParam = 0,
}: QueryFunctionContext<[string, { postId: number; postLocalId?: string }]>): Promise<IGetCommentsResponse> => {
  const [_key, postRef] = queryKey;
  const { postId, postLocalId } = postRef;
  const offset = pageParam as number;
  const isLocalOnlyPost = Boolean(postLocalId && postLocalId.startsWith("local_"));

  if (offset === 0 && NetworkService.isOnline() && !isLocalOnlyPost) {
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
