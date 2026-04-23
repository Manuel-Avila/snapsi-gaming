import api from "@/api/apiClient";
import type { IAddCommentData } from "@/types/CommentTypes";
import type { IGetPostsResponse, ICreatePostData } from "@/types/PostTypes";
import { QueryFunctionContext } from "react-query/types/core/types";

export const usePost = () => {
  const createPost = async (data: ICreatePostData) => {
    const formData = new FormData();
    const fileName = data.imageUri.split("/").pop();
    const fileType = fileName?.split(".").pop();

    formData.append("image", {
      uri: data.imageUri,
      name: fileName,
      type: `image/${fileType}`,
    } as any);

    formData.append("caption", data.caption);
    if (data.tags && data.tags.length > 0) {
      formData.append("tags", JSON.stringify(data.tags));
    }

    const response = await api.post("/posts", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  };

  const deletePost = async (postId: number) => {
    const response = await api.delete(`/posts/${postId}`);

    return response.data;
  };

  const getPosts = async ({
    queryKey,
    pageParam,
  }: QueryFunctionContext<[string, { category?: string; gameId?: number }]>): Promise<IGetPostsResponse> => {
    const [_key, filters] = queryKey;
    const cursor = pageParam;
    const limit = 10;

    const params: any = { limit, cursor };
    if (filters?.category) params.category = filters.category;
    if (filters?.gameId) params.game_id = filters.gameId;

    const response = await api.get("/posts", {
      params,
    });

    return response.data;
  };

  const getUserPosts = async ({
    queryKey,
    pageParam,
  }: QueryFunctionContext<[string, string]>): Promise<IGetPostsResponse> => {
    const [_key, username] = queryKey;
    const cursor = pageParam;
    const limit = 10;
    const response = await api.get(`/posts/user/${username}`, {
      params: { limit, cursor },
    });

    return response.data;
  };

  const getBookmarkedPosts = async ({ pageParam }: QueryFunctionContext) => {
    const limit = 10;
    const cursor = pageParam;

    const response = await api.get("/posts/bookmarks", {
      params: { limit, cursor },
    });

    return response.data;
  };

  const getPostById = async ({
    queryKey,
  }: QueryFunctionContext<[string, number]>) => {
    const [_key, id] = queryKey;
    const response = await api.get(`/posts/${id}`);

    return response.data?.post;
  };

  const getComments = async ({
    queryKey,
    pageParam,
  }: QueryFunctionContext<[string, number]>) => {
    const [_key, postId] = queryKey;
    const limit = 10;

    const response = await api.get(`/posts/${postId}/comments`, {
      params: { limit, cursor: pageParam },
    });

    return response.data;
  };

  const addComment = async (data: IAddCommentData) => {
    const response = await api.post(`/posts/${data.postId}/comments`, {
      comment_text: data.comment_text,
    });

    return response.data;
  };

  const likePost = async (id: number) => {
    const response = await api.post(`/posts/${id}/like`);

    return response.data;
  };

  const unlikePost = async (id: number) => {
    const response = await api.delete(`/posts/${id}/like`);
    return response.data;
  };

  const bookmarkPost = async (id: number) => {
    const response = await api.post(`/posts/${id}/bookmark`);
    return response.data;
  };
  const unbookmarkPost = async (id: number) => {
    const response = await api.delete(`/posts/${id}/bookmark`);
    return response.data;
  };

  return {
    createPost,
    deletePost,
    getPosts,
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
    getComments,
    addComment,
    getUserPosts,
    getPostById,
    getBookmarkedPosts,
  };
};
