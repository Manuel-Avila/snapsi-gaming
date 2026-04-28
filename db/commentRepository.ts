import { getDatabase } from "./database";
import type { IComment } from "@/types/CommentTypes";

const rowToComment = (row: any): IComment => ({
  id: row.id ?? row.local_id,
  local_id: row.local_id,
  comment_text: row.comment_text,
  created_at: row.created_at,
  is_optimistic: row.sync_status !== "synced",
  user: {
    id: row.user_id,
    name: row.user_name ?? "",
    username: row.user_username ?? "",
    profile_picture_url: row.user_profile_picture_url ?? "",
  },
  sync_status: row.sync_status,
});


export const getCommentsPaginated = async (
  postId: number,
  limit: number,
  offset: number
): Promise<IComment[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [postId, limit, offset]
  );
  return rows.map(rowToComment);
};


export const upsertComment = async (
  comment: IComment,
  postId: number
): Promise<void> => {
  const db = getDatabase();
  const localId = (comment as any).local_id ?? `server_${comment.id}`;

  await db.runAsync(
    `INSERT INTO comments (id, local_id, post_id, comment_text, created_at,
      user_id, user_name, user_username, user_profile_picture_url, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(local_id) DO UPDATE SET
       id = excluded.id,
       comment_text = excluded.comment_text,
       user_name = excluded.user_name,
       user_username = excluded.user_username,
       user_profile_picture_url = excluded.user_profile_picture_url,
       sync_status = CASE WHEN comments.sync_status = 'pending' THEN comments.sync_status ELSE 'synced' END`,
    [
      comment.id,
      localId,
      postId,
      comment.comment_text,
      comment.created_at,
      comment.user.id,
      comment.user.name,
      comment.user.username,
      comment.user.profile_picture_url,
    ]
  );
};

export const upsertComments = async (
  comments: IComment[],
  postId: number
): Promise<void> => {
  for (const comment of comments) {
    await upsertComment(comment, postId);
  }
};

export const insertLocalComment = async (comment: {
  localId: string;
  postId: number;
  postLocalId?: string;
  commentText: string;
  userId: number;
  userName: string;
  userUsername: string;
  userProfilePictureUrl: string;
}): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO comments (local_id, post_id, post_local_id, comment_text, created_at,
      user_id, user_name, user_username, user_profile_picture_url, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      comment.localId,
      comment.postId,
      comment.postLocalId ?? null,
      comment.commentText,
      new Date().toISOString(),
      comment.userId,
      comment.userName,
      comment.userUsername,
      comment.userProfilePictureUrl,
    ]
  );
};

export const updateCommentSyncStatus = async (
  localId: string,
  status: "synced" | "pending" | "failed",
  serverId?: number,
  postId?: number
): Promise<void> => {
  const db = getDatabase();
  if (serverId !== undefined) {
    const serverLocalId = `server_${serverId}`;

    await db.runAsync(
      `DELETE FROM comments WHERE (id = ? OR local_id = ?) AND local_id != ?`,
      [serverId, serverLocalId, localId]
    );

    await db.runAsync(
      `UPDATE comments
       SET sync_status = ?, id = ?, local_id = ?, post_id = COALESCE(?, post_id)
       WHERE local_id = ?`,
      [status, serverId, serverLocalId, postId ?? null, localId]
    );
  } else {
    await db.runAsync(
      `UPDATE comments SET sync_status = ? WHERE local_id = ?`,
      [status, localId]
    );
  }
};

export const retargetCommentsAfterPostSync = async (
  oldPostLocalId: string,
  newPostLocalId: string,
  serverPostId: number
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE comments
     SET post_id = ?, post_local_id = ?
     WHERE post_local_id = ?`,
    [serverPostId, newPostLocalId, oldPostLocalId]
  );
};

export const deleteCommentsByPostId = async (
  postId: number
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM comments WHERE post_id = ?`, [postId]);
};

export const updateUserSnapshot = async (
  userId: number,
  name: string,
  profilePictureUrl: string | null
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE comments
     SET user_name = ?, user_profile_picture_url = ?
     WHERE user_id = ?`,
    [name, profilePictureUrl, userId]
  );
};
