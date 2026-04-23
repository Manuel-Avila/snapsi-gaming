import Loader from "@/components/Loader";
import NoItems from "@/components/NoItems";
import NotificationCard from "@/components/Notification";
import { COLORS } from "@/constants/theme";
import { useNotification } from "@/hooks/useNotification";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { useInfiniteQuery } from "react-query";

export default function Notifications() {
  const [isMannuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const { getMyNotifications } = useNotification();
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery("notifications", getMyNotifications, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 2,
  });

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];

  const handleRefresh = async () => {
    setIsManuallyRefreshing(true);
    await refetch();
    setIsManuallyRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.flex}>
        <FlatList
          data={notifications}
          renderItem={({ item }) => <NotificationCard notification={item} />}
          keyExtractor={(item) => JSON.stringify(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationContainer}
          ListEmptyComponent={
            isLoading ? (
              <Loader />
            ) : (
              <NoItems
                icon="notifications-off-outline"
                message="No notifications yet."
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isMannuallyRefreshing}
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
  notificationContainer: {
    paddingHorizontal: 13,
    gap: 15,
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
});
