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

const generateLocalId = (): string =>
  `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const localIdToTempNumericId = (localId: string): number => {
  const match = localId.match(/^local_(\d+)/);
  if (match) {
    const timestamp = Number(match[1]);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return -timestamp;
    }
  }

  let hash = 0;
  for (let i = 0; i < localId.length; i += 1) {
    hash = (hash * 31 + localId.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash) || 1;
  return -normalized;
};

const hasServerPostId = (postData: { localId: string; postId?: number }): boolean =>
  Boolean(
    postData.postId &&
      Number.isInteger(postData.postId) &&
      postData.postId > 0 &&
      !postData.localId.startsWith("local_")
  );

export const usePostMutations = () => {
  const queryClient = useQueryClient();
  const {
    deletePost,
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
  } = usePost();

  const optimisticModifyPostUpdate = (
    action: string,
    updateFn: (post: IPost) => IPost,
    syncOperation: "like" | "unlike" | "bookmark" | "unbookmark"
  ) => ({
    onMutate: async (postData: { localId: string; postId?: number }) => {
      const { localId, postId } = postData;
      await queryClient.cancelQueries(["posts"]);
      if (postId && Number.isInteger(postId)) {
        await queryClient.cancelQueries(["post", postId]);
      }

      const previousPost =
        postId && Number.isInteger(postId)
          ? queryClient.getQueryData<IPost>(["post", postId])
          : undefined;
      const previousPostLists = queryClient.getQueriesData<InfinitePostsData>([
        "posts",
      ]);

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
      postData: { localId: string; postId?: number },
      context: IModifyContext | undefined
    ) => {
      showToastErrorOnAction(action);
      if (context?.previousPost && postData.postId) {
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
    postData: { localId: string; postId?: number },
    syncOperation: "like" | "unlike" | "bookmark" | "unbookmark"
  ) => {
    const serverBackedPost = hasServerPostId(postData);

    if (!serverBackedPost) {
      await SyncQueue.replacePendingPostInteraction(
        syncOperation,
        undefined,
        postData.localId
      );
      return;
    }

    const callApi = async () => {
      const targetPostId = postData.postId as number;
      if (syncOperation === "like") {
        await likePost(targetPostId);
        return;
      }
      if (syncOperation === "unlike") {
        await unlikePost(targetPostId);
        return;
      }
      if (syncOperation === "bookmark") {
        await bookmarkPost(targetPostId);
        return;
      }
      await unbookmarkPost(targetPostId);
    };

    if (!NetworkService.isOnline()) {
      await SyncQueue.replacePendingPostInteraction(
        syncOperation,
        postData.postId,
        postData.localId
      );
      return;
    }

    try {
      await callApi();
    } catch (error: any) {
      if (!error?.response) {
        await SyncQueue.replacePendingPostInteraction(
          syncOperation,
          postData.postId,
          postData.localId
        );
        return;
      }
      throw error;
    }
  };

  const { mutate: handleCreatePost, isLoading: isCreating } = useMutation({
    mutationFn: async (data: ICreatePostData) => {
      const localId =
        (data as ICreatePostData & { __localId?: string }).__localId ??
        generateLocalId();
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

      const mutableData = data as ICreatePostData & { __localId?: string };
      const localId = mutableData.__localId ?? generateLocalId();
      mutableData.__localId = localId;
      const tempPostId = localIdToTempNumericId(localId);

      const previousPostList = queryClient.getQueryData<InfinitePostsData>([
        "posts",
      ]);
      const myProfile = queryClient.getQueryData<IUserProfile>("myProfile");

      if (!myProfile) {
        return { previousPostList };
      }

      const fakePost: IPost = {
        id: tempPostId,
        local_id: localId,
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

  const { mutate: handleAddComment, isLoading: isAddingComment } = useMutation({
    mutationFn: async (data: IAddCommentData) => {
      const localId = generateLocalId();
      const myProfile = queryClient.getQueryData<IUserProfile>("myProfile");

      await CommentRepo.insertLocalComment({
        localId,
        postId: data.postId,
        postLocalId: data.postLocalId,
        commentText: data.comment_text,
        userId: myProfile?.id ?? 0,
        userName: myProfile?.name ?? "",
        userUsername: myProfile?.username ?? "",
        userProfilePictureUrl: myProfile?.profile_picture_url ?? "",
      });

      await SyncQueue.enqueue("add_comment", {
        localId,
        postId: data.postId,
        postLocalId: data.postLocalId,
        commentText: data.comment_text,
      });

      return { localId };
    },
    onMutate: async (data: IAddCommentData) => {
      const { postId, postLocalId, comment_text } = data;
      const commentsQueryKey: QueryKey = ["comments", { postId, postLocalId }];

      await queryClient.cancelQueries(commentsQueryKey);
      await queryClient.cancelQueries(["post", postId]);
      await queryClient.cancelQueries(["posts"]);

      const previousComments = queryClient.getQueryData<InfiniteCommentsData>([
        "comments",
        { postId, postLocalId },
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
        commentsQueryKey,
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
      const { postId, postLocalId } = newComment;
      const commentsQueryKey: QueryKey = ["comments", { postId, postLocalId }];
      showToastErrorOnAction("adding comment");
      if (context?.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
    },
    onSettled: (data: unknown, error: unknown, newComment: IAddCommentData) => {
      const { postId, postLocalId } = newComment;
      queryClient.invalidateQueries(["comments", { postId, postLocalId }]);
      queryClient.invalidateQueries(["post", postId]);
      queryClient.invalidateQueries(["posts"]);
    },
  });

  const { mutate: handleLikePost, isLoading: isLiking } = useMutation({
    mutationFn: async (postData: { localId: string; postId?: number }) => {
      await runOrQueuePostInteraction(postData, "like");
    },
    ...optimisticModifyPostUpdate("liking", (post) => ({
      ...post,
      is_liked: true,
      like_count: post.like_count + 1,
    }), "like"),
  });

  const { mutate: handleUnlikePost, isLoading: isUnliking } = useMutation({
    mutationFn: async (postData: { localId: string; postId?: number }) => {
      await runOrQueuePostInteraction(postData, "unlike");
    },
    ...optimisticModifyPostUpdate("unliking", (post) => ({
      ...post,
      is_liked: false,
      like_count: Math.max(0, post.like_count - 1),
    }), "unlike"),
  });

  const { mutate: handleBookmarkPost, isLoading: isBookmarking } = useMutation({
    mutationFn: async (postData: { localId: string; postId?: number }) => {
      await runOrQueuePostInteraction(postData, "bookmark");
    },
    ...optimisticModifyPostUpdate("bookmarking", (post) => ({
      ...post,
      is_bookmarked: true,
    }), "bookmark"),
  });

  const { mutate: handleUnbookmarkPost, isLoading: isUnbookmarking } =
    useMutation({
      mutationFn: async (postData: { localId: string; postId?: number }) => {
        await runOrQueuePostInteraction(postData, "unbookmark");
      },
      ...optimisticModifyPostUpdate("unbookmarking", (post) => ({
        ...post,
        is_bookmarked: false,
      }), "unbookmark"),
    });

  const { mutate: handleDeletePost, isLoading: isDeleting } = useMutation({
    mutationFn: async (postData: { localId: string; postId?: number }) => {
      const { localId, postId } = postData;

      if (hasServerPostId(postData) && NetworkService.isOnline()) {
        await deletePost(postId as number);
        await PostRepo.deletePost(localId);
        return;
      }

      await PostRepo.deletePost(localId);

      if (hasServerPostId(postData)) {
        await SyncQueue.enqueue("delete_post", { postId, postLocalId: localId });
      } else {
        await SyncQueue.removeByLocalId("create_post", localId);
        await SyncQueue.removePendingByPostLocalId(localId);
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
      if (postData.postId) {
        queryClient.invalidateQueries(["post", postData.postId]);
      }
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
