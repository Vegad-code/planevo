import { describe, expect, it } from 'vitest';

import { buildEmailIdempotencyKey, escapeEmailHtml } from '../email';

describe('email notification helpers', () => {
  it('builds stable Resend idempotency keys under the provider length limit', () => {
    const key = buildEmailIdempotencyKey(
      'deadline_rescue',
      'email',
      '215bd6e7-4ed8-44d6-9521-6b8e12ed5117',
      '2026-06-04'
    );

    expect(key).toBe('deadline_rescue/email/215bd6e7-4ed8-44d6-9521-6b8e12ed5117/2026-06-04');
    expect(key.length).toBeLessThanOrEqual(256);
  });

  it('escapes dynamic values before placing them in raw email HTML', () => {
    expect(escapeEmailHtml('<script>alert("x")</script> & done')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; done'
    );
  });
});
