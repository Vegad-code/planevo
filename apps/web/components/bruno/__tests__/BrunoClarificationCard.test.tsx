import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrunoClarificationCard } from '@/components/bruno/BrunoClarificationCard';
import type { BrunoClarificationCard as BrunoClarificationCardData } from '@/lib/bruno/types';

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

describe('BrunoClarificationCard', () => {
  it('submits selected options and Other answers', () => {
    const onSubmit = vi.fn();
    render(<BrunoClarificationCard card={card} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Finish homework' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    fireEvent.focus(screen.getByPlaceholderText('Type your own answer...'));
    fireEvent.change(screen.getByPlaceholderText('Type your own answer...'), {
      target: { value: 'About 45 minutes after dinner' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send context' }));

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

  it('submits skip answers when the user wants assumptions', () => {
    const onSubmit = vi.fn();
    render(<BrunoClarificationCard card={card} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Answer with assumptions' }));

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
