import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Props = {
  children?: React.ReactNode;
  onPress?: () => void;
  scaleOnPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PulsateButton({
  children,
  onPress,
  scaleOnPress = 0.95,
  disabled = false,
  style = {},
}: Props) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = scaleOnPress;
  };

  const onPressOut = () => {
    scale.value = 1;
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(scale.value) }],
    };
  });

  return (
    <AnimatedPressable
      style={[style, animatedStyle, { opacity: disabled ? 0.7 : 1 }]}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {children}
    </AnimatedPressable>
  );
}
