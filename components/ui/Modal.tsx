import { useEffect, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal as RNModal,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  backdropOpacity?: number;
  animationDuration?: number;
  tresholdY?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  enableKeyboardAvoiding?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(KeyboardAvoidingView);
const screenHeight = Dimensions.get("window").height;

export function Modal({
  children,
  isVisible,
  onClose,
  backdropOpacity = 0.5,
  animationDuration = 200,
  tresholdY = 150,
  style,
  contentContainerStyle,
  enableKeyboardAvoiding = true,
}: Props) {
  const [isRendered, setIsRendered] = useState(false);
  const ANIMATION_DURATION = animationDuration;

  const opacity = Math.min(Math.max(backdropOpacity, 0), 1);

  const backdropValue = useSharedValue(0);
  const translateY = useSharedValue(screenHeight);

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropValue.value,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      backdropValue.value = withTiming(opacity, {
        easing: Easing.ease,
        duration: ANIMATION_DURATION,
      });
      translateY.value = withTiming(0, {
        easing: Easing.ease,
        duration: ANIMATION_DURATION,
      });
    } else {
      backdropValue.value = withTiming(
        0,
        {
          duration: ANIMATION_DURATION,
          easing: Easing.ease,
        },
        () => {
          runOnJS(handleClose)();
        }
      );
      translateY.value = withTiming(screenHeight, {
        easing: Easing.ease,
        duration: ANIMATION_DURATION,
      });
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsRendered(false);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .onUpdate((event) => {
      const newTranslateY = event.translationY;
      if (newTranslateY > 0) {
        translateY.value = newTranslateY;
      }
    })
    .onEnd((event) => {
      if (translateY.value > tresholdY || event.velocityY > 800) {
        onClose();
      } else {
        translateY.value = withTiming(0, {
          easing: Easing.ease,
          duration: ANIMATION_DURATION,
        });
      }
    })
    .simultaneousWithExternalGesture()
    .runOnJS(true);

  return (
    <RNModal
      animationType="none"
      transparent={true}
      visible={isRendered}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[{ flex: 1 }, style]}>
          <AnimatedPressable
            style={[
              {
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "black",
              },
              backdropStyle,
            ]}
            onPress={onClose}
          />
          <GestureDetector gesture={panGesture}>
            <AnimatedView
              style={[contentContainerStyle, contentStyle]}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              enabled={enableKeyboardAvoiding}
            >
              {children}
            </AnimatedView>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </RNModal>
  );
}
