// components/FloatingWatch.tsx
import React, { useEffect, useRef } from "react";
import { ViewStyle, StyleProp, Animated, Easing, DimensionValue } from "react-native";
import { Image, ImageSource } from "expo-image";

type BaseProps = {
    source: ImageSource;
    /** Width in pixels or percent; combine with aspectRatio if needed */
    width: DimensionValue;
    aspectRatio?: number;           // default 1
    /** Container positioning; keep absolute here */
    containerStyle?: StyleProp<ViewStyle>;
    /** Peak vertical float distance in px */
    floatPx?: number;               // default 15
    /** Rotation swing total range in deg (e.g., 5 = -2.5..+2.5) */
    rotateRangeDeg?: number;        // default 5
    /** One full up+down loop duration in ms */
    durationMs?: number;            // default 2800
    /** Start phase delay */
    delayMs?: number;               // default 0
    /** Direction bias: "left" starts at -half range, "right" starts at +half */
    side?: "left" | "right";        // default "left"
};

export  const  FloatingWatch: React.FC<BaseProps> = ({
    source,
    width,
    aspectRatio = 1,
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

    // side decides initial sign; rotateRangeDeg is full swing (±half each way)
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
                style={{ width, aspectRatio }}
                // important to keep renders cheap
                contentFit="cover"
                transition={0}
            />
        </Animated.View>
    );
};

// Convenience wrappers with defaults for your screen
export const FloatingWatchLeft: React.FC<
    Omit<BaseProps, "side"> & { side?: never }
> = (props) => <FloatingWatch side="left" {...props} />;

export const FloatingWatchRight: React.FC<
    Omit<BaseProps, "side"> & { side?: never }
> = (props) => <FloatingWatch side="right" {...props} />;
