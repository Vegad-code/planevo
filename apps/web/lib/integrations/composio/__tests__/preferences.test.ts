import { describe, expect, it } from 'vitest';
import {
  buildLinearMetadataPatch,
  buildSlackMetadataPatch,
  parseLinearPreferences,
  parseSlackPreferences,
  resolvePickerSelection,
} from '../preferences';
import { mapSlackChannelOptions, slackListChannelTypes } from '../providerTools';

describe('composio preferences', () => {
  it('parses Slack preferences with defaults', () => {
    expect(parseSlackPreferences({})).toEqual({
      channel_ids: [],
      include_starred: true,
      include_dms: false,
      configured: false,
    });
  });

  it('parses Linear preferences from metadata', () => {
    expect(
      parseLinearPreferences({
        linear_team_ids: ['team_1'],
        linear_assignee_filter: 'me',
        linear_preferences_configured: true,
      })
    ).toEqual({
      team_ids: ['team_1'],
      project_ids: [],
      include_completed: false,
      assignee_filter: 'me',
      configured: true,
    });
  });

  it('defaults picker selection to all IDs before first save', () => {
    expect(resolvePickerSelection([], false, ['a', 'b'])).toEqual(['a', 'b']);
    expect(resolvePickerSelection(['a'], true, ['a', 'b'])).toEqual(['a']);
  });

  it('builds metadata patches without dropping existing keys', () => {
    expect(
      buildSlackMetadataPatch({ notion_database_ids: ['db'] }, {
        channel_ids: ['C1'],
        include_starred: false,
        include_dms: true,
      })
    ).toMatchObject({
      notion_database_ids: ['db'],
      slack_channel_ids: ['C1'],
      slack_preferences_configured: true,
    });
    expect(
      buildLinearMetadataPatch(null, {
        team_ids: ['t1'],
        project_ids: ['p1'],
        include_completed: true,
        assignee_filter: 'all',
      })
    ).toMatchObject({
      linear_team_ids: ['t1'],
      linear_project_ids: ['p1'],
      linear_preferences_configured: true,
    });
  });
});

describe('slack channel helpers', () => {
  it('builds channel type filters', () => {
    expect(slackListChannelTypes(false)).toBe('public_channel,private_channel');
    expect(slackListChannelTypes(true)).toBe('public_channel,private_channel,im,mpim');
  });

  it('maps Slack channels with labels', () => {
    const options = mapSlackChannelOptions(
      [
        { id: 'C1', name: 'general', is_private: false },
        { id: 'D1', name: 'alice', is_im: true },
      ],
      ['C1']
    );
    expect(options[0]).toMatchObject({ id: 'C1', title: '#general', selected: true });
    expect(options[1]?.title).toContain('DM:');
  });
});
