import React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';

let LiquidGlassView: React.ComponentType<ViewProps & { interactive?: boolean; effect?: string }> | null =
  null;
let isLiquidGlassSupported = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const liquidGlass = require('@callstack/liquid-glass');
  LiquidGlassView = liquidGlass.LiquidGlassView;
  isLiquidGlassSupported = liquidGlass.isLiquidGlassSupported ?? false;
} catch {
  // Native module not linked — use blur fallback
}

interface GlassSurfaceProps extends ViewProps {
  interactive?: boolean;
  children?: React.ReactNode;
}

export function GlassSurface({
  style,
  interactive = false,
  children,
  ...props
}: GlassSurfaceProps) {
  const { isDark, colors } = useTheme();

  if (Platform.OS === 'ios' && isLiquidGlassSupported && LiquidGlassView) {
    return (
      <LiquidGlassView
        interactive={interactive}
        effect="regular"
        style={[styles.base, style]}
        {...props}
      >
        {children}
      </LiquidGlassView>
    );
  }

  return (
    <View style={[styles.base, { overflow: 'hidden' }, style]} {...props}>
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.glass ?? (isDark ? 'rgba(60,61,55,0.55)' : 'rgba(243,228,201,0.72)'),
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(236, 223, 204, 0.12)',
  },
});
