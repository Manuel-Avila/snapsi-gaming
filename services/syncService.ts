import api from "@/api/apiClient";
import * as PostRepo from "@/db/postRepository";
import * as CommentRepo from "@/db/commentRepository";
import * as ReviewRepo from "@/db/reviewRepository";
import * as SyncQueue from "@/db/syncQueueRepository";
import type { SyncQueueItem } from "@/db/syncQueueRepository";
import * as NetworkService from "./networkService";
import Toast from "react-native-toast-message";
import * as SecureStore from "expo-secure-store";

let _isSyncing = false;
let _syncInterval: ReturnType<typeof setInterval> | null = null;
let _onSyncComplete: (() => void) | null = null;
const _syncedPostIdsByLocalId = new Map<string, number>();

const RETRY_DELAYS = [5000, 15000, 30000, 60000, 60000];
const PULL_BATCH_SIZE = 50;
const POST_CACHE_LIMIT = 100;

export const setSyncCompleteCallback = (cb: () => void) => {
  _onSyncComplete = cb;
};

export const startPeriodicSync = (): (() => void) => {
  if (_syncInterval) return () => {};
  _syncInterval = setInterval(() => {
    if (NetworkService.isOnline()) {
      runSync();
    }
  }, 60000);
  return () => {
    if (_syncInterval) {
      clearInterval(_syncInterval);
      _syncInterval = null;
    }
  };
};

export const runSync = async (): Promise<void> => {
  if (_isSyncing || !NetworkService.isOnline()) return;
  if (!(await hasAccessToken())) return;
  _isSyncing = true;

  try {
    await pushChanges();
    await pullPosts();
    _onSyncComplete?.();
  } catch (error) {
    console.warn("[SyncService] Sync error:", error);
  } finally {
    _isSyncing = false;
  }
};

export const runPullOnly = async (): Promise<void> => {
  if (_isSyncing || !NetworkService.isOnline()) return;
  if (!(await hasAccessToken())) return;
  _isSyncing = true;

  try {
    await pullPosts();
    _onSyncComplete?.();
  } catch (error) {
    console.warn("[SyncService] Pull error:", error);
  } finally {
    _isSyncing = false;
  }
};

const pushChanges = async (): Promise<void> => {
  if (!(await hasAccessToken())) return;
  await SyncQueue.resetInProgressToRetry();
  const operations = await SyncQueue.getPendingOperations();

  for (const op of operations) {
    if (!NetworkService.isOnline()) break;

    if (op.retry_count > 0 && op.last_attempted_at) {
      const delay = RETRY_DELAYS[Math.min(op.retry_count - 1, RETRY_DELAYS.length - 1)];
      const elapsed = Date.now() - new Date(op.last_attempted_at).getTime();
      if (elapsed < delay) continue;
    }

    await SyncQueue.markInProgress(op.id);

    try {
      await processOperation(op);
      await SyncQueue.markCompleted(op.id);
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      await SyncQueue.markFailed(op.id, message);

      if (op.retry_count + 1 >= op.max_retries) {
        Toast.show({
          type: "error",
          text1: "Sync Failed",
          text2: `Could not sync ${formatOperation(op.operation)}. It will retry later.`,
          visibilityTime: 3000,
        });
      }
    }
  }
};

const processOperation = async (op: SyncQueueItem): Promise<void> => {
  const payload = JSON.parse(op.payload);

  switch (op.operation) {
    case "create_post":
      await pushCreatePost(payload);
      break;
    case "delete_post":
      await pushDeletePost(payload);
      break;
    case "like":
      await pushLike(payload);
      break;
    case "unlike":
      await pushUnlike(payload);
      break;
    case "bookmark":
      await pushBookmark(payload);
      break;
    case "unbookmark":
      await pushUnbookmark(payload);
      break;
    case "add_comment":
      await pushAddComment(payload);
      break;
    case "create_review":
      await pushCreateReview(payload);
      break;
    case "update_profile":
      await pushUpdateProfile(payload);
      break;
    default:
      console.warn(`[SyncService] Unknown operation: ${op.operation}`);
  }
};

