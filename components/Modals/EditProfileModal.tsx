import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import CustomTextInput from "../ui/CustomTextInput";
import { Modal } from "../ui/Modal";
import PulsateButton from "../ui/PulsateButton";
import { IUpdateProfileData, IUserProfile } from "@/types/UserTypes";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { updateProfileSchema } from "@/validators/profileValidator";
import { useProfileMutations } from "@/hooks/useProfileMutations";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  profileData: IUserProfile | undefined;
};

export default function EditProfileModal({
  isVisible,
  onClose,
  profileData,
}: Props) {
  const safeAreaInsets = useSafeAreaInsets();
  const { handleUpdateProfile, isUpdatingProfile } = useProfileMutations();
  const { submitForm, isSubmitting, errors } = useFormSubmit();
  const [name, setName] = useState(profileData?.name || "");
  const [bio, setBio] = useState(profileData?.bio || "");
  const [imageUri, setImageUri] = useState<string | null>(
    profileData?.profile_picture_url || null
  );
  const { pickImage } = useImagePicker();

  const updateProfile = (data: IUpdateProfileData) => {
    onClose();
    handleUpdateProfile(data);
  };

  const handleSaveChanges = () => {
    const image =
      imageUri !== profileData?.profile_picture_url ? imageUri : undefined;

    const formData = {
      imageUri: image,
      name: name.trim(),
      bio: bio.trim(),
    };

    submitForm(formData, updateProfileSchema, updateProfile);
  };

  const handleSelectImage = async () => {
    const result = await pickImage();

    if (result.status === "success") {
      setImageUri(result.uri);
    }
  };

  useEffect(() => {
    if (isVisible) {
      setName(profileData?.name || "");
      setBio(profileData?.bio || "");
      setImageUri(profileData?.profile_picture_url || null);
    }
  }, [isVisible, profileData]);

  const disableButton =
    isSubmitting ||
    isUpdatingProfile ||
    (imageUri === profileData?.profile_picture_url &&
      name.trim() === profileData?.name &&
      bio.trim() === profileData?.bio);

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      backdropOpacity={0.5}
      style={styles.modal}
      contentContainerStyle={styles.container}
    >
      <View style={styles.center}>
        <View style={styles.topBar} />
        <Text style={styles.modalTitle}>Edit Profile</Text>
      </View>
      <PulsateButton onPress={handleSelectImage}>
        <Image
          style={styles.profileImage}
          source={
            imageUri
              ? { uri: imageUri }
              : require("@/assets/images/profile-image-placeholder.webp")
          }
          contentFit="cover"
          cachePolicy={"memory-disk"}
          transition={500}
        />
      </PulsateButton>
      <CustomTextInput
        value={name}
        onChangeText={setName}
        label="Name"
        error={errors.name}
      />

      <CustomTextInput
        value={bio}
        onChangeText={setBio}
        label="Biography"
        error={errors.bio}
      />

      <PulsateButton
        style={[styles.saveButton, { marginBottom: safeAreaInsets.bottom }]}
        onPress={handleSaveChanges}
        disabled={disableButton}
      >
        <Text style={styles.text}>Save Changes</Text>
      </PulsateButton>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    backgroundColor: COLORS.commentsBackground,
    padding: 25,
    gap: 20,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
  },
  center: {
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  topBar: {
    height: 4,
    backgroundColor: COLORS.gray,
    width: 40,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
  },
  saveButton: {
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
  },
  text: {
    textAlign: "center",
    fontSize: 16,
    color: COLORS.text,
  },
});
