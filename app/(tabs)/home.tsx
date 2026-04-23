import Loader from "@/components/Loader";
import NoItems from "@/components/NoItems";
import Post from "@/components/Post";
import PulsateButton from "@/components/ui/PulsateButton";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePost } from "@/hooks/usePost";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router/build/hooks";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Image as RNImage } from "react-native";
import { FlatList, RefreshControl } from "react-native-gesture-handler";
import { useInfiniteQuery } from "react-query";
import GameSelectionModal from "@/components/Modals/GameSelectionModal";

export default function Home() {
  const { logout } = useAuth();
  const { getPosts } = usePost();
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { scrollToTop } = useLocalSearchParams();
  const isFocused = useIsFocused();
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filter, setFilter] = useState<{ category?: string; gameId?: number; gameName?: string } | null>(null);

  useEffect(() => {
    if (scrollToTop === "true" && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      router.setParams({ scrollToTop: undefined });
    }
  }, [isFocused, scrollToTop, router]);

  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery(["posts", filter || {}], getPosts, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
  });

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  const handleRefresh = async () => {
    setIsManuallyRefreshing(true);
    await refetch();
    setIsManuallyRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="game-controller" size={32} color={COLORS.primary} style={styles.logoIcon} />
        <PulsateButton onPress={() => setIsFilterModalVisible(true)} style={styles.filterButton}>
          <Ionicons name="filter-outline" size={24} color={COLORS.text} />
          {filter?.gameName ? (
            <Text style={styles.filterText} numberOfLines={1}>{filter.gameName}</Text>
          ) : filter?.category ? (
            <Text style={styles.filterText} numberOfLines={1}>{filter.category}</Text>
          ) : (
            <Text style={styles.filterText}>Filter</Text>
          )}
        </PulsateButton>
      </View>

      <View style={styles.flex}>
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={({ item }) => <Post post={item} />}
          keyExtractor={(item) => JSON.stringify(item.id)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.postsContainer}
          ListEmptyComponent={
            isLoading ? (
              <Loader />
            ) : (
              <NoItems icon="image-outline" message="No posts available." />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isManuallyRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              progressBackgroundColor={COLORS.background}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <Loader /> : null}
        />
      </View>

      <GameSelectionModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApplyFilter={setFilter}
        title="Filter Feed"
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
  postsContainer: {
    gap: 20,
    paddingBottom: 70,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoIcon: {
    alignSelf: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.buttonBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    maxWidth: 150,
  },
  filterText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    flexShrink: 1,
  },
  flex: {
    flex: 1,
  },
});
