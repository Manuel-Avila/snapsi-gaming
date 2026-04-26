import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from "react-native";
import { useInfiniteQuery } from "react-query";
import { useGames } from "@/hooks/useGames";
import { Image } from "expo-image";
import ReviewModal from "@/components/Modals/ReviewModal";
import type { IRawgGame } from "@/types/GameTypes";

const numColumns = 2;
const imageMargin = 10;
const imageWidth =
  (Dimensions.get("window").width - imageMargin * (numColumns + 1) - 30) /
  numColumns;

export default function Games() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<IRawgGame | null>(null);
  const { searchGamesInfinite } = useGames();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery(["gamesSearchInfinite", debouncedSearch], searchGamesInfinite, {
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        const match = lastPage.next.match(/page=(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      return undefined;
    },

  });

  const games = data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Games</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search games by name..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.flex}>
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : games.length === 0 ? (
          <Text style={styles.noResultsText}>No games found.</Text>
        ) : (
          <FlatList
            data={games}
            numColumns={numColumns}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gameCard}
                onPress={() => setSelectedGame(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.background_image }}
                  style={styles.gameImage}
                  contentFit="cover"
                />
                <Text style={styles.gameName} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={COLORS.primary} /> : null}
            keyboardShouldPersistTaps="handled"
            onScroll={() => Keyboard.dismiss()}
          />
        )}
      </View>

      {selectedGame && (
        <ReviewModal
          isVisible={!!selectedGame}
          onClose={() => setSelectedGame(null)}
          gameId={selectedGame.id}
          gameName={selectedGame.name}
          gameImage={selectedGame.background_image}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.buttonBackground,
    marginHorizontal: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    color: COLORS.text,
    fontSize: 16,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 70,
  },
  gameCard: {
    width: imageWidth,
    marginHorizontal: 5,
    marginBottom: 15,
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 10,
    overflow: "hidden",
  },
  gameImage: {
    width: "100%",
    height: imageWidth,
  },
  gameName: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 14,
    padding: 10,
    textAlign: "center",
  },
  noResultsText: {
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: -50,
  },
});
