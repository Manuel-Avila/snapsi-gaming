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
import type { IGameReview } from "@/types/GameTypes";
import Loader from "./Loader";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useState } from "react";
import ReviewModal from "./Modals/ReviewModal";
import { useQueryClient } from "react-query";
import type { IUserProfile } from "@/types/UserTypes";

type Props = {
  data: IGameReview[];
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

export default function RatingsContainer({
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
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<IGameReview | null>(null);
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<IUserProfile>("myProfile");

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
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedReview(item)}
          >
            <Image
              style={styles.postImage}
              source={{
                uri: item.game_image,
              }}
              cachePolicy="memory-disk"
              transition={500}
              contentFit="cover"
            />
          </TouchableOpacity>
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
      {selectedReview && (
        <ReviewModal
          isVisible={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          gameId={selectedReview.game_id}
          gameName={selectedReview.game_name}
          gameImage={selectedReview.game_image}
          existingReview={selectedReview}
          readOnly={currentUser?.username !== selectedReview.user.username}
        />
      )}
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
