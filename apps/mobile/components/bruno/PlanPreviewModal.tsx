import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, X, Zap, BatteryCharging, Leaf, Check, Send } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import type { PlanDraftItemData } from './PlanDraftCard';

interface PlanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  planObjective: string;
  items: PlanDraftItemData[];
  onApprove: (options: { syncToGoogle: boolean; createTasks: boolean; blockCalendar: boolean }) => void;
  onRequestEdit: (feedback: string) => void;
  isCommitting?: boolean;
  hasGoogleCalendar?: boolean;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function EnergyBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { icon: Zap, label: 'High', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
    medium: { icon: BatteryCharging, label: 'Med', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
    low: { icon: Leaf, label: 'Low', color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' },
  };
  const c = config[level];
  const Icon = c.icon;

  return (
    <View style={[styles.energyBadge, { backgroundColor: c.bg, borderColor: c.color }]}>
      <Icon size={10} color={c.color} />
      <Text style={[styles.energyText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

export default function PlanPreviewModal({
  isOpen,
  onClose,
  planTitle,
  planObjective,
  items,
  onApprove,
  onRequestEdit,
  isCommitting = false,
  hasGoogleCalendar = false,
}: PlanPreviewModalProps) {
  const { colors, isDark } = useTheme();
  const [feedback, setFeedback] = useState('');
  const [createTasks, setCreateTasks] = useState(true);
  const [blockCalendar, setBlockCalendar] = useState(true);
  const [syncToGoogle, setSyncToGoogle] = useState(hasGoogleCalendar);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const itemsByDate = items.reduce<Record<string, PlanDraftItemData[]>>((acc, item) => {
    const date = formatDate(item.start_time);
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const handleEditSubmit = () => {
    if (!feedback.trim()) return;
    onRequestEdit(feedback);
    setFeedback('');
    onClose();
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#1e1712' : '#fff' }]}>
        <View style={[styles.header, { backgroundColor: isDark ? '#2c221a' : Colors.surface[100], borderBottomColor: isDark ? '#3e3227' : colors.separator }]}>
          <View style={styles.headerLeft}>
            <Calendar color={Colors.brand[500]} size={24} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{planTitle}</Text>
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>DRAFT</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.objective, { color: colors.textMuted }]}>{planObjective}</Text>
          
          <View style={styles.timeline}>
            {Object.entries(itemsByDate).map(([date, dateItems]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateLabel}>{date}</Text>
                {dateItems.map((item, index) => {
                  const globalIndex = items.indexOf(item);
                  const isExpanded = expandedIndex === globalIndex;
                  return (
                    <View key={index} style={styles.timelineItem}>
                      <View style={styles.timelineLine}>
                        <View style={[styles.timelineDot, { backgroundColor: item.energy_level === 'high' ? '#f87171' : item.energy_level === 'medium' ? '#fbbf24' : '#34d399' }]} />
                        <View style={styles.timelineLineTail} />
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.itemCard} 
                        onPress={() => setExpandedIndex(isExpanded ? null : globalIndex)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemTime}>{formatTime(item.start_time)} – {formatTime(item.end_time)}</Text>
                            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                          </View>
                          <EnergyBadge level={item.energy_level} />
                        </View>

                        {isExpanded && (
                          <View style={styles.itemDetails}>
                            <Text style={styles.detailsLabel}>HOW TO EXECUTE</Text>
                            <Text style={[styles.detailsText, { color: colors.text }]}>{item.execution_description}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={[styles.settingsPanel, { backgroundColor: isDark ? '#2c221a' : Colors.surface[50], borderColor: isDark ? '#3e3227' : colors.separator }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Execution Preferences</Text>
            
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Create as Tasks in Backlog</Text>
              <Switch value={createTasks} onValueChange={setCreateTasks} trackColor={{ true: Colors.brand[500] }} />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Block Time on Calendar</Text>
              <Switch value={blockCalendar} onValueChange={setBlockCalendar} trackColor={{ true: Colors.brand[500] }} />
            </View>

            {blockCalendar && hasGoogleCalendar && (
              <View style={[styles.settingRow, { paddingLeft: 16 }]}>
                <Text style={[styles.settingLabel, { color: colors.text, fontSize: 13 }]}>Sync to Google Calendar</Text>
                <Switch value={syncToGoogle} onValueChange={setSyncToGoogle} trackColor={{ true: '#60a5fa' }} />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.approveButton, (!createTasks && !blockCalendar) && { opacity: 0.5 }]}
              onPress={() => onApprove({ syncToGoogle, createTasks, blockCalendar })}
              disabled={isCommitting || (!createTasks && !blockCalendar)}
            >
              {isCommitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Check color="#fff" size={20} />
              )}
              <Text style={styles.approveButtonText}>
                {isCommitting ? 'Committing...' : 'Approve & Execute'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.settingsPanel, { backgroundColor: isDark ? '#2c221a' : Colors.surface[50], borderColor: isDark ? '#3e3227' : colors.separator }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Changes</Text>
            <View style={styles.feedbackInputContainer}>
              <TextInput
                style={[styles.feedbackInput, { color: colors.text, backgroundColor: isDark ? '#1e1712' : '#fff' }]}
                placeholder="E.g., Make the test shorter..."
                placeholderTextColor={colors.textMuted}
                value={feedback}
                onChangeText={setFeedback}
                multiline
              />
              <TouchableOpacity 
                style={[styles.feedbackSendButton, !feedback.trim() && { opacity: 0.5 }]} 
                onPress={handleEditSubmit}
                disabled={!feedback.trim() || isCommitting}
              >
                <Send size={16} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  draftBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  objective: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeline: {
    marginTop: 8,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  timelineLineTail: {
    width: 1,
    flex: 1,
    backgroundColor: '#3e3227',
    marginTop: 4,
  },
  itemCard: {
    flex: 1,
    paddingBottom: 16,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTime: {
    fontSize: 12,
    color: '#a1a1aa',
    fontFamily: 'Courier',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  energyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  energyText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  itemDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3e3227',
  },
  detailsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#a1a1aa',
    letterSpacing: 1,
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingsPanel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  approveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.brand[500],
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackInputContainer: {
    position: 'relative',
  },
  feedbackInput: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3e3227',
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  feedbackSendButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fdfbf7',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
