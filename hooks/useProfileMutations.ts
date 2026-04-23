import { useMutation, useQueryClient } from "react-query";
import { useProfile } from "./useProfile";
import { IUpdateProfileData, IUserProfile } from "@/types/UserTypes";
import Toast from "react-native-toast-message";

type IProfileContext = {
  previousData: IUserProfile | undefined;
};

export const useProfileMutations = () => {
  const queryClient = useQueryClient();
  const { updateProfile } = useProfile();

  const { mutate: handleUpdateProfile, isLoading: isUpdatingProfile } =
    useMutation({
      mutationFn: updateProfile,
      onMutate: async (data: IUpdateProfileData) => {
        await queryClient.cancelQueries(["myProfile"]);

        const previousData = queryClient.getQueryData<IUserProfile | undefined>(
          ["myProfile"]
        );

        queryClient.setQueryData<IUserProfile | undefined>(
          ["myProfile"],
          (oldData: IUserProfile | undefined) => {
            if (!oldData) return;

            const { name, bio, imageUri } = data;

            return {
              ...oldData,
              name,
              bio,
              profile_picture_url: imageUri
                ? imageUri
                : oldData.profile_picture_url,
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
      onSettled: () => {
        queryClient.invalidateQueries(["myProfile"]);
        queryClient.invalidateQueries(["posts"]);
        queryClient.invalidateQueries(["comments"]);
      },
    });

  return {
    handleUpdateProfile,
    isUpdatingProfile,
  };
};
