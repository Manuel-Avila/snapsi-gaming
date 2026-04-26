import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from "react-native";
import CustomTextInput from "../ui/CustomTextInput";
import PulsateButton from "../ui/PulsateButton";
import { Modal } from "../ui/Modal";
import type { IGameReview } from "@/types/GameTypes";
import * as ReviewRepo from "@/db/reviewRepository";
import * as SyncQueue from "@/db/syncQueueRepository";
import { useMutation, useQueryClient } from "react-query";
import { IUserProfile } from "@/types/UserTypes";
import Toast from "react-native-toast-message";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  gameId: number;
  gameName: string;
  gameImage?: string;
  existingReview?: IGameReview;
  readOnly?: boolean;
};

const generateLocalId = (): string =>
  `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

type ReviewMutationPayload = {
  game_id: number;
  game_name: string;
  game_image?: string;
  rating: number;
  description?: string;
};

export default function ReviewModal({
  isVisible,
  onClose,
  gameId,
  gameName,
  gameImage,
  existingReview,
  readOnly = false,
}: Props) {
  const [rating, setRating] = useState(
    existingReview ? existingReview.rating.toString() : ""
  );
  const [description, setDescription] = useState(
    existingReview ? existingReview.description || "" : ""
  );
  const [ratingError, setRatingError] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: ReviewMutationPayload) => {
      const localId = generateLocalId();
      const myProfile = queryClient.getQueryData<IUserProfile>(["myProfile"]);

      if (!myProfile?.id || !myProfile?.username) {
        throw new Error("Missing user profile in cache");
      }

      await ReviewRepo.insertLocalReview({
        localId,
        userId: myProfile.id,
        gameId: data.game_id,
        gameName: data.game_name,
        gameImage: data.game_image,
        rating: data.rating,
        description: data.description,
        userName: myProfile.name,
        userUsername: myProfile.username,
        userProfilePictureUrl: myProfile.profile_picture_url ?? "",
      });

      // Keep only the latest pending review change for this game.
      await SyncQueue.removePendingReviewByGameId(data.game_id, myProfile.id);

      await SyncQueue.enqueue("create_review", {
        localId,
        userId: myProfile.id,
        gameId: data.game_id,
        gameName: data.game_name,
        gameImage: data.game_image,
        rating: data.rating,
        description: data.description,
      });

      return { localId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["gameReviews"]);
      Toast.show({
        type: "success",
        text1: existingReview ? "Review Updated" : "Review Added",
        text2: gameName,
        visibilityTime: 2000,
      });
      onClose();
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again.",
      });
    }
  });

  useEffect(() => {
    if (isVisible && existingReview) {
      setRating(existingReview.rating.toString());
      setDescription(existingReview.description || "");
    } else if (isVisible && !existingReview) {
      setRating("");
      setDescription("");
    }
    setRatingError(undefined);
  }, [isVisible, existingReview]);

  const handleRatingChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    setRating(numericValue);
    if (ratingError) setRatingError(undefined);
  };

  const handleSave = () => {
    if (readOnly) return;
    Keyboard.dismiss();
    const numericRating = parseInt(rating, 10);
    if (!rating || isNaN(numericRating) || numericRating < 0 || numericRating > 100) {
      setRatingError("Rating must be between 0 and 100");
      return;
    }
    setRatingError(undefined);

    createMutation.mutate({
      game_id: gameId,
      game_name: gameName,
      game_image: gameImage,
      rating: numericRating,
      description: description.trim(),
    });
  };

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
        <Text style={styles.modalTitle}>
          {readOnly ? gameName : existingReview ? "Edit Review" : "Add Review"}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {gameImage ? (
          <Image
            source={{ uri: gameImage }}
            style={styles.gameImage}
            contentFit="cover"
          />
        ) : null}

        {!readOnly ? (
          <Text style={styles.gameName} numberOfLines={1}>
            {gameName}
          </Text>
        ) : null}

        <CustomTextInput
          value={rating}
          onChangeText={handleRatingChange}
          label={readOnly ? "Rating" : "Rating (0-100)"}
          keyboardType="numeric"
          maxLength={3}
          editable={!readOnly}
          error={ratingError}
        />

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionLabel}>
            {readOnly ? "Description" : "Description (Optional)"}
          </Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            editable={!readOnly}
            multiline={true}
            placeholder={readOnly ? "" : "What did you think of the game?"}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {!readOnly ? (
          <PulsateButton
            style={styles.saveButton}
            onPress={handleSave}
            disabled={createMutation.isLoading || !rating}
          >
            <Text style={styles.saveButtonText}>
              {createMutation.isLoading
                ? "Saving..."
                : existingReview
                ? "Update Review"
                : "Save Review"}
            </Text>
          </PulsateButton>
        ) : null}
      </ScrollView>
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
  topBar: {
    height: 4,
    backgroundColor: COLORS.gray,
    width: 40,
  },
  modalTitle: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 20,
  },
  gameName: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  gameImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  saveButton: {
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    textAlign: "center",
    fontSize: 16,
    color: COLORS.text,
  },
  descriptionContainer: {
    marginTop: 10,
  },
  descriptionLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  descriptionInput: {
    color: COLORS.text,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 15,
    padding: 15,
  },
});
