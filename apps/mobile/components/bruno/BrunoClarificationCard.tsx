import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ChevronLeft, Pencil, Sparkles } from 'lucide-react-native';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Colors } from '@/constants/Colors';
import type {
  BrunoClarificationAnswer,
  BrunoClarificationCard as BrunoClarificationCardData,
  BrunoClarificationResponse,
} from '@/lib/bruno/types';

type AnswerDraft = {
  answer: string;
  source: BrunoClarificationAnswer['source'];
};

type Props = {
  card: BrunoClarificationCardData;
  disabled?: boolean;
  isDark: boolean;
  textColor: string;
  mutedColor: string;
  onSubmit: (response: BrunoClarificationResponse) => void;
};

export function BrunoClarificationCard({
  card,
  disabled = false,
  isDark,
  textColor,
  mutedColor,
  onSubmit,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = card.questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const currentOtherText = otherText[currentQuestion.id] ?? '';
  const isLastQuestion = currentIndex === card.questions.length - 1;
  const isLocked = disabled || submitted;
  const canContinue =
    currentAnswer?.source === 'option' ||
    (currentAnswer?.source === 'other' && currentOtherText.trim().length > 0);

  const progressLabel = useMemo(
    () => `${currentIndex + 1} of ${card.questions.length}`,
    [card.questions.length, currentIndex]
  );

  const buildResponse = (
    sourceOverride?: BrunoClarificationAnswer['source']
  ): BrunoClarificationResponse => ({
    cardId: card.id,
    originalPrompt: card.originalPrompt,
    answers: card.questions.map((question) => {
      const saved = answers[question.id];
      const skip = sourceOverride === 'skip';
      return {
        questionId: question.id,
        question: question.question,
        answer: skip
          ? 'Answer with reasonable assumptions.'
          : saved?.source === 'other'
            ? (otherText[question.id] ?? '').trim()
            : saved?.answer ?? 'Answer with reasonable assumptions.',
        source: skip ? 'skip' : saved?.source ?? 'skip',
      };
    }),
  });

  const submit = (sourceOverride?: BrunoClarificationAnswer['source']) => {
    if (isLocked) return;
    setSubmitted(true);
    onSubmit(buildResponse(sourceOverride));
  };

  return (
    <GlassSurface style={styles.card} interactive={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <View style={styles.badge}>
            <Sparkles size={13} color={Colors.brand[500]} />
            <Text style={[styles.badgeText, { color: mutedColor }]}>
              Clarify first
            </Text>
          </View>
          <Text style={[styles.question, { color: textColor }]}>
            {currentQuestion.question}
          </Text>
        </View>
        <View
          style={[
            styles.progressPill,
            { backgroundColor: isDark ? Colors.surface[700] : Colors.surface[100] },
          ]}
        >
          <Text style={[styles.progressText, { color: mutedColor }]}>
            {progressLabel}
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        {currentQuestion.options.map((option, index) => {
          const selected =
            currentAnswer?.source === 'option' &&
            currentAnswer.answer === option.label;
          return (
            <Pressable
              key={option.id}
              disabled={isLocked}
              onPress={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: {
                    answer: option.label,
                    source: 'option',
                  },
                }))
              }
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: isLocked }}
              accessibilityLabel={option.label}
              style={[
                styles.option,
                {
                  borderColor: selected ? Colors.brand[500] : 'rgba(128,128,128,0.22)',
                  backgroundColor: selected
                    ? 'rgba(208, 135, 65, 0.16)'
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(255,255,255,0.58)',
                  opacity: isLocked ? 0.65 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.numberBubble,
                  {
                    backgroundColor: selected
                      ? Colors.brand[500]
                      : isDark
                        ? Colors.surface[700]
                        : Colors.surface[100],
                  },
                ]}
              >
                {selected ? (
                  <Check size={13} color="#fff" />
                ) : (
                  <Text style={[styles.numberText, { color: mutedColor }]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: textColor }]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={[styles.optionDescription, { color: mutedColor }]}>
                    {option.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        <View
          style={[
            styles.otherBox,
            {
              borderColor:
                currentAnswer?.source === 'other'
                  ? Colors.brand[500]
                  : 'rgba(128,128,128,0.22)',
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.52)',
              opacity: isLocked ? 0.65 : 1,
            },
          ]}
        >
          <View style={styles.otherLabelRow}>
            <Pencil size={14} color={Colors.brand[500]} />
            <Text style={[styles.otherLabel, { color: textColor }]}>Other</Text>
          </View>
          <TextInput
            editable={!isLocked}
            value={currentOtherText}
            onFocus={() =>
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: {
                  answer: currentOtherText,
                  source: 'other',
                },
              }))
            }
            onChangeText={(value) => {
              setOtherText((prev) => ({
                ...prev,
                [currentQuestion.id]: value,
              }));
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: {
                  answer: value,
                  source: 'other',
                },
              }));
            }}
            placeholder="Type your own answer..."
            placeholderTextColor={mutedColor}
            multiline
            style={[
              styles.otherInput,
              {
                color: textColor,
                backgroundColor: isDark
                  ? 'rgba(0,0,0,0.18)'
                  : 'rgba(255,255,255,0.72)',
              },
            ]}
            testID={`clarification-other-${currentQuestion.id}`}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Pressable
            disabled={currentIndex === 0 || isLocked}
            onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            style={[
              styles.secondaryButton,
              { opacity: currentIndex === 0 || isLocked ? 0.4 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeft size={14} color={mutedColor} />
            <Text style={[styles.secondaryText, { color: mutedColor }]}>
              Back
            </Text>
          </Pressable>
          <Pressable
            disabled={isLocked}
            onPress={() => submit('skip')}
            style={[styles.assumptionButton, { opacity: isLocked ? 0.5 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Answer with assumptions"
          >
            <Text style={[styles.assumptionText, { color: mutedColor }]}>
              Answer with assumptions
            </Text>
          </Pressable>
        </View>

        <Pressable
          disabled={!canContinue || isLocked}
          onPress={() => {
            if (isLastQuestion) {
              submit();
            } else {
              setCurrentIndex((index) => index + 1);
            }
          }}
          style={[
            styles.primaryButton,
            { opacity: !canContinue || isLocked ? 0.45 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isLastQuestion ? 'Send context' : 'Next question'}
          testID="clarification-primary-button"
        >
          <Text style={styles.primaryText}>
            {submitted ? 'Sent' : isLastQuestion ? 'Send context' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 14,
    gap: 14,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  progressPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  numberBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  otherBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    gap: 8,
  },
  otherLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otherLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  otherInput: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 19,
  },
  footer: {
    gap: 10,
  },
  footerLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assumptionButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  assumptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.brand[600],
  },
  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
