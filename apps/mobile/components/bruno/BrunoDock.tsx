import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Mic, Paperclip } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';

const TAB_BAR_HEIGHT = 56;

export function BrunoDock() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const isOnChat = pathname?.includes('chat');

  if (isOnChat) return null;

  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom + 8;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <Pressable
        onPress={() => router.push('/(tabs)/chat')}
        accessibilityRole="button"
        accessibilityLabel="Open Bruno"
      >
        <GlassSurface style={styles.bar} interactive>
          <View style={styles.row}>
            <Text style={[styles.emoji, { color: colors.tint }]}>🐻</Text>
            <Paperclip size={16} color={colors.textMuted} />
            <Text style={[styles.placeholder, { color: colors.textMuted }]} numberOfLines={1}>
              Ask Bruno anything…
            </Text>
            <View style={[styles.mic, { backgroundColor: Colors.v4.accentWarm }]}>
              <Mic size={16} color={Colors.v4.accentCream} />
            </View>
          </View>
        </GlassSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  bar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 18,
  },
  placeholder: {
    flex: 1,
    fontSize: 14,
  },
  mic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
