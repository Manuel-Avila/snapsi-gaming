import { COLORS } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

type props = {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
};

export default function NoItems({ icon, message }: props) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Ionicons name={icon} size={60} color={COLORS.gray} />
      <Text style={{ color: COLORS.gray, fontSize: 13 }}>{message}</Text>
    </View>
  );
}
