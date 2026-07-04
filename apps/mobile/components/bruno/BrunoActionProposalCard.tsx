import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';

export type MobileExecutionStatus = 'idle' | 'executing' | 'success' | 'error' | 'cancelled';

export type MobileActionProposal = {
  id: string;
  type: string;
  title: string;
  description: string;
  riskLevel: string;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
};

type Props = {
  proposal: MobileActionProposal;
  executionStatus?: MobileExecutionStatus;
  executionError?: string | null;
  onConfirm: (proposal: MobileActionProposal) => void | Promise<void>;
  onCancel: (proposal: MobileActionProposal) => void;
  isDark: boolean;
};

function labelsForType(type: string) {
  switch (type) {
    case 'CREATE_TIME_BLOCK':
      return { confirm: 'Add to calendar', success: 'Event added' };
    case 'CREATE_NOTE':
    case 'UPDATE_NOTE':
    case 'APPEND_TO_NOTE':
      return { confirm: 'Save note', success: 'Note saved' };
    case 'DELETE_CALENDAR_EVENT':
      return { confirm: 'Delete event', success: 'Event deleted' };
    case 'DELETE_TASK':
      return { confirm: 'Remove task', success: 'Task removed' };
    default:
      return { confirm: 'Confirm', success: 'Done' };
  }
}

export function BrunoActionProposalCard({
  proposal,
  executionStatus = 'idle',
  executionError,
  onConfirm,
  onCancel,
  isDark,
}: Props) {
  const labels = labelsForType(proposal.type);
  const isExecuting = executionStatus === 'executing';
  const canConfirm = executionStatus === 'idle';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? Colors.surface[800] : Colors.surface[100] },
      ]}
    >
      <Text style={[styles.title, { color: isDark ? '#fff' : Colors.surface[900] }]}>
        {proposal.title}
      </Text>
      <Text style={[styles.description, { color: isDark ? Colors.surface[300] : Colors.surface[600] }]}>
        {proposal.description}
      </Text>

      {executionStatus === 'success' ? (
        <Text style={styles.success}>{labels.success}</Text>
      ) : null}
      {executionStatus === 'error' ? (
        <Text style={styles.error}>{executionError ?? 'Something went wrong.'}</Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={!canConfirm}
          onPress={() => onConfirm(proposal)}
          style={[styles.confirmBtn, !canConfirm && styles.disabledBtn]}
        >
          {isExecuting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmText}>
              {executionStatus === 'success' ? 'Executed' : labels.confirm}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onCancel(proposal)} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: isDark ? Colors.surface[300] : Colors.surface[700] }]}>
            {executionStatus === 'success' ? 'Dismiss' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  success: {
    color: Colors.success,
    fontSize: 13,
  },
  error: {
    color: Colors.error,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.brand[500],
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
