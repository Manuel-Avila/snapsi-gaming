import { getDatabase } from "./database";
import type { IGameCategory, IRawgGame } from "@/types/GameTypes";

export const upsertCategories = async (
  categories: IGameCategory[]
): Promise<void> => {
  if (!categories.length) return;
  const db = getDatabase();
  const now = new Date().toISOString();

  for (const category of categories) {
    await db.runAsync(
      `INSERT INTO game_categories (id, name, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         updated_at = excluded.updated_at`,
      [category.id, category.name, now]
    );
  }
};

export const getCategories = async (): Promise<IGameCategory[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT id, name FROM game_categories ORDER BY name COLLATE NOCASE ASC`
  );
  return rows as IGameCategory[];
};

export const upsertGames = async (games: IRawgGame[]): Promise<void> => {
  if (!games.length) return;
  const db = getDatabase();
  const now = new Date().toISOString();

  for (const game of games) {
    await db.runAsync(
      `INSERT INTO games_cache (id, name, background_image, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         background_image = excluded.background_image,
         updated_at = excluded.updated_at`,
      [game.id, game.name, game.background_image ?? null, now]
    );
  }
};

export const searchGames = async (
  search: string,
  limit: number = 40
): Promise<IRawgGame[]> => {
  const db = getDatabase();
  const trimmed = search.trim();

  const rows =
    trimmed.length > 0
      ? await db.getAllAsync(
          `SELECT id, name, background_image
           FROM games_cache
           WHERE name LIKE ?
           ORDER BY name COLLATE NOCASE ASC
           LIMIT ?`,
          [`%${trimmed}%`, limit]
        )
      : await db.getAllAsync(
          `SELECT id, name, background_image
           FROM games_cache
           ORDER BY updated_at DESC
           LIMIT ?`,
          [limit]
        );

  return (rows as Array<{ id: number; name: string; background_image: string | null }>).map(
    (row) => ({
      id: row.id,
      name: row.name,
      background_image: row.background_image ?? "",
    })
  );
};
