import { NextRequest, NextResponse } from 'next/server';
import {
  executeComposioToolAttempts,
  extractSlackChannels,
  mapSlackChannelOptions,
  SLACK_LIST_CHANNEL_ATTEMPTS,
  slackListChannelTypes,
} from '@/lib/integrations/composio/providerTools';
import {
  buildSlackMetadataPatch,
  parseSlackPreferences,
  resolvePickerSelection,
} from '@/lib/integrations/composio/preferences';
import { requireProComposioUser } from '@/lib/integrations/composio/requirePro';
import {
  getIntegrationAccount,
  upsertIntegrationAccount,
} from '@/lib/integrations/accounts';
import { composioSlackSettingsBodySchema, parseJsonBody } from '@/lib/api/schemas';

export async function GET(request: NextRequest) {
  const gate = await requireProComposioUser(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const account = await getIntegrationAccount(user.id, 'slack');
    const prefs = parseSlackPreferences(account?.metadata);
    const url = new URL(request.url);
    const includeDms =
      url.searchParams.get('includeDms') === 'true' ? true : prefs.include_dms;

    const attempts = SLACK_LIST_CHANNEL_ATTEMPTS.map((attempt) => ({
      ...attempt,
      args: {
        ...attempt.args,
        types: slackListChannelTypes(includeDms),
      },
    }));

    const result = await executeComposioToolAttempts(user.id, attempts);
    if (!result.successful) {
      return NextResponse.json({
        channels: [],
        preferences: prefs,
        error:
          result.error ??
          'Could not load Slack channels. Confirm the Composio connection is still active.',
      });
    }

    const records = extractSlackChannels(result.data);
    const allIds = records.map((channel) => String(channel.id));
    const selectedIds = resolvePickerSelection(
      prefs.channel_ids,
      prefs.configured,
      allIds
    );
    const channels = mapSlackChannelOptions(records, selectedIds);

    return NextResponse.json({
      channels,
      preferences: {
        include_starred: prefs.include_starred,
        include_dms: prefs.include_dms,
        configured: prefs.configured,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load Slack settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireProComposioUser(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(composioSlackSettingsBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { channelIds, includeStarred, includeDms } = parsed.data;

    const account = await getIntegrationAccount(user.id, 'slack');
    const metadata = buildSlackMetadataPatch(account?.metadata, {
      channel_ids: channelIds,
      include_starred: includeStarred,
      include_dms: includeDms,
    });

    await upsertIntegrationAccount({
      userId: user.id,
      provider: 'slack',
      status: 'connected',
      metadata,
    });

    return NextResponse.json({
      success: true,
      channelIds,
      includeStarred,
      includeDms,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save Slack settings' },
      { status: 500 }
    );
  }
}
