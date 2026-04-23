import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import PulsateButton from "./PulsateButton";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  error?: string | undefined;
  secureTextEntry?: boolean;
  style?: object;
  keyboardType?: TextInputProps["keyboardType"];
  maxLength?: number;
  editable?: boolean;
};

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function CustomTextInput({
  value,
  onChangeText,
  label,
  error,
  secureTextEntry,
  style,
  keyboardType,
  maxLength,
  editable = true,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(!!secureTextEntry);
  const isActive = isFocused || (value && value.length > 0);

  const labelY = useSharedValue(-2);
  const labelFontSize = useSharedValue(16);
  const inputColor = useSharedValue(COLORS.gray);

  const labelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(labelY.value, { stiffness: 1200 }),
        },
      ],
      fontSize: withSpring(labelFontSize.value, { stiffness: 1200 }),
      color: withTiming(inputColor.value, { duration: 250 }),
    };
  });

  const borderStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(inputColor.value, { duration: 250 }),
    };
  });

  useEffect(() => {
    if (isActive) {
      labelY.value = -2;
      labelFontSize.value = 12;
    } else {
      labelY.value = 15;
      labelFontSize.value = 16;
    }
  }, [isActive]);

  useEffect(() => {
    if (isFocused) {
      inputColor.value = COLORS.primary;
    } else {
      inputColor.value = COLORS.gray;
    }
  }, [isFocused]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <View style={styles.flex}>
          <AnimatedText style={[styles.label, labelStyle]}>
            {label}
          </AnimatedText>
          <AnimatedTextInput
            value={value}
            onChangeText={onChangeText}
            style={[styles.input]}
            placeholderTextColor={COLORS.gray}
            secureTextEntry={isSecure}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            keyboardType={keyboardType}
            maxLength={maxLength}
            editable={editable}
          />
        </View>

        {secureTextEntry && (
          <PulsateButton
            style={styles.iconContainer}
            onPress={() => setIsSecure(!isSecure)}
          >
            {isSecure ? (
              <Ionicons name="eye-outline" style={styles.showTextIcon} />
            ) : (
              <Ionicons name="eye-off-outline" style={styles.showTextIcon} />
            )}
          </PulsateButton>
        )}
      </View>
      <AnimatedView style={[styles.border, borderStyle]} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    justifyContent: "flex-end",
  },
  input: {
    color: COLORS.text,
    fontSize: 15,
    maxWidth: 500,
    paddingTop: 10,
    paddingBottom: 0,
    height: 45,
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: COLORS.gray,
    position: "absolute",
    width: "100%",
    left: 0,
  },
  border: {
    height: 1,
  },
  iconContainer: {
    alignSelf: "flex-end",
  },
  showTextIcon: {
    margin: 5,
    marginBottom: 9,
    color: COLORS.gray,
    fontSize: 22,
  },
  flex: {
    flex: 1,
  },
  errorText: {
    position: "absolute",
    fontSize: 12,
    top: 60,
    color: COLORS.error,
  },
});
