import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export interface PlanDraftItemData {
  title: string;
  start_time: string;
  end_time: string;
  energy_level: 'high' | 'medium' | 'low';
  execution_description: string;
}

interface PlanDraftCardProps {
  planTitle: string;
  planObjective: string;
  items: PlanDraftItemData[];
  onReviewPress: () => void;
  isCommitting?: boolean;
}

export default function PlanDraftCard({
  planTitle,
  planObjective,
  items,
  onReviewPress,
  isCommitting = false,
}: PlanDraftCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1e1712' : '#fff', borderColor: '#3e3227' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#2c221a' : Colors.surface[100], borderBottomColor: '#3e3227' }]}>
        <View style={styles.headerLeft}>
          <Calendar color={Colors.brand[500]} size={20} />
          <Text style={[styles.title, { color: colors.text }]}>{planTitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DRAFT</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.objective, { color: colors.textMuted }]}>{planObjective}</Text>
        
        <View style={[styles.summaryBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : Colors.surface[50] }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {items.length} tasks scheduled
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.reviewButton, { backgroundColor: Colors.brand[500] }]}
          onPress={onReviewPress}
          disabled={isCommitting}
        >
          <Text style={styles.reviewButtonText}>
            {isCommitting ? 'Committing...' : 'Review Plan'}
          </Text>
          {!isCommitting && <ChevronRight size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  body: {
    padding: 12,
    gap: 12,
  },
  objective: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryBox: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  }
});
