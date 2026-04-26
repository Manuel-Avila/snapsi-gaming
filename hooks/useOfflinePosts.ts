import * as PostRepo from "@/db/postRepository";
import * as SyncService from "@/services/syncService";
import * as NetworkService from "@/services/networkService";
import type { IGetPostsResponse } from "@/types/PostTypes";
import { QueryFunctionContext } from "react-query/types/core/types";

const PAGE_SIZE = 10;

export const getPostsFromDb = async ({
  queryKey,
  pageParam = 0,
}: QueryFunctionContext<
  [string, { category?: string; gameId?: number }]
>): Promise<IGetPostsResponse> => {
  const [_key, filters] = queryKey;
  const offset = pageParam as number;

  const posts = await PostRepo.getPostsPaginated(PAGE_SIZE, offset, filters);

  if (posts.length < PAGE_SIZE && NetworkService.isOnline() && offset === 0) {
    try {
      await SyncService.runPullOnly();
      const refreshedPosts = await PostRepo.getPostsPaginated(
        PAGE_SIZE,
        offset,
        filters
      );
      return {
        posts: refreshedPosts,
        nextCursor:
          refreshedPosts.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
      };
    } catch {
    }
  }

  return {
    posts,
    nextCursor: posts.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
};

export const getUserPostsFromDb = async ({
  queryKey,
  pageParam = 0,
}: QueryFunctionContext<[string, string]>): Promise<IGetPostsResponse> => {
  const [_key, username] = queryKey;
  const offset = pageParam as number;

  if (offset === 0 && NetworkService.isOnline()) {
    await SyncService.pullUserPosts(username);
  }

  const posts = await PostRepo.getPostsByUsername(username, PAGE_SIZE, offset);

  return {
    posts,
    nextCursor: posts.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
};

export const getBookmarkedPostsFromDb = async ({
  pageParam = 0,
}: QueryFunctionContext): Promise<IGetPostsResponse> => {
  const offset = pageParam as number;

  if (offset === 0 && NetworkService.isOnline()) {
    await SyncService.pullBookmarkedPosts();
  }

  const posts = await PostRepo.getBookmarkedPosts(PAGE_SIZE, offset);

  return {
    posts,
    nextCursor: posts.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
};
