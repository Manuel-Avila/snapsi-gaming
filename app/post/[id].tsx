import Loader from "@/components/Loader";
import NoItems from "@/components/NoItems";
import Post from "@/components/Post";
import PulsateButton from "@/components/ui/PulsateButton";
import { COLORS } from "@/constants/theme";
import { usePost } from "@/hooks/usePost";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "react-query";

export default function PostScreen() {
  const router = useRouter();
  const { id: idString, openComments } = useLocalSearchParams();
  const id = Number(idString);
  const { getPostById } = usePost();
  const {
    data: post,
    isLoading,
    error,
  } = useQuery(["post", id], getPostById, {
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Loader />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.container}>
        <NoItems icon="image-outline" message="Post not found." />
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
      <Text style={styles.title}>Post</Text>
      <View style={styles.flex}>
        <Post post={post} openComments={openComments === "true"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginVertical: 30,
  },
  flex: {
    flex: 1,
  },
});
