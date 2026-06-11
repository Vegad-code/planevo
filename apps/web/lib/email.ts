import type { ReactElement } from 'react';
import { Resend } from 'resend';
import { readRequiredEnv } from './env';

import { PlanevoDeadlineRescueEmail } from '../emails/PlanevoDeadlineRescueEmail';
import { PlanevoOnboardingEmail } from '../emails/PlanevoOnboardingEmail';
import { PlanevoPaymentFailedEmail } from '../emails/PlanevoPaymentFailedEmail';
import { PlanevoReceiptEmail } from '../emails/PlanevoReceiptEmail';
import { PlanevoResetPasswordEmail } from '../emails/PlanevoResetPasswordEmail';

export interface EmailNotificationOptions {
  idempotencyKey?: string;
}

export function buildEmailIdempotencyKey(
  type: string,
  channel: string,
  userId: string,
  dedupeKey: string
) {
  return `${type}/${channel}/${userId}/${dedupeKey}`.slice(0, 256);
}

export function escapeEmailHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://planevo.co';
}

function getFromAddress(fallback = 'Bruno <bruno@planevo.co>') {
  return process.env.WEEKLY_REVIEW_FROM || fallback;
}

function getSendOptions(options: EmailNotificationOptions) {
  return options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined;
}

export function getResendClient() {
  const apiKey = readRequiredEnv(process.env, 'RESEND_API_KEY');

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

export async function sendWeeklyReviewEmail(
  to: string,
  userName: string,
  review: WeeklyReviewData,
  options: EmailNotificationOptions = {}
) {
  const safeHeadline = escapeEmailHtml(review.headline);
  const safeSummary = escapeEmailHtml(review.summary);
  const safeUserName = escapeEmailHtml(userName);
  const safeVibe = escapeEmailHtml(review.vibe);
  const safeSuggestion = escapeEmailHtml(review.suggestion);
  const subject = `Your Week in Review: ${review.headline}`;
  const text = [
    subject,
    '',
    `Hi ${userName},`,
    review.summary,
    '',
    'What Bruno noticed:',
    ...review.insights.map((insight) => `- ${insight}`),
    '',
    `Suggestion for next week: ${review.suggestion}`,
    '',
    `Open Planevo: ${getAppUrl()}/dashboard`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background: #faf8f3; color: #1a1a1a; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .headline { font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0; }
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
      <h1 class="headline">${safeHeadline}</h1>
      <span class="vibe-tag">${safeVibe}</span>
    </div>
    <p class="summary">Hi ${safeUserName}, ${safeSummary}</p>
    <div class="stats-row" style="display: flex; gap: 16px;">
      <div class="stat-box">
        <div class="stat-number">${escapeEmailHtml(review.stats.tasks_completed)}</div>
        <div class="stat-label">Tasks Done</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${escapeEmailHtml(review.stats.total_focus_minutes)}m</div>
        <div class="stat-label">Focus Time</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${escapeEmailHtml(review.stats.feedback_given)}</div>
        <div class="stat-label">Feedback</div>
      </div>
    </div>
    <div class="insights-title">WHAT BRUNO NOTICED</div>
    ${review.insights.map((insight) => `<div class="insight">${escapeEmailHtml(insight)}</div>`).join('')}
    <div class="suggestion-box">
      <div class="suggestion-label">SUGGESTION FOR NEXT WEEK</div>
      <div class="suggestion-text">${safeSuggestion}</div>
    </div>
    <a href="${getAppUrl()}/dashboard" class="cta">Open Planevo</a>
    <div class="footer">
      <p>You're receiving this because you're a Planevo member.</p>
      <p>Planevo</p>
    </div>
  </div>
</body>
</html>`;

  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress(),
      to,
      subject,
      html,
      text,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send weekly review to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendMorningPlanEmail(
  to: string,
  name: string,
  taskCount: number,
  options: EmailNotificationOptions = {}
) {
  const safeName = escapeEmailHtml(name);
  const subject = `Your Morning Plan: ${taskCount} ${taskCount === 1 ? 'thing' : 'things'} today`;
  const text = `Good morning, ${name}!\n\nYour daily plan is ready. You have ${taskCount} ${taskCount === 1 ? 'thing' : 'things'} on your plate today.\n\nView your plan: ${getAppUrl()}/dashboard`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background: #faf8f3; color: #1a1a1a; padding: 40px; text-align: center; }
    .container { max-width: 500px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; border: 1px solid #e8e4de; }
    .headline { font-size: 24px; font-weight: 700; margin-bottom: 16px; }
    .cta { display: inline-block; background: #d4a574; color: #1a1a1a; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 600; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="headline">Good morning, ${safeName}!</h1>
    <p style="font-size: 16px; color: #4a4a4a; line-height: 1.5;">
      Your daily plan is ready. You have <strong>${escapeEmailHtml(taskCount)} ${taskCount === 1 ? 'thing' : 'things'}</strong> on your plate today.
    </p>
    <a href="${getAppUrl()}/dashboard" class="cta">View Your Plan</a>
  </div>
</body>
</html>`;

  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress(),
      to,
      subject,
      html,
      text,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send morning plan email to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendDeadlineRescueEmail(
  to: string,
  name: string,
  taskCount: number,
  firstTask: string,
  options: EmailNotificationOptions = {}
) {
  const bodyText = taskCount === 1
    ? `"${firstTask}" is due today. Want me to help you reschedule it?`
    : `You have ${taskCount} tasks due today including "${firstTask}". Let's knock them out!`;

  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress(),
      to,
      subject: `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} due today`,
      text: bodyText,
      react: PlanevoDeadlineRescueEmail({ firstName: name, taskCount, bodyText }) as ReactElement,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send deadline rescue email to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  day: 1 | 3,
  options: EmailNotificationOptions = {}
) {
  const subject = day === 1
    ? 'Welcome to Planevo!'
    : 'Time Blocking: The secret to getting things done';
  const text = day === 1
    ? `Welcome to Planevo, ${name}! Open your dashboard to start planning.`
    : 'Time Blocking: The secret to getting things done. Open Planevo to plan your next focus block.';

  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress(),
      to,
      subject,
      text,
      react: PlanevoOnboardingEmail({ firstName: name, day }) as ReactElement,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send welcome email to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendSubscriptionReceiptEmail(
  to: string,
  name: string,
  amount: string,
  plan: string,
  options: EmailNotificationOptions = {}
) {
  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress('Billing <bruno@planevo.co>'),
      to,
      subject: 'Receipt from Planevo',
      text: `Hi ${name}, your ${plan} payment of $${amount} was received.`,
      react: PlanevoReceiptEmail({ firstName: name, amount, planName: plan }) as ReactElement,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send receipt to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendPaymentFailedEmail(
  to: string,
  name: string,
  options: EmailNotificationOptions = {}
) {
  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress('Billing <bruno@planevo.co>'),
      to,
      subject: 'Action Required: Planevo Payment Failed',
      text: `Hi ${name}, we could not process your Planevo subscription payment. Please open settings to review it.`,
      react: PlanevoPaymentFailedEmail({ firstName: name }) as ReactElement,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send payment failed email to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendPasswordResetEmail(
  to: string,
  confirmationUrl: string,
  options: EmailNotificationOptions = {}
) {
  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress(),
      to,
      subject: 'Reset your Planevo password',
      text: `Reset your Planevo password: ${confirmationUrl}`,
      react: PlanevoResetPasswordEmail({ confirmationUrl }) as ReactElement,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send password reset email to ${to}:`, error);
    throw error;
  }

  return data?.id;
}

export async function sendTestNotificationEmail(
  to: string,
  name: string,
  options: EmailNotificationOptions = {}
) {
  const safeName = escapeEmailHtml(name);
  const text = `You're all set, ${name}.\n\nThis is a test email from Planevo. Email notifications can reach this inbox.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">You're all set, ${safeName}.</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">
        This is a test email from Planevo. Email notifications can reach this inbox.
      </p>
    </div>
  `;

  const { data, error } = await getResendClient().emails.send(
    {
      from: getFromAddress(),
      to,
      subject: 'Planevo email notifications are working',
      html,
      text,
    },
    getSendOptions(options)
  );

  if (error) {
    console.error(`[email] Failed to send test notification email to ${to}:`, error);
    throw error;
  }

  return data?.id;
}
