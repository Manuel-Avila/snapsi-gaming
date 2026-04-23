import Loader from "@/components/Loader";
import PostsContainer from "@/components/PostsContainer";
import ProfileInformation from "@/components/ProfileInformation";
import PulsateButton from "@/components/ui/PulsateButton";
import { COLORS } from "@/constants/theme";
import { usePost } from "@/hooks/usePost";
import { useUser } from "@/hooks/useUser";
import { useUserMutations } from "@/hooks/useUserMutations";
import { IPost } from "@/types/PostTypes";
import type { IUserProfile } from "@/types/UserTypes";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useInfiniteQuery, useQuery, useQueryClient } from "react-query";
import RatingsContainer from "@/components/RatingsContainer";
import { useGames } from "@/hooks/useGames";
import type { IGameReview } from "@/types/GameTypes";

export default function Profile() {
  const { getProfile } = useUser();
  const { handleFollow, handleUnfollow, isFollowing, isUnfollowing } =
    useUserMutations();
  const { username: usernameValue } = useLocalSearchParams();
  const { getUserPosts } = usePost();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getUserReviews } = useGames();
  const [activeTab, setActiveTab] = useState<"posts" | "ratings">("posts");

  const username =
    typeof usernameValue === "string"
      ? usernameValue
      : usernameValue?.[0] || "";

  useEffect(() => {
    const currentUser: IUserProfile | undefined =
      queryClient.getQueryData("myProfile");
    if (username === currentUser?.username) {
      router.replace("/(tabs)/profile");
    }
  }, [username, queryClient, router]);

  const { data: profileInfo, isLoading: isProfileLoading } = useQuery(
    ["user", username],
    getProfile,
    {
      enabled: !!username,
    }
  );
  const {
    data: postsData,
    isLoading: arePostsLoading,
    hasNextPage: postsHasNextPage,
    fetchNextPage: fetchPostsNextPage,
    isFetchingNextPage: arePostsFetchingNextPage,
    refetch: refetchPosts,
    isFetching: arePostsFetching,
  } = useInfiniteQuery(["posts", username], getUserPosts, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!username && activeTab === "posts",
  });

  const {
    data: reviewsData,
    isLoading: areReviewsLoading,
    hasNextPage: reviewsHasNextPage,
    fetchNextPage: fetchReviewsNextPage,
    isFetchingNextPage: areReviewsFetchingNextPage,
    refetch: refetchReviews,
    isFetching: areReviewsFetching,
  } = useInfiniteQuery(["gameReviews", username], getUserReviews, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!username && activeTab === "ratings",
    refetchOnWindowFocus: false,
  });

  const handleRefetch = async () => {
    if (activeTab === "posts") {
      refetchPosts();
    } else {
      refetchReviews();
    }
  };

  const posts: IPost[] = postsData?.pages?.flatMap((page) => page.posts) ?? [];
  const reviews: IGameReview[] = reviewsData?.pages?.flatMap((page) => page.reviews) ?? [];



  if (isProfileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PulsateButton
        onPress={() => router.back()}
        style={styles.arrowBackContainer}
        scaleOnPress={0.7}
      >
        <Ionicons name="arrow-back-outline" style={styles.icon} />
      </PulsateButton>
      <Text style={styles.title}>{profileInfo?.username}</Text>
      <ProfileInformation profileInfo={profileInfo} />
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "posts" && styles.activeTab]}
          onPress={() => setActiveTab("posts")}
        >
          <Text style={[styles.tabText, activeTab === "posts" && styles.activeTabText]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ratings" && styles.activeTab]}
          onPress={() => setActiveTab("ratings")}
        >
          <Text style={[styles.tabText, activeTab === "ratings" && styles.activeTabText]}>
            Ratings
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.flex}>
        {activeTab === "posts" ? (
          <PostsContainer
            data={posts}
            refetch={handleRefetch}
            fetchNextPage={fetchPostsNextPage}
            hasNextPage={postsHasNextPage}
            isLoading={arePostsLoading}
            isFetchingNextPage={arePostsFetchingNextPage}
            isFetching={arePostsFetching}
            noDataIcon="camera-outline"
            noDataMessage="No posts yet"
          />
        ) : (
          <RatingsContainer
            data={reviews}
            refetch={handleRefetch}
            fetchNextPage={fetchReviewsNextPage}
            isLoading={areReviewsLoading}
            hasNextPage={reviewsHasNextPage}
            isFetchingNextPage={areReviewsFetchingNextPage}
            isFetching={areReviewsFetching}
            noDataIcon="game-controller-outline"
            noDataMessage="No ratings yet"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
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
    fontSize: 30,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
  },
  flex: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.buttonBackground,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.gray,
    fontWeight: "bold",
  },
  activeTabText: {
    color: COLORS.primary,
  },
});
