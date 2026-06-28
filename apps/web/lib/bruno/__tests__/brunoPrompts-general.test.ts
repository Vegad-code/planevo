import { describe, expect, it } from 'vitest';
import { buildGeneralSystemPrompt } from '@/lib/bruno/brunoPrompts';

describe('buildGeneralSystemPrompt', () => {
  it('uses a neutral assistant instruction without Bruno personality', () => {
    const prompt = buildGeneralSystemPrompt({
      dataAccess: {
        tasks: true,
        calendar: true,
        canvas: true,
        integrations: true,
      },
    });

    expect(prompt).toContain('You are a helpful assistant');
    expect(prompt).not.toContain('You are Bruno');
    expect(prompt).not.toContain('CORE MISSION');
    expect(prompt).not.toContain('RESPONSE FORMATTING RULES');
  });

  it('includes privacy restrictions when data access is disabled', () => {
    const prompt = buildGeneralSystemPrompt({
      dataAccess: {
        tasks: false,
        calendar: true,
        canvas: true,
        integrations: true,
      },
    });

    expect(prompt).toContain('CRITICAL PRIVACY RESTRICTIONS');
    expect(prompt).toContain('Task Access is DISABLED');
  });

  it('mentions tools usage guardrails', () => {
    const prompt = buildGeneralSystemPrompt({
      dataAccess: {
        tasks: true,
        calendar: false,
        canvas: false,
        integrations: false,
      },
    });

    expect(prompt).toContain(
      'You may use Planevo tools only when the user explicitly asks'
    );
    expect(prompt).toContain('search_tasks');
  });

  it('includes document-writing quality boundaries', () => {
    const prompt = buildGeneralSystemPrompt();

    expect(prompt).toContain('WRITING QUALITY RULES');
    expect(prompt).toContain('Do not fabricate sources');
    expect(prompt).toContain('Do not help bypass AI detectors');
  });

  it('includes the short coding boundary', () => {
    const prompt = buildGeneralSystemPrompt();

    expect(prompt).toContain('CODING BOUNDARY RULES');
    expect(prompt).toContain('not a website/app code generator');
    expect(prompt).toContain('under 40 lines');
  });
});
