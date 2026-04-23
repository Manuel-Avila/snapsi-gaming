import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import NoItems from "./NoItems";
import { IPost } from "@/types/PostTypes";
import { Link } from "expo-router";
import Loader from "./Loader";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useState } from "react";

type Props = {
  data: IPost[];
  refetch: () => Promise<any>;
  hasNextPage: boolean | undefined;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isFetching: boolean;
  noDataIcon: keyof typeof Ionicons.glyphMap;
  noDataMessage: string;
};

const numColumns = 3;
const imageMargin = 1;
const imageWidth =
  (Dimensions.get("window").width - imageMargin * (numColumns + 1)) /
  numColumns;

export default function PostsContainer({
  data,
  refetch,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  fetchNextPage,
  isFetching,
  noDataIcon,
  noDataMessage,
}: Props) {
  const [isMannuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManuallyRefreshing(true);
    await refetch();
    setIsManuallyRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: "/post/[id]", params: { id: item.id } }}
            asChild
          >
            <TouchableOpacity activeOpacity={0.8}>
              <Image
                style={styles.postImage}
                source={{
                  uri: item.image_url,
                }}
                cachePolicy="memory-disk"
                transition={500}
                contentFit="cover"
              />
            </TouchableOpacity>
          </Link>
        )}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={
          isLoading ? (
            <Loader />
          ) : (
            <NoItems icon={noDataIcon} message={noDataMessage} />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  postImage: {
    width: imageWidth,
    aspectRatio: 1,
    margin: imageMargin,
  },
});
