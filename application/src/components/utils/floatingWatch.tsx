// components/FloatingWatch.tsx
import React, { useEffect, useRef } from "react";
import {
  ViewStyle,
  StyleProp,
  Animated,
  Easing,
  DimensionValue,
  Image,
  ImageSourcePropType,
} from "react-native";
type BaseProps = {
  source: ImageSourcePropType;
  size: number;                       // <— instead of width
  containerStyle?: StyleProp<ViewStyle>;
  floatPx?: number;
  rotateRangeDeg?: number;
  durationMs?: number;
  delayMs?: number;
  side?: "left" | "right";
};

export const FloatingWatch: React.FC<BaseProps> = ({
  source,
  size,
  containerStyle,
  floatPx = 15,
  rotateRangeDeg = 5,
  durationMs = 2800,
  delayMs = 0,
  side = "left",
}) => {
  const prog = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(prog, {
        toValue: 1,
        duration: durationMs / 2,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
        delay: delayMs,
      }),
      Animated.timing(prog, {
        toValue: 0,
        duration: durationMs / 2,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    const loop = Animated.loop(seq, { resetBeforeIteration: true });
    loop.start();
    return () => loop.stop();
  }, [prog, durationMs, delayMs]);

  const translateY = prog.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -floatPx],
  });

  const half = rotateRangeDeg / 2;
  const start = side === "left" ? -half : half;
  const end = -start;

  const rotate = prog.interpolate({
    inputRange: [0, 1],
    outputRange: [`${start}deg`, `${end}deg`],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", transform: [{ translateY }, { rotate }] },
        containerStyle,
      ]}
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

export const FloatingWatchLeft: React.FC<
  Omit<BaseProps, "side"> & { side?: never }
> = (props) => <FloatingWatch side="left" {...props} />;

export const FloatingWatchRight: React.FC<
  Omit<BaseProps, "side"> & { side?: never }
> = (props) => <FloatingWatch side="right" {...props} />;
