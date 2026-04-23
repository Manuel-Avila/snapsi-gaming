import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, StyleSheet } from "react-native";
import { BaseToastProps } from "react-native-toast-message";

export const toastConfig = {
  success: (props: BaseToastProps) => <SuccessToast {...props} />,
  error: (props: BaseToastProps) => <ErrorToast {...props} />,
};

function SuccessToast({ text1, text2 }: BaseToastProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{text1}</Text>
        <Text style={styles.text2}>{text2}</Text>
      </View>
    </View>
  );
}

function ErrorToast({ text1, text2 }: BaseToastProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={24} color={COLORS.text} />
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{text1}</Text>
        <Text style={styles.text2}>{text2}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "80%",
    backgroundColor: COLORS.toastBackground,
    borderRadius: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  textContainer: {
    flexShrink: 1,
  },
  text1: {
    fontSize: 16,
    color: COLORS.text,
  },
  text2: {
    fontSize: 14,
    color: COLORS.gray,
  },
});
