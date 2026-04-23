import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { Modal } from "../ui/Modal";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  imageUrl: string;
};

export default function ImageModal({ isVisible, onClose, imageUrl }: Props) {
  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      backdropOpacity={0.5}
      style={styles.modal}
      contentContainerStyle={styles.container}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        cachePolicy={"memory-disk"}
        transition={400}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
  },
  container: {
    padding: 5,
  },
  image: {
    width: "90%",
    marginHorizontal: "auto",
    overflow: "hidden",
    aspectRatio: 1,
    borderRadius: 500,
  },
});
