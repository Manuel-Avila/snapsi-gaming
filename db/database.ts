import * as SQLite from "expo-sqlite";

const SCHEMA_VERSION = 2;

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync("snapsi.db");

  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  const versionRow: any = await db
    .getFirstAsync(`PRAGMA user_version;`)
    .catch(() => null);
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await db.execAsync(`DROP TABLE IF EXISTS posts;`);
    await db.execAsync(`DROP TABLE IF EXISTS comments;`);
    await db.execAsync(`DROP TABLE IF EXISTS game_reviews;`);
    await db.execAsync(`DROP TABLE IF EXISTS sync_queue;`);
    await db.execAsync(`DROP TABLE IF EXISTS sync_meta;`);
    await db.execAsync(`DROP TABLE IF EXISTS game_categories;`);
    await db.execAsync(`DROP TABLE IF EXISTS games_cache;`);
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER,
      local_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      image_cloudinary_id TEXT,
      caption TEXT,
      tags TEXT,
      created_at TEXT NOT NULL,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      is_liked INTEGER DEFAULT 0,
      is_bookmarked INTEGER DEFAULT 0,
      user_name TEXT,
      user_username TEXT,
      user_profile_picture_url TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER,
      local_id TEXT UNIQUE NOT NULL,
      post_id INTEGER,
      post_local_id TEXT,
      comment_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT,
      user_username TEXT,
      user_profile_picture_url TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS game_reviews (
      id INTEGER,
      local_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      game_name TEXT NOT NULL,
      game_image TEXT,
      rating INTEGER NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      user_name TEXT,
      user_username TEXT,
      user_profile_picture_url TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 5,
      created_at TEXT NOT NULL,
      last_attempted_at TEXT,
      error_message TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS game_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS games_cache (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      background_image TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    UPDATE posts
    SET local_id = ('server_' || id)
    WHERE id IS NOT NULL
      AND sync_status = 'synced'
      AND local_id != ('server_' || id)
      AND NOT EXISTS (
        SELECT 1 FROM posts p2 WHERE p2.local_id = ('server_' || posts.id)
      );
  `);

  await db.execAsync(`
    DELETE FROM posts
    WHERE id IS NOT NULL
      AND local_id != ('server_' || id)
      AND EXISTS (
        SELECT 1 FROM posts p2
        WHERE p2.id = posts.id
          AND p2.local_id = ('server_' || posts.id)
      );
  `);

  await db.execAsync(`
    UPDATE comments
    SET local_id = ('server_' || id)
    WHERE id IS NOT NULL
      AND sync_status = 'synced'
      AND local_id != ('server_' || id)
      AND NOT EXISTS (
        SELECT 1 FROM comments c2 WHERE c2.local_id = ('server_' || comments.id)
      );
  `);

  await db.execAsync(`
    DELETE FROM comments
    WHERE id IS NOT NULL
      AND local_id != ('server_' || id)
      AND EXISTS (
        SELECT 1 FROM comments c2
        WHERE c2.id = comments.id
          AND c2.local_id = ('server_' || comments.id)
      );
  `);

  await db.execAsync(`
    UPDATE game_reviews
    SET local_id = ('server_' || id)
    WHERE id IS NOT NULL
      AND sync_status = 'synced'
      AND local_id != ('server_' || id)
      AND NOT EXISTS (
        SELECT 1 FROM game_reviews r2 WHERE r2.local_id = ('server_' || game_reviews.id)
      );
  `);

  await db.execAsync(`
    DELETE FROM game_reviews
    WHERE id IS NOT NULL
      AND local_id != ('server_' || id)
      AND EXISTS (
        SELECT 1 FROM game_reviews r2
        WHERE r2.id = game_reviews.id
          AND r2.local_id = ('server_' || game_reviews.id)
      );
  `);

  if (currentVersion < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
};
