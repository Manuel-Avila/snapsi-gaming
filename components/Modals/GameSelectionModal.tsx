import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import PulsateButton from "../ui/PulsateButton";
import { Modal } from "../ui/Modal";
import { useGames } from "@/hooks/useGames";
import { useQuery } from "react-query";
import type { IGameCategory, IRawgGame } from "@/types/GameTypes";
import { Image } from "expo-image";
import Toast from "react-native-toast-message";
import * as NetworkService from "@/services/networkService";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilter: (filter: { category?: string; gameId?: number; gameName?: string; gameImage?: string } | null) => void;
  title?: string;
  showToastOnSelect?: boolean;
  showClearButton?: boolean;
};

export default function GameSelectionModal({ isVisible, onClose, onApplyFilter, title = "Select Game/Category", showToastOnSelect = false, showClearButton = true }: Props) {
  const safeAreaInsets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"category" | "game">("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { getCategories, searchGames } = useGames();
  const isOnline = NetworkService.isOnline();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: categories, isLoading: isLoadingCategories } = useQuery<{ results: IGameCategory[] }>(
    ["gameCategories"],
    getCategories,
    { enabled: isVisible && activeTab === "category" }
  );

  const { data: searchResults, isLoading: isLoadingGames } = useQuery(
    ["gamesSearch", debouncedSearch],
    () => searchGames(debouncedSearch),
    { enabled: isVisible && activeTab === "game" }
  );

  const handleSelectCategory = (category: IGameCategory) => {
    onApplyFilter({ category: category.name });
    setSearchQuery("");
    setDebouncedSearch("");
    if (showToastOnSelect) {
      Toast.show({ type: "success", text1: "Tag Added", text2: category.name, visibilityTime: 1500 });
    }
    onClose();
  };

  const handleSelectGame = (game: IRawgGame) => {
    onApplyFilter({ gameId: game.id, gameName: game.name, gameImage: game.background_image });
    setSearchQuery("");
    setDebouncedSearch("");
    if (showToastOnSelect) {
      Toast.show({ type: "success", text1: "Tag Added", text2: game.name, visibilityTime: 1500 });
    }
    onClose();
  };

  const handleClearFilter = () => {
    onApplyFilter(null);
    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      backdropOpacity={0.5}
      style={styles.modal}
      contentContainerStyle={styles.container}
    >
      <View style={styles.center}>
        <View style={styles.topBar} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "category" && styles.activeTab]}
          onPress={() => setActiveTab("category")}
        >
          <Text style={[styles.tabText, activeTab === "category" && styles.activeTabText]}>
            Category
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "game" && styles.activeTab]}
          onPress={() => setActiveTab("game")}
        >
          <Text style={[styles.tabText, activeTab === "game" && styles.activeTabText]}>
            Specific Game
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === "category" ? (
          isLoadingCategories ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <FlatList
              data={categories?.results || []}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => handleSelectCategory(item)}
                >
                  <Text style={styles.listText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {isOnline
                    ? "No categories available"
                    : "No cached categories yet. Connect once to sync categories."}
                </Text>
              }
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a game..."
                placeholderTextColor={COLORS.gray}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {isLoadingGames ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchResults?.results || []}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.gameListItem}
                    onPress={() => handleSelectGame(item)}
                  >
                    <Image
                      source={{ uri: item.background_image }}
                      style={styles.gameImage}
                      contentFit="cover"
                    />
                    <Text style={styles.listText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {isOnline
                      ? "No games found"
                      : "No cached games yet. Connect once and search to build offline cache."}
                  </Text>
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>

      {showClearButton && (
        <PulsateButton
          onPress={handleClearFilter}
          style={[styles.clearButton, { marginBottom: safeAreaInsets.bottom + 8 }]}
        >
          <Text style={styles.clearButtonText}>Clear Filter</Text>
        </PulsateButton>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    padding: 15,
    gap: 10,
    width: "100%",
    height: "80%",
    backgroundColor: COLORS.commentsBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  center: {
    alignItems: "center",
    gap: 10,
  },
  topBar: {
    height: 4,
    backgroundColor: COLORS.gray,
    width: 40,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
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
  content: {
    flex: 1,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.buttonBackground,
  },
  gameListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.buttonBackground,
    gap: 15,
  },
  gameImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  listText: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    color: COLORS.text,
    fontSize: 16,
  },
  clearButton: {
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: COLORS.buttonBackground,
    alignItems: "center",
  },
  clearButtonText: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyText: {
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 12,
  },
});
