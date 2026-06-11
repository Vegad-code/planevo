import React, { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import type { CustomerInfo } from 'react-native-purchases';

import { isPro } from '@/lib/revenuecat';

export default function PaywallScreen() {
  const router = useRouter();

  const closeIfPro = useCallback(
    (customerInfo: CustomerInfo) => {
      if (isPro(customerInfo)) {
        router.back();
      }
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        options={{
          displayCloseButton: true,
        }}
        onRestoreCompleted={({ customerInfo }) => {
          closeIfPro(customerInfo);
        }}
        onRestoreError={({ error }) => {
          Alert.alert('Restore Failed', error.message);
        }}
        onPurchaseCompleted={({ customerInfo }) => {
          closeIfPro(customerInfo);
        }}
        onPurchaseError={({ error }) => {
          Alert.alert('Purchase Failed', error.message);
        }}
        onDismiss={() => {
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
