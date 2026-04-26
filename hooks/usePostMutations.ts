import { useMutation, useQueryClient } from "react-query";
import { usePost } from "./usePost";
import { showToastErrorOnAction } from "@/utils/showToastErrorOnAction";
import * as PostRepo from "@/db/postRepository";
import * as CommentRepo from "@/db/commentRepository";
import * as SyncQueue from "@/db/syncQueueRepository";
import * as NetworkService from "@/services/networkService";
import type {
  IAddCommentData,
  IComment,
  IGetCommentsResponse,
} from "@/types/CommentTypes";
import type {
  IGetPostsResponse,
  IPost,
  ICreatePostData,
} from "@/types/PostTypes";
import type { InfiniteData, QueryKey } from "react-query";
import { IUserProfile } from "@/types/UserTypes";

type InfiniteCommentsData = InfiniteData<IGetCommentsResponse>;
type InfinitePostsData = InfiniteData<IGetPostsResponse>;

type IModifyContext = {
  previousPost: IPost | undefined;
  previousPostLists: [QueryKey, InfinitePostsData][];
};
type ICreateContext = {
  previousPostList: InfinitePostsData | undefined;
};
type IAddCommentContext = {
  previousComments: InfiniteCommentsData | undefined;
};
type IDeleteContext = {
  previousPostLists: [QueryKey, InfinitePostsData][];
  previousPost: IPost | undefined;
  previousProfile: IUserProfile | undefined;
};

