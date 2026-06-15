import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';

export type MobileBrunoUpgradeCard = {
  type: 'bruno_upgrade_card';
  title: string;
  body: string;
  bullets: string[];
  ctaText: string;
};

export type MobileBrunoProWarning = {
  type: 'bruno_pro_warning';
  title: string;
  body: string;
  remaining: number;
};

export type MobileBrunoProCap = {
  type: 'bruno_pro_cap';
  title: string;
  body: string;
};

export type MobileBrunoMetadata = {
  upgradeCard?: MobileBrunoUpgradeCard | null;
  proWarning?: MobileBrunoProWarning | null;
  proCap?: MobileBrunoProCap | null;
};

type BrunoEntitlementNoticeProps = {
  metadata?: MobileBrunoMetadata;
  onUpgrade: () => void;
};

export default function BrunoEntitlementNotice({
  metadata,
  onUpgrade,
}: BrunoEntitlementNoticeProps) {
  const notice =
    metadata?.upgradeCard ?? metadata?.proWarning ?? metadata?.proCap;

  if (!notice) return null;

  return (
    <View
      style={{
        gap: 6,
        marginBottom: 10,
        padding: 12,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(92, 64, 51, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(92, 64, 51, 0.2)',
      }}
      testID="bruno-entitlement-notice"
    >
      <Text selectable style={{ fontSize: 13, fontWeight: '800' }}>
        {notice.title}
      </Text>
      <Text selectable style={{ fontSize: 12, lineHeight: 18 }}>
        {notice.body}
      </Text>
      {notice.type === 'bruno_upgrade_card' && (
        <>
          {notice.bullets.map((bullet) => (
            <Text selectable key={bullet} style={{ fontSize: 12 }}>
              • {bullet}
            </Text>
          ))}
          <TouchableOpacity
            onPress={onUpgrade}
            style={{
              alignSelf: 'flex-start',
              marginTop: 4,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: Colors.brand[600],
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
              {notice.ctaText}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
