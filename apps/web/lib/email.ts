import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
}

export interface WeeklyReviewData {
  headline: string;
  summary: string;
  insights: string[];
  suggestion: string;
  vibe: string;
  stats: {
    tasks_completed: number;
    total_focus_minutes: number;
    feedback_given: number;
  };
}

/**
 * Sends the weekly review email to a user via Resend.
 */
export async function sendWeeklyReviewEmail(
  to: string,
  userName: string,
  review: WeeklyReviewData
) {
  const fromAddress = process.env.WEEKLY_REVIEW_FROM || 'Bruno <bruno@planevo.app>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf8f3; color: #1a1a1a; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .bear-icon { font-size: 36px; margin-bottom: 8px; }
    .headline { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #1a1a1a; margin: 0; }
    .vibe-tag { display: inline-block; background: #d4a574; color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
    .summary { font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 24px 0; }
    .stats-row { display: flex; gap: 16px; margin: 24px 0; }
    .stat-box { flex: 1; background: #fff; border: 1px solid #e8e4de; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-number { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8a8a8a; margin-top: 4px; }
    .insights-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8a8a; margin-bottom: 12px; }
    .insight { font-size: 14px; line-height: 1.5; color: #4a4a4a; padding: 10px 0; border-bottom: 1px solid #f0ede7; }
    .suggestion-box { background: #3d2e1e; color: #faf8f3; border-radius: 16px; padding: 24px; margin: 24px 0; }
    .suggestion-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d4a574; margin-bottom: 8px; }
    .suggestion-text { font-size: 16px; line-height: 1.5; }
    .cta { display: block; text-align: center; background: #d4a574; color: #1a1a1a; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-size: 14px; font-weight: 600; margin: 32px auto 0; max-width: 240px; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="bear-icon">🐻</div>
      <h1 class="headline">${review.headline}</h1>
      <span class="vibe-tag">${review.vibe}</span>
    </div>

    <p class="summary">${review.summary}</p>

    <!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0"><tr><![endif]-->
    <div class="stats-row" style="display: flex; gap: 16px;">
      <div class="stat-box">
        <div class="stat-number">${review.stats.tasks_completed}</div>
        <div class="stat-label">Tasks Done</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${review.stats.total_focus_minutes}m</div>
        <div class="stat-label">Focus Time</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${review.stats.feedback_given}</div>
        <div class="stat-label">Feedback</div>
      </div>
    </div>
    <!--[if mso]></tr></table><![endif]-->

    <div class="insights-title">WHAT BRUNO NOTICED</div>
    ${review.insights.map(i => `<div class="insight">${i}</div>`).join('')}

    <div class="suggestion-box">
      <div class="suggestion-label">SUGGESTION FOR NEXT WEEK</div>
      <div class="suggestion-text">${review.suggestion}</div>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://planevo.app'}/dashboard" class="cta">
      Open Planevo →
    </a>

    <div class="footer">
      <p>You're receiving this because you're a Planevo member.</p>
      <p>Planevo · Built with 🐻 by the Planevo team</p>
    </div>
  </div>
</body>
</html>`;

  const { error } = await getResendClient().emails.send({
    from: fromAddress,
    to,
    subject: `🐻 Your Week in Review: ${review.headline}`,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send weekly review to ${to}:`, error);
    throw error;
  }
}
