export type IGameReview = {
  id: number;
  local_id?: string;
  game_id: number;
  game_name: string;
  game_image: string;
  rating: number;
  description?: string;
  created_at: string;
  sync_status?: 'synced' | 'pending' | 'failed';
  user: {
    id: number;
    name: string;
    username: string;
    profile_picture_url: string;
  };
};

export type ICreateGameReviewData = {
  game_id: number;
  game_name: string;
  game_image?: string;
  rating: number;
  description?: string;
};

export type IRawgGame = {
  id: number;
  name: string;
  background_image: string;
};

export type IGameCategory = {
  id: number;
  name: string;
};
