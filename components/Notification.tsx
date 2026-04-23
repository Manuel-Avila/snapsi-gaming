import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Href, Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PulsateButton from "./ui/PulsateButton";
import type { INotification } from "@/types/NotificationTypes";
import formatRelativeTime from "@/utils/formatRelativeTime";
import { PLACEHOLDER_PROFILE_IMAGE } from "@/constants/assets";

export default function NotificationCard({
  notification,
}: {
  notification: INotification;
}) {
  const NOTIFICATION_CONFIG = {
    like: {
      icon: "heart",
      style: [styles.icon, styles.notificationIcon],
      text: "liked your post.",
      href: `/post/${notification?.post?.id}`,
    },
    comment: {
      icon: "chatbubble",
      style: [styles.icon, styles.commentIcon],
      text: "commented on your post.",
      href: {
        pathname: "/post/[id]",
        params: { id: notification?.post?.id, openComments: true },
      },
    },
    follow: {
      icon: "person-add",
      style: [styles.icon, styles.followIcon],
      text: "started following you.",
      href: `/user/${notification?.sender?.username}`,
    },
  };

  const config =
    NOTIFICATION_CONFIG[notification?.type as keyof typeof NOTIFICATION_CONFIG];

  if (!config) {
    return null;
  }

  return (
    <Link href={config.href as Href} asChild>
      <PulsateButton style={styles.container}>
        <Link href={`/user/${notification?.sender?.username}`} asChild>
          <PulsateButton style={styles.profileImageContainer}>
            <Image
              style={styles.profileImage}
              source={
                notification?.sender?.profile_picture_url
                  ? {
                      uri: notification?.sender?.profile_picture_url,
                    }
                  : PLACEHOLDER_PROFILE_IMAGE
              }
              cachePolicy="memory-disk"
              transition={500}
              contentFit="cover"
            />

            <Ionicons
              name={config.icon as keyof typeof Ionicons.glyphMap}
              style={config.style}
            />
          </PulsateButton>
        </Link>
        <View style={styles.notificationDetails}>
          <Link href={`/user/${notification?.sender?.username}`} asChild>
            <PulsateButton>
              <Text style={styles.username}>
                {notification?.sender?.username}
              </Text>
            </PulsateButton>
          </Link>
          <Text style={styles.notificationInfo}>{config.text}</Text>
          <Text style={styles.timestamp}>
            {formatRelativeTime(notification?.created_at)}
          </Text>
        </View>
        {!!notification?.post && (
          <Image
            style={styles.postImage}
            source={{
              uri: notification?.post?.image_url,
            }}
            cachePolicy="memory-disk"
            transition={500}
            contentFit="cover"
          />
        )}
      </PulsateButton>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  icon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 14,
    backgroundColor: COLORS.background,
    borderRadius: 25,
    padding: 2,
  },
  notificationIcon: {
    color: COLORS.liked,
  },
  followIcon: {
    color: COLORS.followIcon,
  },
  commentIcon: {
    color: COLORS.commentIcon,
  },

  notificationDetails: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
    color: COLORS.text,
  },
  notificationInfo: {
    fontSize: 13,
    color: COLORS.gray,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.gray,
  },
  postImage: {
    width: 50,
    height: 50,
  },
});
