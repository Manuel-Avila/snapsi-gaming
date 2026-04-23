export type IUserProfile = {
  id: number;
  username: string;
  name: string;
  age: number;
  bio: string | null;
  follower_count: number;
  following_count: number;
  gender: string;
  post_count: number;
  profile_picture_url: string | null;
  is_followed: boolean;
};

export type IUpdateProfileData = {
  name: string;
  bio: string;
  imageUri?: string;
};

export type IFollowUserData = {
  id: number;
  username: string;
};
