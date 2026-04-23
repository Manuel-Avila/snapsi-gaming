export type IComment = {
  id: number;
  comment_text: string;
  created_at: string;
  is_optimistic?: boolean;
  user: {
    id: number;
    name: string;
    username: string;
    profile_picture_url: string;
  };
};

export type IGetCommentsResponse = {
  comments: IComment[];
  nextCursor: string | null;
};

export type IAddCommentData = {
  postId: number;
  comment_text: string;
};
