import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  BrunoProvider,
  useRegisterBrunoContext,
} from '@/components/bruno/BrunoProvider';
import { BrunoContextBanner } from '@/components/bruno/BrunoContextBanner';

function CalendarContext() {
  useRegisterBrunoContext({
    source: 'calendar',
    page: '/dashboard/calendar',
    label: 'Calendar - Week of Jun 8',
  });

  return <BrunoContextBanner />;
}

describe('BrunoContextBanner', () => {
  it('shows the registered page label', () => {
    render(
      <BrunoProvider>
        <CalendarContext />
      </BrunoProvider>
    );

    expect(screen.getByText('Calendar - Week of Jun 8')).toBeInTheDocument();
  });

  it('falls back to Planevo without registered context', () => {
    render(
      <BrunoProvider>
        <BrunoContextBanner />
      </BrunoProvider>
    );

    expect(screen.getByText('Planevo')).toBeInTheDocument();
  });
});
