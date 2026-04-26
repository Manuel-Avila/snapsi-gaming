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

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RETRY_DELAYS = [5000, 15000, 30000, 60000, 60000]; // ms per retry
const PULL_BATCH_SIZE = 50;
const POST_CACHE_LIMIT = 100;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PUSH — Local → Backend
// ---------------------------------------------------------------------------

const pushChanges = async (): Promise<void> => {
  if (!(await hasAccessToken())) return;
  await SyncQueue.resetInProgressToRetry();
  const operations = await SyncQueue.getPendingOperations();

  for (const op of operations) {
    if (!NetworkService.isOnline()) break;

    // Respect retry delay
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
      await api.post(`/posts/${payload.postId}/like`);
      break;
    case "unlike":
      await api.delete(`/posts/${payload.postId}/like`);
      break;
    case "bookmark":
      await api.post(`/posts/${payload.postId}/bookmark`);
      break;
    case "unbookmark":
      await api.delete(`/posts/${payload.postId}/bookmark`);
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
  await PostRepo.updatePostSyncStatus(
    localId,
    "synced",
    serverPost.id,
    serverPost.image_url,
    serverPost.image_cloudinary_id
  );
};

const pushDeletePost = async (payload: any): Promise<void> => {
  const { postId } = payload;
  if (postId) {
    await api.delete(`/posts/${postId}`);
  }
};

const pushAddComment = async (payload: any): Promise<void> => {
  const { localId, postId, commentText } = payload;

  const response = await api.post(`/posts/${postId}/comments`, {
    comment_text: commentText,
  });

  const serverComment = response.data.comment;
  await CommentRepo.updateCommentSyncStatus(localId, "synced", serverComment.id);
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

// ---------------------------------------------------------------------------
// PULL — Backend → Local
// ---------------------------------------------------------------------------

const pullPosts = async (): Promise<void> => {
  if (!(await hasAccessToken())) return;
  try {
    // Pull latest posts (no cursor — always get latest for simplicity)
    const response = await api.get("/posts", {
      params: { limit: PULL_BATCH_SIZE },
    });

    const { posts } = response.data;
    if (posts && posts.length > 0) {
      await PostRepo.upsertPosts(posts);
    }

    // Prune to keep only the cache limit
    await PostRepo.pruneOldPosts(POST_CACHE_LIMIT);
  } catch (error) {
    console.warn("[SyncService] Pull posts failed:", error);
  }
};

/**
 * Pull comments for a specific post from backend and cache in SQLite.
 * Called when CommentsModal opens.
 */
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

/**
 * Pull reviews for a user from backend and cache in SQLite.
 * Called when profile ratings tab is viewed.
 */
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

/**
 * Pull posts for a specific user and cache in SQLite.
 */
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

/**
 * Pull bookmarked posts and cache in SQLite.
 */
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hasAccessToken = async (): Promise<boolean> => {
  const token = await SecureStore.getItemAsync("access_token");
  return Boolean(token);
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
