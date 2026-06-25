import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import type { BrunoRateLimitPayload } from '@/lib/bruno/types';
import {
  getRateLimitCopy,
  useResetCountdown,
} from '@/lib/bruno/rate-limit-client';

interface BrunoChatLimitModalProps {
  visible: boolean;
  rateLimit: BrunoRateLimitPayload;
  isDark: boolean;
  onDismiss: () => void;
  onExpired: () => void;
  onUpgrade: () => Promise<void>;
}

export function BrunoChatLimitModal({
  visible,
  rateLimit,
  isDark,
  onDismiss,
  onExpired,
  onUpgrade,
}: BrunoChatLimitModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const countdown = useResetCountdown(rateLimit.resetAt, onExpired);
  const { title, bodyPrefix } = getRateLimitCopy(rateLimit.limitType);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await onUpgrade();
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? Colors.surface[800] : Colors.surface[50],
              borderColor: isDark ? Colors.surface[600] : Colors.surface[200],
            },
          ]}
        >
          <Text style={[styles.emoji, { color: Colors.brand[500] }]}>🐻</Text>
          <Text
            style={[
              styles.title,
              { color: isDark ? Colors.surface[50] : Colors.surface[900] },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.body,
              { color: isDark ? Colors.surface[300] : Colors.surface[600] },
            ]}
          >
            {bodyPrefix}{' '}
            <Text style={styles.countdown}>{countdown}</Text>. Upgrade to Pro for
            unlimited chat with Bruno.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: Colors.brand[600] }]}
            onPress={() => void handleUpgrade()}
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Upgrade to keep chatting</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} style={styles.secondaryButton}>
            <Text
              style={[
                styles.secondaryButtonText,
                { color: isDark ? Colors.surface[400] : Colors.surface[500] },
              ]}
            >
              Maybe later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  countdown: {
    fontWeight: '700',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
