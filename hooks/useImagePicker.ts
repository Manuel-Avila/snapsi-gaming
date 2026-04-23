import * as ImagePicker from "expo-image-picker";

type PickImageResult =
  | { status: "success"; uri: string }
  | { status: "cancelled" }
  | { status: "permission_denied" };

export const useImagePicker = () => {
  const pickImage = async (): Promise<PickImageResult> => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      return { status: "permission_denied" };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return { status: "cancelled" };
    }

    return { status: "success", uri: result.assets[0].uri };
  };

  return { pickImage };
};
