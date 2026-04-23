export type INotification = {
  id: number;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    profile_picture_url: string | null;
  };
  post: {
    id: number;
    image_url: string;
  } | null;
};
export type IGetMyNotificationsResponse = {
  notifications: INotification[];
  nextCursor: string | null;
};
