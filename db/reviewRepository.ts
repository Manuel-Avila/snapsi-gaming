import { getDatabase } from "./database";
import type { IGameReview } from "@/types/GameTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rowToReview = (row: any): IGameReview => ({
  id: row.id ?? row.local_id,
  local_id: row.local_id,
  game_id: row.game_id,
  game_name: row.game_name,
  game_image: row.game_image ?? "",
  rating: row.rating,
  description: row.description ?? undefined,
  created_at: row.created_at,
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

export const getReviewsByUsername = async (
  username: string,
  limit: number,
  offset: number
): Promise<IGameReview[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM game_reviews
     WHERE user_username = ?
     ORDER BY (sync_status = 'pending') DESC, created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [username, limit, offset]
  );

  const uniqueByGameId = new Map<number, IGameReview>();
  for (const row of rows) {
    const review = rowToReview(row);
    if (!uniqueByGameId.has(review.game_id)) {
      uniqueByGameId.set(review.game_id, review);
    }
  }

  return Array.from(uniqueByGameId.values());
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const upsertReview = async (review: IGameReview): Promise<void> => {
  const db = getDatabase();
  const localId = (review as any).local_id ?? `server_${review.id}`;

  const pendingRow: any = await db.getFirstAsync(
    `SELECT local_id FROM game_reviews
     WHERE user_id = ? AND game_id = ? AND sync_status = 'pending'
     LIMIT 1`,
    [review.user.id, review.game_id]
  );

  // Never overwrite local pending edits with pulled server data.
  if (pendingRow && pendingRow.local_id !== localId) {
    return;
  }

  // Keep a single non-pending row per user/game in local cache.
  await db.runAsync(
    `DELETE FROM game_reviews
     WHERE user_id = ?
       AND game_id = ?
       AND sync_status != 'pending'
       AND local_id != ?`,
    [review.user.id, review.game_id, localId]
  );

  await db.runAsync(
    `INSERT INTO game_reviews (id, local_id, user_id, game_id, game_name, game_image,
      rating, description, created_at, user_name, user_username, user_profile_picture_url, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(local_id) DO UPDATE SET
       id = excluded.id,
       rating = excluded.rating,
       description = excluded.description,
       game_image = excluded.game_image,
       game_name = excluded.game_name,
       user_name = excluded.user_name,
       user_username = excluded.user_username,
       user_profile_picture_url = excluded.user_profile_picture_url,
       sync_status = CASE WHEN game_reviews.sync_status = 'pending' THEN game_reviews.sync_status ELSE 'synced' END`,
    [
      review.id,
      localId,
      review.user.id,
      review.game_id,
      review.game_name,
      review.game_image,
      review.rating,
      review.description ?? null,
      review.created_at,
      review.user.name,
      review.user.username,
      review.user.profile_picture_url,
    ]
  );
};

export const upsertReviews = async (
  reviews: IGameReview[]
): Promise<void> => {
  const sortedReviews = [...reviews].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const review of sortedReviews) {
    await upsertReview(review);
  }
};

export const insertLocalReview = async (review: {
  localId: string;
  userId: number;
  gameId: number;
  gameName: string;
  gameImage?: string;
  rating: number;
  description?: string;
  userName: string;
  userUsername: string;
  userProfilePictureUrl: string;
}): Promise<void> => {
  const db = getDatabase();

  // Delete any previous review for this game by same user, regardless of sync status.
  await db.runAsync(
    `DELETE FROM game_reviews WHERE user_id = ? AND game_id = ?`,
    [review.userId, review.gameId]
  );

  await db.runAsync(
    `INSERT INTO game_reviews (local_id, user_id, game_id, game_name, game_image,
      rating, description, created_at, user_name, user_username, user_profile_picture_url, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      review.localId,
      review.userId,
      review.gameId,
      review.gameName,
      review.gameImage ?? null,
      review.rating,
      review.description ?? null,
      new Date().toISOString(),
      review.userName,
      review.userUsername,
      review.userProfilePictureUrl,
    ]
  );
};

export const updateReviewSyncStatus = async (
  localId: string,
  status: "synced" | "pending" | "failed",
  serverId?: number
): Promise<void> => {
  const db = getDatabase();
  if (serverId !== undefined) {
    const serverLocalId = `server_${serverId}`;

    await db.runAsync(
      `DELETE FROM game_reviews WHERE (id = ? OR local_id = ?) AND local_id != ?`,
      [serverId, serverLocalId, localId]
    );

    await db.runAsync(
      `UPDATE game_reviews SET sync_status = ?, id = ?, local_id = ? WHERE local_id = ?`,
      [status, serverId, serverLocalId, localId]
    );
  } else {
    await db.runAsync(
      `UPDATE game_reviews SET sync_status = ? WHERE local_id = ?`,
      [status, localId]
    );
  }
};

export const updateUserSnapshot = async (
  userId: number,
  name: string,
  profilePictureUrl: string | null
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE game_reviews
     SET user_name = ?, user_profile_picture_url = ?
     WHERE user_id = ?`,
    [name, profilePictureUrl, userId]
  );
};
