import { useMutation, useQueryClient } from "react-query";
import { useUser } from "./useUser";
import Toast from "react-native-toast-message";
import type { IFollowUserData, IUserProfile } from "@/types/UserTypes";

type IUserContext = {
  previousData: IUserProfile | undefined;
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();
  const { followUser, unfollowUser } = useUser();

  const optimisticModifyUpdate = (action: "following" | "unfollowing") => ({
    onMutate: async ({ id, username }: IFollowUserData) => {
      await queryClient.cancelQueries(["user", username]);

      const previousData = queryClient.getQueryData<IUserProfile | undefined>([
        "user",
        username,
      ]);

      queryClient.setQueryData(["user", username], (oldData: any) => {
        if (!oldData) return;

        return {
          ...oldData,
          is_followed: action === "following" ? true : false,
          follower_count:
            action === "following"
              ? oldData.follower_count + 1
              : oldData.follower_count - 1,
        };
      });

      return { previousData };
    },
    onError: (
      error: unknown,
      variables: IFollowUserData,
      context: IUserContext | undefined
    ) => {
      Toast.show({
        type: "error",
        text1: "Error following user",
        text2: "Failed to follow user. Please try again.",
      });
      if (context?.previousData) {
        queryClient.setQueryData(
          ["user", variables.username],
          context.previousData
        );
      }
    },
    onSettled: (data: unknown, error: unknown, variables: IFollowUserData) => {
      queryClient.invalidateQueries(["user", variables.username]);
      queryClient.invalidateQueries(["myProfile"]);
    },
  });

  const { mutate: handleFollow, isLoading: isFollowing } = useMutation({
    mutationFn: followUser,
    ...optimisticModifyUpdate("following"),
  });

  const { mutate: handleUnfollow, isLoading: isUnfollowing } = useMutation({
    mutationFn: unfollowUser,
    ...optimisticModifyUpdate("unfollowing"),
  });

  return {
    handleFollow,
    handleUnfollow,
    isFollowing,
    isUnfollowing,
  };
};
