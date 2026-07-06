import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { FEATURES } from '@/lib/featureFlags';
import { MobileCommandView } from '@/components/command/MobileCommandView';

export default function CommandScreen() {
  const { colors } = useTheme();

  if (!FEATURES.PLANEVO_COMMAND) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>
          Command is not enabled yet.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MobileCommandView />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14 },
});
