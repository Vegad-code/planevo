import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProIntegrationProvider } from '@/lib/integrations/types';

const useProIntegrationsMock = vi.fn();

vi.mock('@/hooks/useProIntegrations', () => ({
  useProIntegrations: () => useProIntegrationsMock(),
}));

import { BrunoIntegrationChips } from '@/components/bruno/BrunoIntegrationChips';

function setConnected(connectedProviders: ProIntegrationProvider[]) {
  useProIntegrationsMock.mockReturnValue({
    loading: false,
    isPro: connectedProviders.length > 0,
    connectedProviders,
    pulses: [],
    syncing: false,
    syncAll: vi.fn(),
    refresh: vi.fn(),
  });
}

describe('BrunoIntegrationChips', () => {
  afterEach(() => {
    useProIntegrationsMock.mockReset();
  });

  it('renders nothing when no providers are connected', () => {
    setConnected([]);
    const { container } = render(<BrunoIntegrationChips />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one chip per connected provider', () => {
    setConnected(['notion', 'slack']);
    const { getByLabelText } = render(<BrunoIntegrationChips />);
    const wrapper = getByLabelText('Connected work tools');
    expect(wrapper.querySelectorAll('span[title]')).toHaveLength(2);
  });
});
