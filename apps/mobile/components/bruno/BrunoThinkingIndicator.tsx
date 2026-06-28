import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import {
  BRUNO_PROMINENT_VERB,
  type BrunoThinkingPhaseVerb,
} from '@/lib/bruno/brunoThinkingPhrases';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface BrunoThinkingIndicatorProps {
  prefix: string;
  verbText: string;
  verb: BrunoThinkingPhaseVerb;
  color: string;
  brandColor?: string;
}

export function BrunoThinkingIndicator({
  prefix,
  verbText,
  verb,
  color,
  brandColor,
}: BrunoThinkingIndicatorProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const isCooking = verb === BRUNO_PROMINENT_VERB;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: reducedMotion ? 1800 : 1200,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? interpolate(progress.value, [0, 0.5, 1], [0.45, 1, 0.45])
      : interpolate(progress.value, [0, 0.4, 0.5, 0.6, 1], [0.4, 0.7, 1, 0.7, 0.4]),
  }));

  return (
    <View
      style={styles.row}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      accessibilityLabel={`${prefix} ${verbText}`}
    >
      <Text style={[styles.text, { color }]}>{prefix}</Text>
      <AnimatedText
        style={[
          styles.text,
          { color: isCooking && brandColor ? brandColor : color },
          isCooking && styles.prominent,
          animatedStyle,
        ]}
      >
        {verbText}
      </AnimatedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.15,
  },
  prominent: {
    fontWeight: '600',
  },
});
