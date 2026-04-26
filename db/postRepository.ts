import { getDatabase } from "./database";
import type { IPost, IGameTag } from "@/types/PostTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rowToPost = (row: any): IPost => ({
  id: row.id ?? row.local_id,
  local_id: row.local_id,
  image_url: row.image_url,
  image_cloudinary_id: row.image_cloudinary_id ?? "",
  caption: row.caption ?? "",
  created_at: row.created_at,
  like_count: row.like_count ?? 0,
  comment_count: row.comment_count ?? 0,
  is_liked: !!row.is_liked,
  is_bookmarked: !!row.is_bookmarked,
  is_optimistic: row.sync_status !== "synced",
  tags: row.tags ? JSON.parse(row.tags) : [],
  user: {
    id: row.user_id,
    name: row.user_name ?? "",
    username: row.user_username ?? "",
    profile_picture_url: row.user_profile_picture_url ?? "",
  },
  sync_status: row.sync_status,
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getPostsPaginated = async (
  limit: number,
  offset: number,
  filters?: { category?: string; gameId?: number }
): Promise<IPost[]> => {
  const db = getDatabase();

  let query = `SELECT * FROM posts`;
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters?.category) {
    conditions.push(`json_extract(tags, '$') LIKE ?`);
    params.push(`%"category":"${filters.category}"%`);
  }
  if (filters?.gameId) {
    conditions.push(`json_extract(tags, '$') LIKE ?`);
    params.push(`%"gameId":${filters.gameId}%`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = await db.getAllAsync(query, params);
  return rows.map(rowToPost);
};

export const getPostsByUsername = async (
  username: string,
  limit: number,
  offset: number
): Promise<IPost[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM posts WHERE user_username = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [username, limit, offset]
  );
  return rows.map(rowToPost);
};

export const getBookmarkedPosts = async (
  limit: number,
  offset: number
): Promise<IPost[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM posts WHERE is_bookmarked = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows.map(rowToPost);
};

export const getPostByLocalId = async (
  localId: string
): Promise<IPost | null> => {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM posts WHERE local_id = ?`,
    [localId]
  );
  return row ? rowToPost(row) : null;
};

export const getPostByServerId = async (
  serverId: number
): Promise<IPost | null> => {
  const db = getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM posts WHERE id = ?`, [
    serverId,
  ]);
  return row ? rowToPost(row) : null;
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const upsertPost = async (post: IPost): Promise<void> => {
  const db = getDatabase();
  const localId = (post as any).local_id ?? `server_${post.id}`;
  const tags = post.tags ? JSON.stringify(post.tags) : null;

  await db.runAsync(
    `INSERT INTO posts (id, local_id, user_id, image_url, image_cloudinary_id, caption, tags, created_at,
      like_count, comment_count, is_liked, is_bookmarked, user_name, user_username, user_profile_picture_url, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(local_id) DO UPDATE SET
       id = excluded.id,
       image_url = excluded.image_url,
       image_cloudinary_id = excluded.image_cloudinary_id,
       caption = excluded.caption,
       tags = excluded.tags,
       like_count = excluded.like_count,
       comment_count = excluded.comment_count,
       is_liked = excluded.is_liked,
       is_bookmarked = excluded.is_bookmarked,
       user_name = excluded.user_name,
       user_username = excluded.user_username,
       user_profile_picture_url = excluded.user_profile_picture_url,
       sync_status = CASE WHEN posts.sync_status = 'pending' THEN posts.sync_status ELSE 'synced' END`,
    [
      post.id,
      localId,
      post.user.id,
      post.image_url,
      post.image_cloudinary_id,
      post.caption,
      tags,
      post.created_at,
      post.like_count,
      post.comment_count,
      post.is_liked ? 1 : 0,
      post.is_bookmarked ? 1 : 0,
      post.user.name,
      post.user.username,
      post.user.profile_picture_url,
    ]
  );
};

export const upsertPosts = async (posts: IPost[]): Promise<void> => {
  for (const post of posts) {
    await upsertPost(post);
  }
};

export const insertLocalPost = async (post: {
  localId: string;
  userId: number;
  imageUri: string;
  caption: string;
  tags?: IGameTag[];
  userName: string;
  userUsername: string;
  userProfilePictureUrl: string;
}): Promise<void> => {
  const db = getDatabase();
  const tags = post.tags ? JSON.stringify(post.tags) : null;

  await db.runAsync(
    `INSERT INTO posts (local_id, user_id, image_url, caption, tags, created_at,
      like_count, comment_count, is_liked, is_bookmarked,
      user_name, user_username, user_profile_picture_url, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, 'pending')`,
    [
      post.localId,
      post.userId,
      post.imageUri,
      post.caption,
      tags,
      new Date().toISOString(),
      post.userName,
      post.userUsername,
      post.userProfilePictureUrl,
    ]
  );
};

export const updatePostSyncStatus = async (
  localId: string,
  status: "synced" | "pending" | "failed",
  serverId?: number,
  imageUrl?: string,
  imageCloudinaryId?: string
): Promise<void> => {
  const db = getDatabase();
  if (serverId !== undefined && imageUrl) {
    const serverLocalId = `server_${serverId}`;

    await db.runAsync(
      `DELETE FROM posts WHERE (id = ? OR local_id = ?) AND local_id != ?`,
      [serverId, serverLocalId, localId]
    );

    await db.runAsync(
      `UPDATE posts
       SET sync_status = ?, id = ?, local_id = ?, image_url = ?, image_cloudinary_id = ?
       WHERE local_id = ?`,
      [status, serverId, serverLocalId, imageUrl, imageCloudinaryId ?? "", localId]
    );
  } else {
    await db.runAsync(
      `UPDATE posts SET sync_status = ? WHERE local_id = ?`,
      [status, localId]
    );
  }
};

export const deletePost = async (localId: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM posts WHERE local_id = ?`, [localId]);
};

export const toggleLike = async (
  localId: string,
  isLiked: boolean
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE posts SET is_liked = ?, like_count = like_count + ? WHERE local_id = ?`,
    [isLiked ? 1 : 0, isLiked ? 1 : -1, localId]
  );
};

export const toggleBookmark = async (
  localId: string,
  isBookmarked: boolean
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE posts SET is_bookmarked = ? WHERE local_id = ?`,
    [isBookmarked ? 1 : 0, localId]
  );
};

export const pruneOldPosts = async (keepCount: number): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `DELETE FROM posts WHERE sync_status = 'synced' AND local_id NOT IN (
      SELECT local_id FROM posts WHERE sync_status = 'synced' ORDER BY created_at DESC LIMIT ?
    )`,
    [keepCount]
  );
};

export const updateUserSnapshot = async (
  userId: number,
  name: string,
  profilePictureUrl: string | null
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE posts
     SET user_name = ?, user_profile_picture_url = ?
     WHERE user_id = ?`,
    [name, profilePictureUrl, userId]
  );
};
