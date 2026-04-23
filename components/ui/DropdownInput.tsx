import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  label: string;
  error?: string | undefined;
  value: string;
  onSelect: (value: string) => void;
  options: string[];
  style?: object;
};

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

export default function DropdownInput({
  label,
  error,
  value,
  onSelect,
  options,
  style,
}: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const labelY = useSharedValue(0);
  const inputColor = useSharedValue(COLORS.gray);
  const labelFontSize = useSharedValue(16);
  const iconRotation = useSharedValue("0deg");

  const borderStyle = useAnimatedStyle(() => {
    return {
      borderColor: withTiming(inputColor.value, { duration: 250 }),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withSpring(labelY.value, { stiffness: 1200 }) },
      ],
      fontSize: withSpring(labelFontSize.value, { stiffness: 1200 }),
      color: withTiming(inputColor.value, { duration: 250 }),
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: withSpring(iconRotation.value, { stiffness: 1200 }) },
      ],
      color: withTiming(inputColor.value, { duration: 250 }),
    };
  });

  useEffect(() => {
    if (value && value.length > 0) {
      labelY.value = -20;
      labelFontSize.value = 12;
    } else {
      labelY.value = 0;
      labelFontSize.value = 16;
    }
  }, [value]);

  useEffect(() => {
    if (isDropdownOpen) {
      inputColor.value = COLORS.primary;
      iconRotation.value = "180deg";
    } else {
      inputColor.value = COLORS.gray;
      iconRotation.value = "0deg";
    }
  }, [isDropdownOpen]);

  const handleOnSelectOption = (selectedValue: string) => {
    onSelect(selectedValue);
    setIsDropdownOpen(false);
  };

  return (
    <View style={[styles.wrapper, style]}>
      <AnimatedPressable
        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
        style={[styles.inputContainer, borderStyle]}
      >
        <View style={styles.labelContainer}>
          <AnimatedText style={[styles.label, labelStyle]}>
            {label}
          </AnimatedText>
          <Text style={styles.text}>{value}</Text>
        </View>
        <AnimatedIcon name="chevron-down" style={[styles.icon, iconStyle]} />
      </AnimatedPressable>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {isDropdownOpen && (
        <>
          <Pressable style={styles.backdropOverlay} onPress={() => setIsDropdownOpen(false)} />
          <View style={styles.optionsContainer}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.optionsList}>
              {options.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleOnSelectOption(item)}
                  style={({ pressed }) => [
                    styles.optionItem,
                    pressed && styles.optionPressed,
                    item === value && styles.optionSelected,
                  ]}
                >
                  <Text style={[styles.optionText, item === value && styles.optionSelectedText]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 10,
  },
  inputContainer: {
    paddingBottom: 10,
    maxWidth: 500,
    height: 60,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  labelContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  label: {
    color: COLORS.gray,
    position: "absolute",
    left: 0,
  },
  text: {
    color: COLORS.text,
    paddingTop: 10,
    paddingBottom: 0,
    height: 25,
  },
  icon: {
    color: COLORS.gray,
    fontSize: 20,
    marginBottom: 2,
  },
  backdropOverlay: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  optionsContainer: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    borderRadius: 8,
    backgroundColor: COLORS.dropdownInput,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionsList: {
    maxHeight: 160,
  },
  optionItem: {
    padding: 15,
  },
  optionText: {
    color: COLORS.gray,
  },
  optionSelectedText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  optionPressed: {
    backgroundColor: COLORS.ripple,
  },
  optionSelected: {
    backgroundColor: COLORS.ripple,
  },
  errorText: {
    position: "absolute",
    fontSize: 12,
    bottom: -20,
    color: COLORS.error,
  },
});
