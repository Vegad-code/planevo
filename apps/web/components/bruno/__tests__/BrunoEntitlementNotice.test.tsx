import { render, screen } from '@testing-library/react';
import { BrunoEntitlementNotice } from '@/components/bruno/BrunoEntitlementNotice';

describe('BrunoEntitlementNotice', () => {
  it('renders an upgrade card with its billing link', () => {
    render(
      <BrunoEntitlementNotice
        notice={{
          type: 'bruno_upgrade_card',
          mode: 'academic_tutoring',
          title: 'Unlock Deep Bruno',
          body: 'Get the complete tutoring session.',
          bullets: ['Step-by-step help'],
          ctaText: 'Upgrade to Pro',
          ctaHref: '/settings/billing',
        }}
      />
    );

    expect(screen.getByText('Unlock Deep Bruno')).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'Upgrade to Pro' }).getAttribute('href')
    ).toBe('/settings/billing');
  });

  it('renders a cap notice without an upgrade link', () => {
    render(
      <BrunoEntitlementNotice
        notice={{
          type: 'bruno_pro_cap',
          title: 'Deep Bruno monthly limit reached',
          body: 'Standard Bruno remains available.',
        }}
      />
    );

    expect(screen.getByText('Standard Bruno remains available.')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
