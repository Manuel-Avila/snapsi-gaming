export type IComment = {
  id: number;
  local_id?: string;
  comment_text: string;
  created_at: string;
  is_optimistic?: boolean;
  sync_status?: 'synced' | 'pending' | 'failed';
  user: {
    id: number;
    name: string;
    username: string;
    profile_picture_url: string;
  };
};

export type IGetCommentsResponse = {
  comments: IComment[];
  nextCursor: string | number | null;
};

export type IAddCommentData = {
  postId: number;
  comment_text: string;
};
