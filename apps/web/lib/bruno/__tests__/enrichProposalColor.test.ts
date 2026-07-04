import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enrichBrunoProposal } from '@/lib/bruno/enrichProposalColor';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const EVENT_ID = '22222222-2222-2222-2222-222222222222';

function createCalendarIdentitySupabase(row: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };

  return {
    supabase: {
      from: vi.fn(() => chain),
    } as unknown as SupabaseClient,
    chain,
  };
}

describe('enrichBrunoProposal', () => {
  it('adds stable Google identifiers to LLM calendar mutation proposals', async () => {
    const { supabase } = createCalendarIdentitySupabase({
      source: 'google_calendar',
      external_id: 'google-event-123',
      metadata: {
        google_event_id: 'metadata-google-event-123',
      },
    });

    const result = await enrichBrunoProposal(
      {
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'Move study block',
        description: 'Move study block to tomorrow',
        payload: {
          eventId: EVENT_ID,
          startTime: '2026-07-03T16:00:00.000Z',
          endTime: '2026-07-03T17:00:00.000Z',
        },
      },
      {
        userId: USER_ID,
        supabase,
        texts: ['Move my study block to tomorrow'],
        timeZone: 'America/Los_Angeles',
      }
    );

    expect(result.payload).toMatchObject({
      eventId: EVENT_ID,
      externalId: 'google-event-123',
      googleEventId: 'metadata-google-event-123',
    });
  });

  it('does not overwrite stable identifiers already present on the proposal', async () => {
    const { supabase } = createCalendarIdentitySupabase({
      source: 'google_calendar',
      external_id: 'google-event-from-db',
      metadata: {
        google_event_id: 'metadata-from-db',
      },
    });

    const result = await enrichBrunoProposal(
      {
        type: 'DELETE_CALENDAR_EVENT',
        title: 'Delete meeting',
        description: 'Delete meeting',
        payload: {
          eventId: EVENT_ID,
          externalId: 'google-event-from-proposal',
          googleEventId: 'metadata-from-proposal',
        },
      },
      {
        userId: USER_ID,
        supabase,
        texts: ['Delete the meeting'],
        timeZone: 'America/Los_Angeles',
      }
    );

    expect(result.payload).toMatchObject({
      externalId: 'google-event-from-proposal',
      googleEventId: 'metadata-from-proposal',
    });
  });
});
