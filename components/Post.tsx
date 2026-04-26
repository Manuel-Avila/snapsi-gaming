import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import CommentsModal from "./Modals/CommentsModal";
import PulsateButton from "./ui/PulsateButton";
import type { IPost } from "@/types/PostTypes";
import formatRelativeTime from "@/utils/formatRelativeTime";
import { PLACEHOLDER_PROFILE_IMAGE } from "@/constants/assets";
import { usePostMutations } from "@/hooks/usePostMutations";
import { IUserProfile } from "@/types/UserTypes";
import { useQueryClient } from "react-query";
import ConfirmationModal from "./Modals/ConfirmationModal";

type Props = {
  post: IPost;
  openComments?: boolean;
};

export default function Post({ post, openComments }: Props) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const [showComments, setShowComments] = useState(openComments || false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const {
    handleLikePost,
    isLiking,
    handleUnlikePost,
    isUnliking,
    handleBookmarkPost,
    isBookmarking,
    handleUnbookmarkPost,
    isUnbookmarking,
    handleDeletePost,
    isDeleting,
  } = usePostMutations();

  useEffect(() => {
    const currentUser: IUserProfile | undefined =
      queryClient.getQueryData("myProfile");
    if (post?.user?.username === currentUser?.username) {
      setShowActions(true);
    }
  }, [post, queryClient]);

  const handleToggleAction = (action: string) => {
    const postIdentifier = {
      localId: post.local_id || `server_${post.id}`,
      postId: post.id,
    };
    let mutationFn;
    if (action === "like") {
      mutationFn = post.is_liked ? handleUnlikePost : handleLikePost;
    } else if (action === "bookmark") {
      mutationFn = post.is_bookmarked
        ? handleUnbookmarkPost
        : handleBookmarkPost;
    }

    if (mutationFn) {
      mutationFn(postIdentifier);
    }
  };

  const handleConfirmDeletePost = () => {
    setShowConfirmationModal(false);
    if (pathname.includes("/post/")) {
      router.back();
    }
    handleDeletePost({
      localId: post.local_id || `server_${post.id}`,
      postId: post.id,
    });
  };

  const isLikeToggling = isLiking || isUnliking;
  const isBookmarkToggling = isBookmarking || isUnbookmarking;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <Link href={`/user/${post.user.username}`} asChild>
          <PulsateButton style={styles.userContainer}>
            <Image
              style={styles.profileImage}
              source={
                post.user.profile_picture_url
                  ? {
                      uri: post.user.profile_picture_url,
                    }
                  : PLACEHOLDER_PROFILE_IMAGE
              }
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
            />
            <Text style={styles.name}>{post.user.name}</Text>
          </PulsateButton>
        </Link>
        {showActions && (
          <PulsateButton
            onPress={() => setShowConfirmationModal(true)}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={20} style={[styles.white]} />
          </PulsateButton>
        )}
      </View>
      {post.tags && post.tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer} contentContainerStyle={styles.tagsContent}>
          {[...post.tags].sort((a, b) => (a.gameName ? 0 : 1) - (b.gameName ? 0 : 1)).map((tag, index) => (
            <View key={index} style={styles.tagWrapper}>
              {tag.gameName ? (
                <View style={styles.gameTag}>
                  <Ionicons name="game-controller-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.gameTagText}>{tag.gameName}</Text>
                </View>
              ) : null}
              {tag.category ? (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{tag.category}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Image
        style={styles.postImage}
        source={{
          uri: post.image_url,
        }}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
      />

      <View style={styles.bar}>
        <View style={styles.metricsContainer}>
          <PulsateButton
            onPress={() => handleToggleAction("like")}
            disabled={isLikeToggling}
            style={styles.flexRow}
          >
            {post.is_liked ? (
              <Ionicons name="heart" size={25} style={styles.liked} />
            ) : (
              <Ionicons name="heart-outline" size={25} style={styles.white} />
            )}
            {post.like_count > 0 && (
              <Text style={styles.metricText}>{post.like_count}</Text>
            )}
          </PulsateButton>

          <PulsateButton
            onPress={() => setShowComments(true)}
            style={styles.flexRow}
          >
            <Ionicons
              name="chatbubble-outline"
              size={25}
              style={styles.white}
            />
            {post.comment_count > 0 && (
              <Text style={styles.metricText}>{post.comment_count}</Text>
            )}
          </PulsateButton>
        </View>
        <PulsateButton
          onPress={() => handleToggleAction("bookmark")}
          disabled={isBookmarkToggling}
        >
          {post.is_bookmarked ? (
            <Ionicons name="bookmark" size={25} style={styles.bookmarked} />
          ) : (
            <Ionicons name="bookmark-outline" size={25} style={styles.white} />
          )}
        </PulsateButton>
      </View>
      <View style={styles.captionContainer}>
        {post.caption && <Text style={styles.white}>{post.caption}</Text>}
        <Text style={styles.time}>{formatRelativeTime(post.created_at)}</Text>
      </View>

      <CommentsModal
        isVisible={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
      />
      <ConfirmationModal
        isVisible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  metricsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tagsContainer: {
    paddingHorizontal: 15,
    marginTop: -5,
  },
  tagsContent: {
    gap: 10,
    flexDirection: "row",
  },
  tagWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  gameTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.buttonBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gameTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  categoryTag: {
    backgroundColor: COLORS.buttonBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  profileImage: {
    width: 25,
    height: 25,
    borderRadius: 50,
  },
  name: {
    fontWeight: "bold",
    color: COLORS.text,
  },
  metricText: {
    color: COLORS.text,
    fontSize: 15,
  },
  liked: {
    color: COLORS.liked,
  },
  bookmarked: {
    color: COLORS.bookmarked,
  },
  white: {
    color: COLORS.text,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
  },
  time: {
    color: COLORS.gray,
    fontSize: 12,
  },
  captionContainer: {
    marginTop: -3,
    paddingHorizontal: 15,
    gap: 5,
  },
});
