import { describe, expect, it } from 'vitest';
import { extractComposioRecords } from '../composioPayload';
import {
  filterBrunoChatTools,
  isBrunoChatToolAllowed,
  LINEAR_SYNC_ATTEMPTS,
  mapNotionDatabaseOptions,
  SLACK_SYNC_ATTEMPTS,
} from '../providerTools';

describe('bruno chat tool filtering', () => {
  it('blocks meta and block-content Notion tools', () => {
    expect(isBrunoChatToolAllowed('NOTION_QUERY_DATABASE')).toBe(true);
    expect(isBrunoChatToolAllowed('NOTION_FETCH_ALL_BLOCK_CONTENTS')).toBe(
      false
    );
    expect(isBrunoChatToolAllowed('COMPOSIO_SEARCH_TOOLS')).toBe(false);
  });

  it('filters denied tools from the tool map', () => {
    const filtered = filterBrunoChatTools({
      NOTION_QUERY_DATABASE: {},
      NOTION_FETCH_ALL_BLOCK_CONTENTS: {},
      LINEAR_LIST_LINEAR_ISSUES: {},
    });
    expect(Object.keys(filtered)).toEqual([
      'NOTION_QUERY_DATABASE',
      'LINEAR_LIST_LINEAR_ISSUES',
    ]);
  });
});

describe('composioPayload', () => {
  it('extracts Slack search matches from nested payloads', () => {
    const records = extractComposioRecords(
      {
        data: JSON.stringify({
          messages: {
            matches: [{ ts: '1.23', text: 'Hello team' }],
          },
        }),
      },
      ['messages', 'matches']
    );

    expect(records).toHaveLength(1);
    expect(records[0]?.text).toBe('Hello team');
  });

  it('extracts Linear issues from JSON payloads', () => {
    const records = extractComposioRecords(
      {
        data: JSON.stringify({
          issues: [{ id: 'issue_1', title: 'Fix sync' }],
        }),
      },
      ['issues']
    );

    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('issue_1');
  });
});

describe('providerTools', () => {
  it('uses valid Composio slugs for Slack sync', () => {
    expect(SLACK_SYNC_ATTEMPTS.map((attempt) => attempt.slug)).toEqual([
      'SLACK_SEARCH_MESSAGES',
      'SLACK_LIST_STARRED_ITEMS',
    ]);
    expect(SLACK_SYNC_ATTEMPTS[0]?.args.query).toBeTruthy();
  });

  it('uses valid Composio slugs for Linear sync', () => {
    expect(LINEAR_SYNC_ATTEMPTS.map((attempt) => attempt.slug)).toEqual([
      'LINEAR_LIST_LINEAR_ISSUES',
    ]);
  });

  it('maps database options with selection state', () => {
    const options = mapNotionDatabaseOptions(
      [
        { id: 'db_1', object: 'database', title: [{ plain_text: 'Tasks' }] },
        { id: 'db_2', object: 'database', title: [{ plain_text: 'Roadmap' }] },
      ],
      ['db_2']
    );

    expect(options).toEqual([
      { id: 'db_1', title: 'Tasks', selected: false },
      { id: 'db_2', title: 'Roadmap', selected: true },
    ]);
  });
});