const pushCreatePost = async (payload: any): Promise<void> => {
  const { localId, imageUri, caption, tags } = payload;

  const formData = new FormData();
  const fileName = imageUri.split("/").pop();
  const fileType = fileName?.split(".").pop();

  formData.append("image", {
    uri: imageUri,
    name: fileName,
    type: `image/${fileType}`,
  } as any);

  formData.append("caption", caption);
  if (tags && tags.length > 0) {
    formData.append("tags", JSON.stringify(tags));
  }

  const response = await api.post("/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const serverPost = response.data.post;
  _syncedPostIdsByLocalId.set(localId, serverPost.id);
  await PostRepo.updatePostSyncStatus(
    localId,
    "synced",
    serverPost.id,
    serverPost.image_url,
    serverPost.image_cloudinary_id
  );

  await CommentRepo.retargetCommentsAfterPostSync(
    localId,
    `server_${serverPost.id}`,
    serverPost.id
  );

  await SyncQueue.retargetPostReferencesAfterSync(
    localId,
    `server_${serverPost.id}`,
    serverPost.id
  );
};

const pushDeletePost = async (payload: any): Promise<void> => {
  const targetPostId = await resolvePostIdFromPayload(payload);
  if (!targetPostId) {
    throw new Error("Post not synced yet");
  }

  await api.delete(`/posts/${targetPostId}`);
};

const pushAddComment = async (payload: any): Promise<void> => {
  const { localId, commentText } = payload;
  const targetPostId = await resolvePostIdFromPayload(payload);

  if (!targetPostId) {
    throw new Error("Post not synced yet");
  }

  const response = await api.post(`/posts/${targetPostId}/comments`, {
    comment_text: commentText,
  });

  const serverComment = response.data.comment;
  await CommentRepo.updateCommentSyncStatus(
    localId,
    "synced",
    serverComment.id,
    targetPostId
  );
};

const pushLike = async (payload: any): Promise<void> => {
  const targetPostId = await resolvePostIdFromPayload(payload);
  if (!targetPostId) {
    throw new Error("Post not synced yet");
  }
  await api.post(`/posts/${targetPostId}/like`);
};

const pushUnlike = async (payload: any): Promise<void> => {
  const targetPostId = await resolvePostIdFromPayload(payload);
  if (!targetPostId) {
    throw new Error("Post not synced yet");
  }
  await api.delete(`/posts/${targetPostId}/like`);
};

const pushBookmark = async (payload: any): Promise<void> => {
  const targetPostId = await resolvePostIdFromPayload(payload);
  if (!targetPostId) {
    throw new Error("Post not synced yet");
  }
  await api.post(`/posts/${targetPostId}/bookmark`);
};

const pushUnbookmark = async (payload: any): Promise<void> => {
  const targetPostId = await resolvePostIdFromPayload(payload);
  if (!targetPostId) {
    throw new Error("Post not synced yet");
  }
  await api.delete(`/posts/${targetPostId}/bookmark`);
};

const pushCreateReview = async (payload: any): Promise<void> => {
  const { localId, gameId, gameName, gameImage, rating, description } = payload;

  const response = await api.post("/games/reviews", {
    game_id: gameId,
    game_name: gameName,
    game_image: gameImage,
    rating,
    description,
  });

  const serverId = response.data.reviewId;
  await ReviewRepo.updateReviewSyncStatus(localId, "synced", serverId);
};

const pushUpdateProfile = async (payload: any): Promise<void> => {
  const { userId, name, bio, imageUri, previousProfilePictureUrl } = payload;

  const formData = new FormData();
  formData.append("name", name ?? "");
  formData.append("bio", bio ?? "");

  const canUploadImage =
    typeof imageUri === "string" &&
    (imageUri.startsWith("file://") || imageUri.startsWith("content://"));

  if (canUploadImage) {
    const fileName = imageUri.split("/").pop();
    const fileType = fileName?.split(".").pop();
    formData.append("image", {
      uri: imageUri,
      name: fileName,
      type: `image/${fileType ?? "jpg"}`,
    } as any);
  }

  const response = await api.put("/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const remoteProfilePictureUrl =
    response?.data?.updatedData?.profile_picture_url ?? previousProfilePictureUrl ?? null;

  if (userId) {
    await PostRepo.updateUserSnapshot(userId, name ?? "", remoteProfilePictureUrl);
    await CommentRepo.updateUserSnapshot(userId, name ?? "", remoteProfilePictureUrl);
    await ReviewRepo.updateUserSnapshot(userId, name ?? "", remoteProfilePictureUrl);
  }
};

const pullPosts = async (): Promise<void> => {
  if (!(await hasAccessToken())) return;
  try {
    const response = await api.get("/posts", {
      params: { limit: PULL_BATCH_SIZE },
    });

    const { posts } = response.data;
    if (posts && posts.length > 0) {
      await PostRepo.upsertPosts(posts);
    }

    await PostRepo.pruneOldPosts(POST_CACHE_LIMIT);
  } catch (error) {
    console.warn("[SyncService] Pull posts failed:", error);
  }
};
export const pullComments = async (postId: number): Promise<void> => {
  if (!NetworkService.isOnline()) return;
  if (!(await hasAccessToken())) return;
  try {
    const response = await api.get(`/posts/${postId}/comments`, {
      params: { limit: 50 },
    });
    const { comments } = response.data;
    if (comments && comments.length > 0) {
      await CommentRepo.upsertComments(comments, postId);
    }
  } catch (error) {
    console.warn("[SyncService] Pull comments failed:", error);
  }
};

export const pullUserReviews = async (username: string): Promise<void> => {
  if (!NetworkService.isOnline()) return;
  if (!(await hasAccessToken())) return;
  try {
    const response = await api.get(`/games/reviews/user/${username}`, {
      params: { limit: 50 },
    });
    const { reviews } = response.data;
    if (reviews && reviews.length > 0) {
      await ReviewRepo.upsertReviews(reviews);
    }
  } catch (error) {
    console.warn("[SyncService] Pull reviews failed:", error);
  }
};

export const pullUserPosts = async (username: string): Promise<void> => {
  if (!NetworkService.isOnline()) return;
  if (!(await hasAccessToken())) return;
  try {
    const response = await api.get(`/posts/user/${username}`, {
      params: { limit: 50 },
    });
    const { posts } = response.data;
    if (posts && posts.length > 0) {
      await PostRepo.upsertPosts(posts);
    }
  } catch (error) {
    console.warn("[SyncService] Pull user posts failed:", error);
  }
};

export const pullBookmarkedPosts = async (): Promise<void> => {
  if (!NetworkService.isOnline()) return;
  if (!(await hasAccessToken())) return;
  try {
    const response = await api.get("/posts/bookmarks", {
      params: { limit: 50 },
    });
    const { posts } = response.data;
    if (posts && posts.length > 0) {
      await PostRepo.upsertPosts(posts);
    }
  } catch (error) {
    console.warn("[SyncService] Pull bookmarked posts failed:", error);
  }
};

const hasAccessToken = async (): Promise<boolean> => {
  const token = await SecureStore.getItemAsync("access_token");
  return Boolean(token);
};

const resolvePostIdFromPayload = async (
  payload: Record<string, any>
): Promise<number | null> => {
  if (payload.postId && Number.isInteger(payload.postId) && payload.postId > 0) {
    return payload.postId;
  }

  if (typeof payload.postLocalId === "string" && payload.postLocalId.length > 0) {
    const syncedPostId = _syncedPostIdsByLocalId.get(payload.postLocalId);
    if (syncedPostId) {
      return syncedPostId;
    }

    const serverId = await PostRepo.getServerPostIdByLocalId(payload.postLocalId);
    if (serverId) {
      return serverId;
    }
  }

  return null;
};

const formatOperation = (op: string): string => {
  const map: Record<string, string> = {
    create_post: "post",
    delete_post: "post deletion",
    like: "like",
    unlike: "unlike",
    bookmark: "bookmark",
    unbookmark: "unbookmark",
    add_comment: "comment",
    create_review: "review",
    update_profile: "profile",
  };
  return map[op] || op;
};
