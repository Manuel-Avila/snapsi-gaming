import Loader from "@/components/Loader";
import EditProfileModal from "@/components/Modals/EditProfileModal";
import PostsContainer from "@/components/PostsContainer";
import ProfileInformation from "@/components/ProfileInformation";
import PulsateButton from "@/components/ui/PulsateButton";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { getUserPostsFromDb } from "@/hooks/useOfflinePosts";
import { getUserReviewsFromDb } from "@/hooks/useOfflineReviews";
import { useProfile } from "@/hooks/useProfile";
import { IPost } from "@/types/PostTypes";
import type { IUserProfile } from "@/types/UserTypes";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useInfiniteQuery, useQuery, useQueryClient } from "react-query";
import RatingsContainer from "@/components/RatingsContainer";
import type { IGameReview } from "@/types/GameTypes";

export default function Profile() {
  const { getMyProfile } = useProfile();
  const { logout } = useAuth();
  const { triggerSync, isDbReady } = useOffline();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "ratings">("posts");
  const { data: myProfile, isLoading: isProfileLoading } =
    useQuery<IUserProfile>(["myProfile"], getMyProfile);
  const queryClient = useQueryClient();

  const {
    data: postsData,
    isLoading: arePostsLoading,
    hasNextPage: postsHasNextPage,
    fetchNextPage: fetchPostsNextPage,
    isFetchingNextPage: arePostsFetchingNextPage,
    refetch: refetchPosts,
    isFetching: arePostsFetching,
  } = useInfiniteQuery(["posts", myProfile?.username || ""], getUserPostsFromDb, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!myProfile?.username && isDbReady,
    refetchOnWindowFocus: false,
  });

  const {
    data: reviewsData,
    isLoading: areReviewsLoading,
    hasNextPage: reviewsHasNextPage,
    fetchNextPage: fetchReviewsNextPage,
    isFetchingNextPage: areReviewsFetchingNextPage,
    refetch: refetchReviews,
    isFetching: areReviewsFetching,
  } = useInfiniteQuery(["gameReviews", myProfile?.username || ""], getUserReviewsFromDb, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!myProfile?.username && activeTab === "ratings" && isDbReady,
    refetchOnWindowFocus: false,
  });

  const handleRefetch = async () => {
    await triggerSync();
    if (activeTab === "posts") {
      refetchPosts();
    } else {
      refetchReviews();
    }
    queryClient.invalidateQueries(["myProfile"]);
  };

  const handleOpenEditModal = () => setIsEditModalVisible(true);
  const handleCloseEditModal = () => setIsEditModalVisible(false);

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
      <View style={styles.header}>
        <Text style={styles.title}>{myProfile?.username}</Text>
        <PulsateButton onPress={logout}>
          <Ionicons name="log-out-outline" style={styles.logoutIcon} />
        </PulsateButton>
      </View>
      <ProfileInformation profileInfo={myProfile} />
      <PulsateButton style={styles.editButton} onPress={handleOpenEditModal}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </PulsateButton>

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
            isLoading={arePostsLoading}
            hasNextPage={postsHasNextPage}
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

      <EditProfileModal
        isVisible={isEditModalVisible}
        onClose={handleCloseEditModal}
        profileData={myProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    gap: 20,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  logoutIcon: {
    color: COLORS.text,
    fontSize: 24,
  },
  editButton: {
    marginHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: COLORS.buttonBackground,
  },
  editButtonText: {
    color: COLORS.text,
    textAlign: "center",
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
  flex: {
    flex: 1,
  },
});
