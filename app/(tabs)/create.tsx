import PulsateButton from "@/components/ui/PulsateButton";
import { COLORS } from "@/constants/theme";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { useImagePicker } from "@/hooks/useImagePicker";
import { usePostMutations } from "@/hooks/usePostMutations";
import { createPostSchema } from "@/validators/postValidator";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import GameSelectionModal from "@/components/Modals/GameSelectionModal";
import type { IGameTag } from "@/types/PostTypes";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  TextInput,
} from "react-native-gesture-handler";

const SCALE_ON_PRESS = 0.7;

type TakenPhoto = {
  uri: string;
};

export default function Create() {
  const { handleCreatePost, isCreating } = usePostMutations();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [takenPhoto, setTakenPhoto] = useState<TakenPhoto | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [caption, setCaption] = useState("");
  const [zoom, setZoom] = useState(0.1);
  const savedZoom = useRef(0);
  const cameraRef = useRef<CameraView>(null);
  const { pickImage } = useImagePicker();
  const router = useRouter();
  const { submitForm, isSubmitting } = useFormSubmit();
  const isFocused = useIsFocused();
  const [gameTags, setGameTags] = useState<IGameTag[]>([]);
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);

  const handleShare = async () => {
    Keyboard.dismiss();

    const formData = {
      imageUri: takenPhoto?.uri,
      caption: caption.trim(),
      tags: gameTags,
    };

    await submitForm(formData, createPostSchema, handleCreatePost);
    router.replace({
      pathname: "/(tabs)/home",
      params: { scrollToTop: "true" },
    });
    clearFields();
  };

  const changeCameraOrientation = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const cycleFlashMode = () => {
    if (flashMode === "off") {
      setFlashMode("on");
    } else if (flashMode === "on") {
      setFlashMode("auto");
    } else {
      setFlashMode("off");
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      setTakingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync();
      setTakenPhoto(photo);
      setTakingPhoto(false);
    }
  };

  const handleSelectImage = async () => {
    const result = await pickImage();

    if (result.status === "success") {
      setTakenPhoto({ uri: result.uri });
    }
  };

  const clearFields = () => {
    setTakenPhoto(null);
    setCaption("");
    setZoom(0);
    setGameTags([]);
    savedZoom.current = 0;
  };

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, []);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const scale = event.scale;
      const newZoom = savedZoom.current + (scale - 1) * 0.5;
      const clampedZoom = Math.max(0, Math.min(newZoom, 1));
      setZoom(clampedZoom);
    })
    .onEnd(() => {
      savedZoom.current = zoom;
    })
    .runOnJS(true);

  function GoBackButton() {
    return (
      <Link href="/(tabs)/home" style={styles.arrowBackContainer} asChild>
        <PulsateButton scaleOnPress={SCALE_ON_PRESS} onPress={clearFields}>
          <Ionicons name="arrow-back-outline" style={styles.icon} />
        </PulsateButton>
      </Link>
    );
  }

  if (permission === null || !isFocused) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  if (!permission?.granted) {
    return (
      <>
        <GoBackButton />
        <Pressable
          style={waitingPermissionsStyles.container}
          onPress={requestPermission}
        >
          <Ionicons
            name="camera-outline"
            style={waitingPermissionsStyles.icon}
          />
          <Text style={waitingPermissionsStyles.text}>
            Waiting for permissions, press again to retry...
          </Text>
        </Pressable>
      </>
    );
  }

  if (takenPhoto) {
    return (
      <KeyboardAvoidingView
        style={styles.scrollContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <GoBackButton />
          <Text style={styles.title}>New Post</Text>
          <View style={styles.postImageContainer}>
            <Image
              style={styles.postImage}
              source={{ uri: takenPhoto.uri }}
              contentFit="cover"
            />
            <PulsateButton onPress={clearFields} style={styles.changeButton}>
              <Ionicons name="image-outline" style={styles.changeImageText} />
              <Text style={styles.changeImageText}>Change</Text>
            </PulsateButton>
          </View>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor={COLORS.gray}
            maxLength={500}
            multiline
            value={caption}
            onChangeText={setCaption}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer} contentContainerStyle={styles.tagsContent}>
            {[...gameTags].sort((a, b) => (a.gameName ? 0 : 1) - (b.gameName ? 0 : 1)).map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                {tag.gameName && (
                  <>
                    <Ionicons name="game-controller-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.gameTagText}>{tag.gameName}</Text>
                  </>
                )}
                {tag.category && (
                  <Text style={styles.categoryTagText}>{tag.category}</Text>
                )}
                <Pressable onPress={() => setGameTags(prev => prev.filter((_, i) => i !== index))}>
                  <Ionicons name="close-circle" size={16} color={COLORS.gray} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addTagButton} onPress={() => setIsTagModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.tagButtonText}>
                {gameTags.length === 0 ? "Add tags" : "Add more"}
              </Text>
            </Pressable>
          </ScrollView>
          <PulsateButton
            onPress={handleShare}
            disabled={isSubmitting || isCreating || gameTags.length === 0}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </PulsateButton>
        </ScrollView>
        <GameSelectionModal
          isVisible={isTagModalVisible}
          onClose={() => setIsTagModalVisible(false)}
          onApplyFilter={(filter) => {
            if (filter) {
              setGameTags((prev) => {
                if (filter.category && prev.some((t) => t.category === filter.category)) return prev;
                if (filter.gameId && prev.some((t) => t.gameId === filter.gameId)) return prev;
                return [...prev, filter];
              });
            }
          }}
          title="Add Game or Category"
          showToastOnSelect={true}
          showClearButton={false}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <GoBackButton />
      <PulsateButton
        onPress={cycleFlashMode}
        scaleOnPress={SCALE_ON_PRESS}
        style={cameraStyles.flashButton}
      >
        {flashMode === "off" && (
          <Ionicons name="flash-off-sharp" style={styles.icon} />
        )}
        {flashMode === "on" && (
          <Ionicons name="flash-outline" style={styles.icon} />
        )}
        {flashMode === "auto" && (
          <View>
            <Ionicons name="flash-outline" style={styles.icon} />
            <Text style={cameraStyles.autoFlashText}>A</Text>
          </View>
        )}
      </PulsateButton>
      <GestureDetector gesture={pinchGesture}>
        <CameraView
          style={cameraStyles.cameraView}
          ref={cameraRef}
          facing={facing}
          flash={flashMode}
          zoom={zoom}
          animateShutter={false}
          mirror={true}
        />
      </GestureDetector>

      <View style={cameraStyles.actionsContainer}>
        <View style={cameraStyles.buttonContainer}>
          <PulsateButton
            onPress={handleSelectImage}
            scaleOnPress={SCALE_ON_PRESS}
          >
            <Ionicons name="image-outline" style={styles.icon} />
          </PulsateButton>
          <PulsateButton
            onPress={takePhoto}
            scaleOnPress={0.8}
            disabled={takingPhoto}
          >
            <View style={cameraStyles.captureButtonCircle} />
          </PulsateButton>
          <PulsateButton
            onPress={changeCameraOrientation}
            scaleOnPress={SCALE_ON_PRESS}
          >
            <Ionicons name="camera-reverse-outline" style={styles.icon} />
          </PulsateButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
  },
  arrowBackContainer: {
    position: "absolute",
    top: 30,
    left: 20,
    zIndex: 1,
  },
  icon: {
    color: COLORS.text,
    fontSize: 32,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 30,
  },
  postImageContainer: {
    width: "100%",
  },
  postImage: {
    aspectRatio: 1,
  },
  captionInput: {
    color: COLORS.text,
    fontSize: 16,
    marginVertical: 10,
    marginHorizontal: 20,
    flex: 1,
    textAlignVertical: "top",
    minHeight: 80,
  },
  tagsContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  tagsContent: {
    gap: 10,
    alignItems: "center",
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.buttonBackground,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    gap: 5,
  },
  gameTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  categoryTagText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  addTagButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    gap: 5,
  },
  tagButtonText: {
    color: COLORS.primary,
    fontSize: 12,
  },
  shareButton: {
    margin: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  shareButtonText: {
    color: COLORS.text,
    fontSize: 18,
    textAlign: "center",
  },
  changeButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  changeImageText: {
    color: COLORS.text,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

const cameraStyles = StyleSheet.create({
  cameraView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  actionsContainer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "70%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  captureButtonCircle: {
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 50,
    width: 70,
    height: 70,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  autoFlashText: {
    color: COLORS.text,
    position: "absolute",
    top: -7,
    right: -7,
  },
  flashButton: {
    position: "absolute",
    top: 30,
    right: 20,
    zIndex: 1,
  },
});

const waitingPermissionsStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  icon: {
    fontSize: 80,
    color: COLORS.gray,
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: "center",
    paddingHorizontal: 80,
  },
});
