import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { ChevronDown, CheckCircle2, Circle, XCircle } from 'lucide-react-native';
import type { BrunoProgressStep } from '@/lib/bruno/bruno-progress';
import { PlanevoLogoSpinner } from '@/components/bruno/PlanevoLogoSpinner';

interface BrunoActivityPanelProps {
  steps: BrunoProgressStep[];
  summary: string | null;
  isExpanded: boolean;
  isWorking: boolean;
  onToggle: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    brand: string;
    sage: string;
    rose: string;
  };
}

function StepIcon({
  status,
  colors,
}: {
  status: BrunoProgressStep['status'];
  colors: BrunoActivityPanelProps['colors'];
}) {
  switch (status) {
    case 'done':
      return <CheckCircle2 size={16} color={colors.sage} />;
    case 'error':
      return <XCircle size={16} color={colors.rose} />;
    case 'active':
      return <Circle size={12} color={colors.brand} fill={colors.brand} />;
    case 'pending':
    default:
      return <Circle size={12} color={colors.textMuted} />;
  }
}

export function BrunoActivityPanel({
  steps,
  summary,
  isExpanded,
  isWorking,
  onToggle,
  colors,
}: BrunoActivityPanelProps) {
  if (!isWorking && steps.length === 0) {
    return null;
  }

  const headline = summary ?? 'Working on your request';

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onToggle}
        style={[
          styles.header,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        {isWorking ? (
          <PlanevoLogoSpinner color={colors.brand} />
        ) : (
          <CheckCircle2 size={20} color={colors.sage} />
        )}
        <Text style={[styles.summary, { color: colors.text }]} numberOfLines={2}>
          {headline}
        </Text>
        <ChevronDown
          size={18}
          color={colors.textMuted}
          style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {isExpanded && steps.length > 0 && (
        <View
          style={[
            styles.stepsContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {steps.map((step) => (
            <View key={step.id} style={styles.stepRow}>
              <StepIcon status={step.status} colors={colors} />
              <View style={styles.stepText}>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color:
                        step.status === 'active' ? colors.text : colors.textMuted,
                      fontWeight: step.status === 'active' ? '600' : '400',
                    },
                  ]}
                >
                  {step.label}
                </Text>
                {step.detail ? (
                  <Text style={[styles.stepDetail, { color: colors.textMuted }]}>
                    {step.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summary: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  stepsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
});
