export type IGameTag = {
  gameId?: number;
  gameName?: string;
  gameImage?: string;
  category?: string;
};

export type IPost = {
  id: number;
  local_id?: string;
  image_url: string;
  image_cloudinary_id: string;
  caption: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_optimistic?: boolean;
  sync_status?: 'synced' | 'pending' | 'failed';
  tags?: IGameTag[];
  user: {
    id: number;
    name: string;
    username: string;
    profile_picture_url: string;
  };
};

export type ICreatePostData = {
  imageUri: string;
  caption: string;
  tags?: IGameTag[];
};

export type IGetPostsResponse = {
  posts: IPost[];
  nextCursor: string | number | null;
};
