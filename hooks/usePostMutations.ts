import { useMutation, useQueryClient } from "react-query";
import { usePost } from "./usePost";
import { showToastErrorOnAction } from "@/utils/showToastErrorOnAction";
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

export const usePostMutations = () => {
  const queryClient = useQueryClient();
  const {
    createPost,
    addComment,
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
    deletePost,
  } = usePost();

  const optimisticModifyPostUpdate = (
    action: string,
    updateFn: (post: IPost) => IPost
  ) => ({
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries(["posts"]);
      await queryClient.cancelQueries(["post", postId]);

      const previousPost = queryClient.getQueryData<IPost>(["post", postId]);
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
                post.id === postId ? updateFn(post) : post
              ),
            })),
          };
        }
      );

      return { previousPost, previousPostLists };
    },
    onError: (
      error: unknown,
      postId: number,
      context: IModifyContext | undefined
    ) => {
      showToastErrorOnAction(action);
      if (context?.previousPost) {
        queryClient.setQueryData(["post", postId], context.previousPost);
      }
      context?.previousPostLists?.forEach(
        ([key, data]: [QueryKey, InfinitePostsData]) => {
          queryClient.setQueryData(key, data);
        }
      );
    },
    onSettled: (data: unknown, error: unknown, postId: number) => {
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["post", postId]);
    },
  });

  const { mutate: handleCreatePost, isLoading: isCreating } = useMutation({
    mutationFn: createPost,
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

  const { mutate: handleAddComment, isLoading: isAddingComment } = useMutation({
    mutationFn: addComment,
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

  const { mutate: handleLikePost, isLoading: isLiking } = useMutation({
    mutationFn: likePost,
    ...optimisticModifyPostUpdate("liking", (post) => ({
      ...post,
      is_liked: true,
      like_count: post.like_count + 1,
    })),
  });

  const { mutate: handleUnlikePost, isLoading: isUnliking } = useMutation({
    mutationFn: unlikePost,
    ...optimisticModifyPostUpdate("unliking", (post) => ({
      ...post,
      is_liked: false,
      like_count: post.like_count - 1,
    })),
  });

  const { mutate: handleBookmarkPost, isLoading: isBookmarking } = useMutation({
    mutationFn: bookmarkPost,
    ...optimisticModifyPostUpdate("bookmarking", (post) => ({
      ...post,
      is_bookmarked: true,
    })),
  });

  const { mutate: handleUnbookmarkPost, isLoading: isUnbookmarking } =
    useMutation({
      mutationFn: unbookmarkPost,
      ...optimisticModifyPostUpdate("unbookmarking", (post) => ({
        ...post,
        is_bookmarked: false,
      })),
    });

  const { mutate: handleDeletePost, isLoading: isDeleting } = useMutation({
    mutationFn: deletePost,
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries(["posts"]);
      await queryClient.cancelQueries(["post", postId]);
      await queryClient.cancelQueries(["myProfile"]);

      const previousPostLists = queryClient.getQueriesData<InfinitePostsData>([
        "posts",
      ]);
      const previousPost = queryClient.getQueryData<IPost>(["post", postId]);
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
              posts: page.posts.filter((post) => post.id !== postId),
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

      queryClient.removeQueries(["post", postId]);

      return { previousPostLists, previousPost, previousProfile };
    },
    onError: (
      error: unknown,
      postId: number,
      context: IDeleteContext | undefined
    ) => {
      showToastErrorOnAction("deleting");
      context?.previousPostLists?.forEach(
        ([key, data]: [QueryKey, InfinitePostsData]) => {
          queryClient.setQueryData(key, data);
        }
      );
      if (context?.previousPost) {
        queryClient.setQueryData(["post", postId], context.previousPost);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData("myProfile", context.previousProfile);
      }
    },
    onSettled: (data: unknown, error: unknown, postId: number) => {
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
