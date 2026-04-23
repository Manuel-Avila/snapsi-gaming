import { StyleSheet, Text, View } from "react-native";
import { Modal } from "../ui/Modal";
import { COLORS } from "@/constants/theme";
import PulsateButton from "../ui/PulsateButton";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
};

export default function ConfirmationModal({
  isVisible,
  onClose,
  onConfirm,
  title,
  message,
}: Props) {
  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      style={styles.modal}
      contentContainerStyle={styles.container}
      animationDuration={200}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttonsContainer}>
        <PulsateButton
          onPress={onClose}
          scaleOnPress={0.85}
          style={styles.button}
        >
          <Text style={[styles.buttonText]}>Cancel</Text>
        </PulsateButton>
        <PulsateButton
          onPress={onConfirm}
          scaleOnPress={0.85}
          style={styles.button}
        >
          <Text style={[styles.buttonText, styles.confirmButtonText]}>
            Confirm
          </Text>
        </PulsateButton>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  container: {
    maxWidth: 300,
    backgroundColor: COLORS.commentsBackground,
    padding: 20,
    gap: 20,
    borderRadius: 15,
  },
  title: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
  message: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: "center",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonText: {
    textAlign: "center",
    fontSize: 16,
    color: COLORS.text,
  },
  confirmButtonText: {
    color: COLORS.primary,
  },
});
