import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

type PickImageResult =
  | { status: "success"; uri: string }
  | { status: "cancelled" }
  | { status: "permission_denied" };

export const useImagePicker = () => {
  const persistPickedImage = async (uri: string): Promise<string> => {
    const targetDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!targetDirectory) {
      return uri;
    }

    const extension = uri.split(".").pop()?.split("?")[0] ?? "jpg";
    const targetUri = `${targetDirectory}picked_${Date.now()}.${extension}`;

    try {
      await FileSystem.copyAsync({ from: uri, to: targetUri });
      return targetUri;
    } catch {
      return uri;
    }
  };

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

    const persistedUri = await persistPickedImage(result.assets[0].uri);
    return { status: "success", uri: persistedUri };
  };

  return { pickImage };
};
