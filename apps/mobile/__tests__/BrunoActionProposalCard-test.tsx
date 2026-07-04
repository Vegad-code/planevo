import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  BrunoActionProposalCard,
  type MobileActionProposal,
} from '@/components/bruno/BrunoActionProposalCard';

const proposal: MobileActionProposal = {
  id: 'proposal-server-1',
  type: 'CREATE_TIME_BLOCK',
  title: 'Focus block',
  description: 'Add a focus block tomorrow.',
  riskLevel: 'low',
  requiresConfirmation: true,
  payload: { startTime: '2026-07-02T16:00:00.000Z' },
};

describe('Mobile BrunoActionProposalCard', () => {
  it('confirms with the unchanged proposal id', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <BrunoActionProposalCard
        proposal={proposal}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        isDark={false}
      />
    );

    fireEvent.press(getByText('Add to calendar'));

    expect(onConfirm).toHaveBeenCalledWith(proposal);
  });
});
