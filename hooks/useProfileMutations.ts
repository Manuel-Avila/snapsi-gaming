import { useMutation, useQueryClient } from "react-query";
import { useProfile } from "./useProfile";
import { IUpdateProfileData, IUserProfile } from "@/types/UserTypes";
import Toast from "react-native-toast-message";
import * as NetworkService from "@/services/networkService";
import * as SyncQueue from "@/db/syncQueueRepository";
import * as PostRepo from "@/db/postRepository";
import * as CommentRepo from "@/db/commentRepository";
import * as ReviewRepo from "@/db/reviewRepository";
import { isAxiosError } from "axios";

type IProfileContext = {
  previousData: IUserProfile | undefined;
};

export const useProfileMutations = () => {
  const queryClient = useQueryClient();
  const { updateProfile } = useProfile();

  const queueProfileUpdate = async (
    data: IUpdateProfileData,
    currentProfile: IUserProfile
  ) => {
    await SyncQueue.replacePendingProfileUpdate({
      userId: currentProfile.id,
      name: data.name,
      bio: data.bio,
      imageUri: data.imageUri ?? null,
      previousProfilePictureUrl: currentProfile.profile_picture_url ?? null,
    });
  };

  const updateLocalUserSnapshot = async (
    userId: number,
    name: string,
    profilePictureUrl: string | null
  ) => {
    await PostRepo.updateUserSnapshot(userId, name, profilePictureUrl);
    await CommentRepo.updateUserSnapshot(userId, name, profilePictureUrl);
    await ReviewRepo.updateUserSnapshot(userId, name, profilePictureUrl);
  };

  const { mutate: handleUpdateProfile, isLoading: isUpdatingProfile } =
    useMutation({
      mutationFn: async (data: IUpdateProfileData) => {
        const currentProfile = queryClient.getQueryData<IUserProfile | undefined>(
          ["myProfile"]
        );

        if (!currentProfile) {
          throw new Error("Profile not available in cache");
        }

        if (!NetworkService.isOnline()) {
          await queueProfileUpdate(data, currentProfile);
          return { queued: true };
        }

        try {
          await updateProfile(data);
          return { queued: false };
        } catch (error) {
          if (isAxiosError(error) && !error.response) {
            await queueProfileUpdate(data, currentProfile);
            return { queued: true };
          }
          throw error;
        }
      },
      onMutate: async (data: IUpdateProfileData) => {
        await queryClient.cancelQueries(["myProfile"]);

        const previousData = queryClient.getQueryData<IUserProfile | undefined>(
          ["myProfile"]
        );

        const nextProfilePictureUrl =
          data.imageUri !== undefined
            ? data.imageUri
            : previousData?.profile_picture_url ?? null;

        if (previousData) {
          await updateLocalUserSnapshot(
            previousData.id,
            data.name,
            nextProfilePictureUrl
          );
        }

        queryClient.setQueryData<IUserProfile | undefined>(
          ["myProfile"],
          (oldData: IUserProfile | undefined) => {
            if (!oldData) return;

            const { name, bio, imageUri } = data;

            return {
              ...oldData,
              name,
              bio,
              profile_picture_url:
                imageUri !== undefined ? imageUri : oldData.profile_picture_url,
            };
          }
        );

        return { previousData };
      },
      onError: (
        error: unknown,
        variables: IUpdateProfileData,
        context: IProfileContext | undefined
      ) => {
        Toast.show({
          type: "error",
          text1: "Error updating profile",
          text2: "Failed to update profile. Please try again.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(["myProfile"], context.previousData);
        }
      },
      onSuccess: (result) => {
        if ((result as any)?.queued) {
          Toast.show({
            type: "success",
            text1: "Profile saved offline",
            text2: "It will sync automatically when online.",
          });
        }
      },
      onSettled: (result) => {
        if ((result as any)?.queued) {
          return;
        }
        queryClient.invalidateQueries(["myProfile"]);
        queryClient.invalidateQueries(["posts"]);
        queryClient.invalidateQueries(["comments"]);
        queryClient.invalidateQueries(["gameReviews"]);
      },
    });

  return {
    handleUpdateProfile,
    isUpdatingProfile,
  };
};
