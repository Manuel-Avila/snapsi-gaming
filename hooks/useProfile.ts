import api from "@/api/apiClient";
import type { IUpdateProfileData, IUserProfile } from "@/types/UserTypes";

export const useProfile = () => {
  const getMyProfile = async (): Promise<IUserProfile> => {
    const response = await api.get("/profile");

    return response.data?.user;
  };

  const updateProfile = async (data: IUpdateProfileData) => {
    const formData = new FormData();

    if (data.imageUri) {
      const fileName = data.imageUri?.split("/").pop();
      const fileType = fileName?.split(".").pop();
      formData.append("image", {
        uri: data.imageUri,
        name: fileName,
        type: `image/${fileType}`,
      } as any);
    }

    formData.append("name", data.name);
    formData.append("bio", data.bio);

    const response = await api.put("/profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  };

  return { getMyProfile, updateProfile };
};
