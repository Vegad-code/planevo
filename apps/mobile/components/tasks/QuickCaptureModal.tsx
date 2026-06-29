import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Animated, {
  ZoomIn,
  ZoomOut,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { ChevronDown, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  NLP_EMPTY_HINT,
  NLP_PLACEHOLDER,
  NLP_SUBMIT_LABEL,
  getGhostExample,
} from '@/lib/copy';

interface QuickCaptureModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (title: string, date: string, duration: string, priority: string) => void;
}

export default function QuickCaptureModal({ isVisible, onClose, onSubmit }: QuickCaptureModalProps) {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [explicitPriority, setExplicitPriority] = useState('Auto/Parse');
  const [explicitDuration, setExplicitDuration] = useState('');
  const [explicitDate, setExplicitDate] = useState('');
  const inputRef = useRef<TextInput>(null);
  const ghostExample = getGhostExample();

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setTitle('');
      setShowOptions(false);
      setExplicitPriority('Auto/Parse');
      setExplicitDuration('');
      setExplicitDate('');
    } else {
      Keyboard.dismiss();
    }
  }, [isVisible]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit(title.trim(), explicitDate, explicitDuration, explicitPriority);
    onClose();
  };

  const handlePriorityCycle = () => {
    const cycle = ['Auto/Parse', 'Low', 'Medium', 'High', 'Critical'];
    setExplicitPriority(cycle[(cycle.indexOf(explicitPriority) + 1) % cycle.length]);
  };

  return (
    <>
      {isVisible && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents="auto">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <TouchableWithoutFeedback onPress={onClose}>
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.45)',
                  },
                ]}
              />
            </TouchableWithoutFeedback>

            <Animated.View
              entering={ZoomIn.springify().damping(32).stiffness(320)}
              exiting={ZoomOut.duration(200)}
              style={styles.modalWrapper}
            >
              <GlassSurface style={styles.modalContent}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder={NLP_PLACEHOLDER}
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  onSubmitEditing={handleSubmit}
                  autoCapitalize="sentences"
                  autoCorrect
                />

                {!title.trim() && (
                  <View style={styles.hintBlock}>
                    <Text style={[styles.hintText, { color: colors.textMuted }]}>
                      {NLP_EMPTY_HINT}
                    </Text>
                    <Text style={[styles.ghostText, { color: colors.textMuted }]}>
                      {ghostExample}
                    </Text>
                  </View>
                )}

                {showOptions && (
                  <Animated.View entering={FadeIn.duration(150)}>
                    <View style={styles.optionsSection}>
                      <View style={styles.fieldRow}>
                        <View style={styles.fieldCol}>
                          <Text style={styles.fieldLabel}>PRIORITY</Text>
                          <TouchableOpacity
                            style={[
                              styles.formInput,
                              {
                                borderColor: colors.separator,
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'rgba(0,0,0,0.02)',
                              },
                            ]}
                            onPress={handlePriorityCycle}
                          >
                            <Text
                              style={[
                                styles.formInputText,
                                {
                                  color:
                                    explicitPriority === 'Auto/Parse'
                                      ? colors.textMuted
                                      : colors.text,
                                },
                              ]}
                            >
                              {explicitPriority}
                            </Text>
                            <ChevronDown size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.fieldCol}>
                          <Text style={styles.fieldLabel}>EST. TIME (MIN)</Text>
                          <View
                            style={[
                              styles.formInput,
                              {
                                borderColor: colors.separator,
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'rgba(0,0,0,0.02)',
                              },
                            ]}
                          >
                            <TextInput
                              style={[
                                styles.formInputText,
                                { color: colors.text, flex: 1, padding: 0 },
                              ]}
                              placeholder="Auto"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numeric"
                              value={explicitDuration}
                              onChangeText={setExplicitDuration}
                            />
                            <Clock size={16} color={colors.textMuted} />
                          </View>
                        </View>
                      </View>

                      <View style={styles.fieldRow}>
                        <View style={styles.fieldCol}>
                          <Text style={styles.fieldLabel}>EXPLICIT DUE DATE</Text>
                          <View
                            style={[
                              styles.formInput,
                              {
                                borderColor: colors.separator,
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'rgba(0,0,0,0.02)',
                              },
                            ]}
                          >
                            <TextInput
                              style={[
                                styles.formInputText,
                                { color: colors.text, flex: 1, padding: 0 },
                              ]}
                              placeholder="mm/dd/yyyy"
                              placeholderTextColor={colors.textMuted}
                              value={explicitDate}
                              onChangeText={setExplicitDate}
                            />
                            <CalendarIcon size={16} color={colors.textMuted} />
                          </View>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                )}

                <View style={[styles.footer, { borderTopColor: colors.separator }]}>
                  <TouchableOpacity
                    onPress={() => setShowOptions(!showOptions)}
                    style={styles.toggleButton}
                  >
                    <Text style={[styles.toggleText, { color: colors.textMuted }]}>
                      {showOptions ? '- Hide Options' : '+ Options'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.footerActions}>
                    <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                      <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      style={[
                        styles.submitButton,
                        {
                          backgroundColor: title.trim()
                            ? Colors.brand[500]
                            : colors.separator,
                        },
                      ]}
                      disabled={!title.trim()}
                    >
                      <Text style={styles.submitText}>{NLP_SUBMIT_LABEL}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassSurface>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalWrapper: {
    width: '100%',
  },
  modalContent: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  input: {
    fontSize: 22,
    fontWeight: '600',
    minHeight: 44,
  },
  hintBlock: {
    marginTop: 8,
    marginBottom: 16,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
  ghostText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  optionsSection: {
    gap: 16,
    paddingVertical: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldCol: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  formInputText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
