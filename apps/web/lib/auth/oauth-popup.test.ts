import { describe, expect, it } from 'vitest';
import { buildOAuthPopupHtml } from './oauth-popup';

describe('buildOAuthPopupHtml', () => {
  it('embeds payload in a JSON script block, not inline executable source', () => {
    const html = buildOAuthPopupHtml(
      { type: 'oauth_result', provider: 'notion', error: null },
      'http://localhost:3000'
    );

    expect(html).toContain('type="application/json"');
    expect(html).toContain('"provider":"notion"');
    expect(html).not.toMatch(/provider:\s*"notion"/);
  });

  it('neutralizes script-breakout sequences in error text', () => {
    const malicious = '</script><img src=x onerror=alert(1)>';
    const html = buildOAuthPopupHtml(
      { type: 'oauth_result', provider: 'google', error: malicious },
      'https://planevo.co'
    );

    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c/script');
  });
});