// Generate a simple unique ID without external deps
const generateLocalId = (): string =>
  `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

export const usePostMutations = () => {
  const queryClient = useQueryClient();
  const {
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
  } = usePost();

  // -----------------------------------------------------------------------
  // Helper: Optimistic modify (like/unlike/bookmark/unbookmark)
  // -----------------------------------------------------------------------
  const optimisticModifyPostUpdate = (
    action: string,
    updateFn: (post: IPost) => IPost,
    syncOperation: "like" | "unlike" | "bookmark" | "unbookmark"
  ) => ({
    onMutate: async (postData: { localId: string; postId: number }) => {
      const { localId, postId } = postData;
      await queryClient.cancelQueries(["posts"]);
      await queryClient.cancelQueries(["post", postId]);

      const previousPost = queryClient.getQueryData<IPost>(["post", postId]);
      const previousPostLists = queryClient.getQueriesData<InfinitePostsData>([
        "posts",
      ]);

      // Update React Query cache
      if (previousPost) {
        queryClient.setQueryData<IPost>(
          ["post", postId],
          updateFn(previousPost)
        );
      }

      queryClient.setQueriesData<InfinitePostsData>(
        ["posts"],
        (oldData: InfinitePostsData | undefined) => {
          if (!oldData) {
            return { pages: [], pageParams: [] };
          }
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                (post.local_id === localId || post.id === postId)
                  ? updateFn(post)
                  : post
              ),
            })),
          };
        }
      );

      // Update SQLite
      try {
        if (syncOperation === "like") {
          await PostRepo.toggleLike(localId, true);
        } else if (syncOperation === "unlike") {
          await PostRepo.toggleLike(localId, false);
        } else if (syncOperation === "bookmark") {
          await PostRepo.toggleBookmark(localId, true);
        } else if (syncOperation === "unbookmark") {
          await PostRepo.toggleBookmark(localId, false);
        }
      } catch (e) {
        console.warn(`[usePostMutations] SQLite ${action} error:`, e);
      }

      return { previousPost, previousPostLists };
    },
    onError: (
      error: unknown,
      postData: { localId: string; postId: number },
      context: IModifyContext | undefined
    ) => {
      showToastErrorOnAction(action);
      if (context?.previousPost) {
        queryClient.setQueryData(["post", postData.postId], context.previousPost);
      }
      context?.previousPostLists?.forEach(
        ([key, data]: [QueryKey, InfinitePostsData]) => {
          queryClient.setQueryData(key, data);
        }
      );
    },
    onSettled: () => {},
  });

  const runOrQueuePostInteraction = async (
    postData: { localId: string; postId: number },
    syncOperation: "like" | "unlike" | "bookmark" | "unbookmark"
  ) => {
    if (!postData.postId || typeof postData.postId !== "number") {
      return;
    }

    const callApi = async () => {
      if (syncOperation === "like") {
        await likePost(postData.postId);
        return;
      }
      if (syncOperation === "unlike") {
        await unlikePost(postData.postId);
        return;
      }
      if (syncOperation === "bookmark") {
        await bookmarkPost(postData.postId);
        return;
      }
      await unbookmarkPost(postData.postId);
    };

    if (!NetworkService.isOnline()) {
      await SyncQueue.replacePendingPostInteraction(syncOperation, postData.postId);
      return;
    }

    try {
      await callApi();
    } catch (error: any) {
      // If request could not reach backend, persist operation for background sync.
      if (!error?.response) {
        await SyncQueue.replacePendingPostInteraction(syncOperation, postData.postId);
        return;
      }
      throw error;
    }
  };

  // -----------------------------------------------------------------------
  // Create Post — writes to SQLite + enqueues sync
  // -----------------------------------------------------------------------
  const { mutate: handleCreatePost, isLoading: isCreating } = useMutation({
    mutationFn: async (data: ICreatePostData) => {
      const localId = generateLocalId();
      const myProfile = queryClient.getQueryData<IUserProfile>("myProfile");

      await PostRepo.insertLocalPost({
        localId,
        userId: myProfile?.id ?? 0,
        imageUri: data.imageUri,
        caption: data.caption,
        tags: data.tags,
        userName: myProfile?.name ?? "",
        userUsername: myProfile?.username ?? "",
        userProfilePictureUrl: myProfile?.profile_picture_url ?? "",
      });

      await SyncQueue.enqueue("create_post", {
        localId,
        imageUri: data.imageUri,
        caption: data.caption,
        tags: data.tags || [],
      });

      return { localId, data };
    },
    onMutate: async (data: ICreatePostData) => {
      await queryClient.cancelQueries(["posts"]);
      await queryClient.cancelQueries(["myProfile"]);

      const previousPostList = queryClient.getQueryData<InfinitePostsData>([
        "posts",
      ]);
      const myProfile = queryClient.getQueryData<IUserProfile>("myProfile");

      if (!myProfile) {
        return { previousPostList };
      }

      const fakePost: IPost = {
        id: Math.random(),
        image_url: data.imageUri,
        image_cloudinary_id: "fake_id",
        caption: data.caption,
        created_at: new Date().toISOString(),
        like_count: 0,
        comment_count: 0,
        is_liked: false,
        is_bookmarked: false,
        is_optimistic: true,
        tags: data.tags || [],
        user: {
          id: myProfile?.id ?? 0,
          name: myProfile?.name ?? "",
          username: myProfile?.username ?? "",
          profile_picture_url: myProfile?.profile_picture_url ?? "",
        },
      };

      queryClient.setQueryData(
        ["posts"],
        (oldData: InfinitePostsData | undefined) => {
          const newData: InfinitePostsData = oldData
            ? { ...oldData, pages: [...oldData.pages] }
            : { pages: [], pageParams: [] };

          if (newData.pages.length === 0) {
            newData.pages.push({ posts: [fakePost], nextCursor: null });
          } else {
            newData.pages[0] = {
              ...newData.pages[0],
              posts: [fakePost, ...newData.pages[0].posts],
            };
          }

          return newData;
        }
      );

      return { previousPostList };
    },
    onError: (
      error: unknown,
      variables: ICreatePostData,
      context: ICreateContext | undefined
    ) => {
      showToastErrorOnAction("creating");

      if (context?.previousPostList) {
        queryClient.setQueryData(["posts"], context.previousPostList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["myProfile"]);
    },
  });

  // -----------------------------------------------------------------------
  // Add Comment — writes to SQLite + enqueues sync
  // -----------------------------------------------------------------------
  const { mutate: handleAddComment, isLoading: isAddingComment } = useMutation({
    mutationFn: async (data: IAddCommentData) => {
      const localId = generateLocalId();
      const myProfile = queryClient.getQueryData<IUserProfile>("myProfile");

      await CommentRepo.insertLocalComment({
        localId,
        postId: data.postId,
        commentText: data.comment_text,
        userId: myProfile?.id ?? 0,
        userName: myProfile?.name ?? "",
        userUsername: myProfile?.username ?? "",
        userProfilePictureUrl: myProfile?.profile_picture_url ?? "",
      });

      await SyncQueue.enqueue("add_comment", {
        localId,
        postId: data.postId,
        commentText: data.comment_text,
      });

      return { localId };
    },
    onMutate: async (data: IAddCommentData) => {
      const { postId, comment_text } = data;
      await queryClient.cancelQueries(["comments", postId]);
      await queryClient.cancelQueries(["post", postId]);
      await queryClient.cancelQueries(["posts"]);

      const previousComments = queryClient.getQueryData<InfiniteCommentsData>([
        "comments",
        postId,
      ]);

      const myProfile = queryClient.getQueryData<IUserProfile>("myProfile");
      const fakeComment: IComment = {
        id: Math.random(),
        comment_text,
        created_at: new Date().toISOString(),
        is_optimistic: true,
        user: {
          id: myProfile?.id ?? 0,
          name: myProfile?.name ?? "",
          username: myProfile?.username ?? "",
          profile_picture_url: myProfile?.profile_picture_url ?? "",
        },
      };

      queryClient.setQueryData(
        ["comments", postId],
        (oldData: InfiniteCommentsData | undefined) => {
          const newData = oldData
            ? { ...oldData, pages: [...oldData.pages] }
            : { pages: [], pageParams: [] };

          if (newData.pages.length === 0) {
            newData.pages.push({ comments: [fakeComment], nextCursor: null });
          } else {
            newData.pages[0] = {
              ...newData.pages[0],
              comments: [fakeComment, ...newData.pages[0].comments],
            };
          }

          return newData;
        }
      );

      return { previousComments };
    },
    onError: (
      error: unknown,
      newComment: IAddCommentData,
      context: IAddCommentContext | undefined
    ) => {
      const { postId } = newComment;
      showToastErrorOnAction("adding comment");
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousComments
        );
      }
    },
    onSettled: (data: unknown, error: unknown, newComment: IAddCommentData) => {
      const { postId } = newComment;
      queryClient.invalidateQueries(["comments", postId]);
      queryClient.invalidateQueries(["post", postId]);
      queryClient.invalidateQueries(["posts"]);
    },
  });

  // -----------------------------------------------------------------------
  // Like / Unlike / Bookmark / Unbookmark
  // -----------------------------------------------------------------------
  const { mutate: handleLikePost, isLoading: isLiking } = useMutation({
    mutationFn: async (postData: { localId: string; postId: number }) => {
      await runOrQueuePostInteraction(postData, "like");
    },
    ...optimisticModifyPostUpdate("liking", (post) => ({
      ...post,
      is_liked: true,
      like_count: post.like_count + 1,
    }), "like"),
  });

  const { mutate: handleUnlikePost, isLoading: isUnliking } = useMutation({
    mutationFn: async (postData: { localId: string; postId: number }) => {
      await runOrQueuePostInteraction(postData, "unlike");
    },
    ...optimisticModifyPostUpdate("unliking", (post) => ({
      ...post,
      is_liked: false,
      like_count: Math.max(0, post.like_count - 1),
    }), "unlike"),
  });

  const { mutate: handleBookmarkPost, isLoading: isBookmarking } = useMutation({
    mutationFn: async (postData: { localId: string; postId: number }) => {
      await runOrQueuePostInteraction(postData, "bookmark");
    },
    ...optimisticModifyPostUpdate("bookmarking", (post) => ({
      ...post,
      is_bookmarked: true,
    }), "bookmark"),
  });

  const { mutate: handleUnbookmarkPost, isLoading: isUnbookmarking } =
    useMutation({
      mutationFn: async (postData: { localId: string; postId: number }) => {
        await runOrQueuePostInteraction(postData, "unbookmark");
      },
      ...optimisticModifyPostUpdate("unbookmarking", (post) => ({
        ...post,
        is_bookmarked: false,
      }), "unbookmark"),
    });

  // -----------------------------------------------------------------------
  // Delete Post — writes to SQLite + enqueues sync
  // -----------------------------------------------------------------------
  const { mutate: handleDeletePost, isLoading: isDeleting } = useMutation({
    mutationFn: async (postData: { localId: string; postId?: number }) => {
      const { localId, postId } = postData;

      // Remove from SQLite
      await PostRepo.deletePost(localId);

      // If the post was synced (has server ID), enqueue deletion
      if (postId && typeof postId === "number") {
        await SyncQueue.enqueue("delete_post", { postId });
      } else {
        // Post was never synced — just remove from queue
        await SyncQueue.removeByLocalId("create_post", localId);
      }
    },
    onMutate: async (postData: { localId: string; postId?: number }) => {
      const { localId, postId } = postData;
      await queryClient.cancelQueries(["posts"]);
      if (postId) await queryClient.cancelQueries(["post", postId]);
      await queryClient.cancelQueries(["myProfile"]);

      const previousPostLists = queryClient.getQueriesData<InfinitePostsData>([
        "posts",
      ]);
      const previousPost = postId
        ? queryClient.getQueryData<IPost>(["post", postId])
        : undefined;
      const previousProfile =
        queryClient.getQueryData<IUserProfile>("myProfile");

      queryClient.setQueriesData<InfinitePostsData>(
        ["posts"],
        (oldData: InfinitePostsData | undefined) => {
          if (!oldData) {
            return { pages: [], pageParams: [] };
          }
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts.filter(
                (post) => post.local_id !== localId && post.id !== postId
              ),
            })),
          };
        }
      );

      if (previousProfile) {
        queryClient.setQueryData("myProfile", {
          ...previousProfile,
          post_count: previousProfile.post_count - 1,
        });
      }

      if (postId) queryClient.removeQueries(["post", postId]);

      return { previousPostLists, previousPost, previousProfile };
    },
    onError: (
      error: unknown,
      postData: { localId: string; postId?: number },
      context: IDeleteContext | undefined
    ) => {
      showToastErrorOnAction("deleting");
      context?.previousPostLists?.forEach(
        ([key, data]: [QueryKey, InfinitePostsData]) => {
          queryClient.setQueryData(key, data);
        }
      );
      if (context?.previousPost && postData.postId) {
        queryClient.setQueryData(["post", postData.postId], context.previousPost);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData("myProfile", context.previousProfile);
      }
    },
    onSettled: (data: unknown, error: unknown, postData: { localId: string; postId?: number }) => {
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries("notifications");
      queryClient.invalidateQueries(["myProfile"]);
    },
  });

  return {
    handleCreatePost,
    isCreating,
    handleAddComment,
    isAddingComment,
    handleDeletePost,
    isDeleting,
    handleLikePost,
    isLiking,
    handleUnlikePost,
    isUnliking,
    handleBookmarkPost,
    isBookmarking,
    handleUnbookmarkPost,
    isUnbookmarking,
  };
};
