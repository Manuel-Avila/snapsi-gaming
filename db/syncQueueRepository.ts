import { getDatabase } from "./database";

export type SyncOperation =
  | "create_post"
  | "delete_post"
  | "like"
  | "unlike"
  | "bookmark"
  | "unbookmark"
  | "add_comment"
  | "create_review"
  | "update_profile";

export type SyncQueueItem = {
  id: number;
  operation: SyncOperation;
  payload: string; // JSON string
  status: "pending" | "in_progress" | "failed";
  retry_count: number;
  max_retries: number;
  created_at: string;
  last_attempted_at: string | null;
  error_message: string | null;
};

// ---------------------------------------------------------------------------
// Queue Operations
// ---------------------------------------------------------------------------

export const enqueue = async (
  operation: SyncOperation,
  payload: Record<string, any>
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (operation, payload, status, created_at) VALUES (?, ?, 'pending', ?)`,
    [operation, JSON.stringify(payload), new Date().toISOString()]
  );
};

export const getPendingOperations = async (): Promise<SyncQueueItem[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM sync_queue
     WHERE (status = 'pending' OR (status = 'failed' AND retry_count < max_retries))
     ORDER BY created_at ASC`
  );
  return rows as SyncQueueItem[];
};

export const markInProgress = async (id: number): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'in_progress', last_attempted_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
};

export const markCompleted = async (id: number): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
};

export const markFailed = async (
  id: number,
  errorMessage: string
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1,
     error_message = ?, last_attempted_at = ? WHERE id = ?`,
    [errorMessage, new Date().toISOString(), id]
  );
};

export const resetInProgressToRetry = async (): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending' WHERE status = 'in_progress'`
  );
};

export const getQueueCount = async (): Promise<number> => {
  const db = getDatabase();
  const result: any = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status != 'failed' OR retry_count < max_retries`
  );
  return result?.count ?? 0;
};

export const removeByLocalId = async (
  operation: SyncOperation,
  localId: string
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `DELETE FROM sync_queue WHERE operation = ? AND payload LIKE ?`,
    [operation, `%"localId":"${localId}"%`]
  );
};

export const replacePendingPostInteraction = async (
  operation: "like" | "unlike" | "bookmark" | "unbookmark",
  postId: number
): Promise<void> => {
  const db = getDatabase();
  const isLikeOperation = operation === "like" || operation === "unlike";
  const relatedOperations = isLikeOperation
    ? ["like", "unlike"]
    : ["bookmark", "unbookmark"];

  await db.runAsync(
    `DELETE FROM sync_queue
     WHERE operation IN (?, ?)
       AND status IN ('pending', 'failed')
       AND payload LIKE ?`,
    [relatedOperations[0], relatedOperations[1], `%\"postId\":${postId}%`]
  );

  await db.runAsync(
    `INSERT INTO sync_queue (operation, payload, status, created_at)
     VALUES (?, ?, 'pending', ?)`,
    [operation, JSON.stringify({ postId }), new Date().toISOString()]
  );
};

export const removePendingReviewByGameId = async (
  gameId: number,
  userId?: number
): Promise<void> => {
  const db = getDatabase();
  if (userId !== undefined) {
    await db.runAsync(
      `DELETE FROM sync_queue
       WHERE operation = 'create_review'
         AND status IN ('pending', 'failed', 'in_progress')
         AND payload LIKE ?
         AND payload LIKE ?`,
      [`%"gameId":${gameId}%`, `%"userId":${userId}%`]
    );
    return;
  }

  await db.runAsync(
    `DELETE FROM sync_queue
     WHERE operation = 'create_review'
       AND status IN ('pending', 'failed', 'in_progress')
       AND payload LIKE ?`,
    [`%"gameId":${gameId}%`]
  );
};

export const replacePendingProfileUpdate = async (
  payload: Record<string, any>
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `DELETE FROM sync_queue WHERE operation = 'update_profile'`
  );

  await db.runAsync(
    `INSERT INTO sync_queue (operation, payload, status, created_at)
     VALUES ('update_profile', ?, 'pending', ?)`,
    [JSON.stringify(payload), new Date().toISOString()]
  );
};
