import { executeBrunoActionProposal } from '../executeActionProposal';
import type { MobileActionProposal } from '@/components/bruno/BrunoActionProposalCard';

jest.mock('../chat-transport', () => ({
  getBrunoApiUrl: () => 'https://unused.planevo.test',
}));

const proposal: MobileActionProposal = {
  id: 'proposal-server-1',
  type: 'CREATE_TIME_BLOCK',
  title: 'Focus block',
  description: 'Add a focus block tomorrow.',
  riskLevel: 'low',
  requiresConfirmation: true,
  payload: { startTime: '2026-07-02T16:00:00.000Z' },
};

describe('executeBrunoActionProposal', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('posts the web-compatible execute request with the server proposal id', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ success: true, eventId: 'event-1' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeBrunoActionProposal({
      proposal,
      accessToken: 'access-token',
      apiUrl: 'https://app.planevo.test',
      userPrompt: 'Plan a focus block tomorrow',
      timeZone: 'America/Los_Angeles',
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.planevo.test/api/bruno/actions/execute',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-token',
        },
      })
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody).toEqual({
      proposalId: 'proposal-server-1',
      type: 'CREATE_TIME_BLOCK',
      title: 'Focus block',
      description: 'Add a focus block tomorrow.',
      payload: { startTime: '2026-07-02T16:00:00.000Z' },
      userPrompt: 'Plan a focus block tomorrow',
      timeZone: 'America/Los_Angeles',
    });
  });
});
