import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BrunoClarificationCard } from '@/components/bruno/BrunoClarificationCard';
import type { BrunoClarificationCard as BrunoClarificationCardData } from '@/lib/bruno/types';

jest.mock('@/components/ui/GlassSurface', () => ({
  GlassSurface: ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
    <View style={style}>{children}</View>
  ),
}));

const card: BrunoClarificationCardData = {
  type: 'bruno_clarification_card',
  id: 'clarify-1',
  intro: 'A couple quick questions first.',
  originalPrompt: 'Plan my afternoon',
  questions: [
    {
      id: 'q1',
      question: 'What matters most today?',
      options: [
        { id: 'q1-o1', label: 'Finish homework' },
        { id: 'q1-o2', label: 'Recover energy' },
      ],
      allowOther: true,
    },
    {
      id: 'q2',
      question: 'How much time do you have?',
      options: [
        { id: 'q2-o1', label: '30 minutes' },
        { id: 'q2-o2', label: '2 hours' },
      ],
      allowOther: true,
    },
  ],
};

describe('Mobile BrunoClarificationCard', () => {
  it('submits option and Other answers', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByTestId } = render(
      <BrunoClarificationCard
        card={card}
        isDark={false}
        textColor="#111"
        mutedColor="#666"
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByLabelText('Finish homework'));
    fireEvent.press(getByLabelText('Next question'));
    fireEvent.changeText(
      getByTestId('clarification-other-q2'),
      'About 45 minutes after dinner'
    );
    fireEvent.press(getByLabelText('Send context'));

    expect(onSubmit).toHaveBeenCalledWith({
      cardId: 'clarify-1',
      originalPrompt: 'Plan my afternoon',
      answers: [
        {
          questionId: 'q1',
          question: 'What matters most today?',
          answer: 'Finish homework',
          source: 'option',
        },
        {
          questionId: 'q2',
          question: 'How much time do you have?',
          answer: 'About 45 minutes after dinner',
          source: 'other',
        },
      ],
    });
  });

  it('submits skip answers for assumptions', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <BrunoClarificationCard
        card={card}
        isDark={false}
        textColor="#111"
        mutedColor="#666"
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByLabelText('Answer with assumptions'));

    expect(onSubmit).toHaveBeenCalledWith({
      cardId: 'clarify-1',
      originalPrompt: 'Plan my afternoon',
      answers: [
        {
          questionId: 'q1',
          question: 'What matters most today?',
          answer: 'Answer with reasonable assumptions.',
          source: 'skip',
        },
        {
          questionId: 'q2',
          question: 'How much time do you have?',
          answer: 'Answer with reasonable assumptions.',
          source: 'skip',
        },
      ],
    });
  });
});
