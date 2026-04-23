import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import type { IUserProfile } from "@/types/UserTypes";
import PulsateButton from "./ui/PulsateButton";
import ImageModal from "./Modals/ImageModal";
import { useState } from "react";
import { PLACEHOLDER_PROFILE_IMAGE } from "@/constants/assets";

export default function ProfileInformation({
  profileInfo,
}: {
  profileInfo: IUserProfile | undefined;
}) {
  const [selectedImage, setSelectedImage] = useState<string>("");

  return (
    <View style={styles.container}>
      <PulsateButton
        onPress={() =>
          setSelectedImage(profileInfo?.profile_picture_url || "")
        }
      >
        <Image
          style={styles.profileImage}
          source={
            profileInfo?.profile_picture_url
              ? {
                  uri: profileInfo?.profile_picture_url,
                }
              : PLACEHOLDER_PROFILE_IMAGE
          }
          contentFit="cover"
          cachePolicy={"memory-disk"}
          transition={500}
        />
      </PulsateButton>
      <View style={styles.infoContainer}>
        <Text style={styles.profileName}>{profileInfo?.name}</Text>
        <Text style={styles.profileDescription}>
          {profileInfo?.bio || "No biography."}
        </Text>
      </View>

      <ImageModal
        isVisible={!!selectedImage}
        onClose={() => setSelectedImage("")}
        imageUrl={selectedImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    gap: 15,
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  infoContainer: {
    alignItems: "center",
    gap: 5,
  },
  profileName: {
    fontWeight: "bold",
    color: COLORS.text,
    fontSize: 18,
    textAlign: "center",
  },
  profileDescription: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
  },
});
