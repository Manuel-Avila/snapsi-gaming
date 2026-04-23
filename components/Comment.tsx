import { Link } from "expo-router";
import { COLORS } from "@/constants/theme";
import { IComment } from "@/types/CommentTypes";
import formatRelativeTime from "@/utils/formatRelativeTime";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import PulsateButton from "./ui/PulsateButton";
import { PLACEHOLDER_PROFILE_IMAGE } from "@/constants/assets";

export default function Comment({
  comment,
  onClose,
}: {
  comment: IComment;
  onClose: () => void;
}) {
  return (
    <View
      style={[styles.container, comment.is_optimistic && styles.optimistic]}
    >
      <Link href={`/user/${comment.user.username}`} asChild>
        <PulsateButton onPress={onClose}>
          <Image
            style={styles.profileImage}
            source={
              comment.user.profile_picture_url
                ? { uri: comment.user.profile_picture_url }
                : PLACEHOLDER_PROFILE_IMAGE
            }
            transition={500}
            contentFit="cover"
            cachePolicy={"memory-disk"}
          />
        </PulsateButton>
      </Link>
      <View style={styles.textContainer}>
        <Text style={[styles.text, styles.name]}>{comment.user.name}</Text>
        <Text style={styles.text}>{comment.comment_text}</Text>
        <Text style={styles.time}>
          {formatRelativeTime(comment.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
  },
  optimistic: {
    opacity: 0.6,
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 50,
  },
  textContainer: {
    gap: 2,
  },
  name: {
    fontSize: 11,
    fontWeight: "bold",
  },
  text: {
    color: COLORS.text,
  },
  time: {
    color: COLORS.gray,
    fontSize: 12,
  },
});
