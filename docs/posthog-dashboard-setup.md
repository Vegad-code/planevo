# PostHog Dashboard Setup: Planevo Market Readiness

This guide outlines how to build the primary PostHog dashboard required for Planevo's launch, ensuring the founder has clear visibility into core funnels without reading logs.

## 1. Activation Rate (Funnel)
**Insight Type:** Funnel
**Steps:**
1. **signup_started**
2. **onboarding_completed**
3. **google_connected** OR **canvas_connected**
4. **plan_generated**
5. **task_completed**

**Goal:** This shows the drop-off from a fresh signup to a user who has actually experienced the core loop (planning their day and finishing a task). The time window for completion should be set to "Within 1 day".

## 2. Plan Generation Success
**Insight Type:** Trends
**Series 1:** `plan_generated`
**Series 2:** `plan_accepted`
**Formula:** `B / A` (Percentage)

**Goal:** Measures what percentage of AI-generated plans actually get accepted into the user's schedule. This is a direct proxy for the quality of Bruno's AI output. If this dips below 70%, the prompts need adjustment.

## 3. AI Error Rate
**Insight Type:** Trends
This requires checking the API failure rate. Since we have Sentry integrated with tags for `feature`, we track server-side failures in Sentry.
However, for PostHog:
**Series 1:** Pageview on `/dashboard/daily-plan`
**Series 2:** `plan_generated`
**Goal:** Track how many daily plan views never result in a generated plan, indicating either frontend friction or silent backend failures.

*(Note: Direct AI errors are explicitly tracked via Sentry's Issue Stream filtering by `feature: daily-plan` and `transaction: /api/ai/daily-plan`.)*

## 4. Trial Conversion
**Insight Type:** Funnel
**Steps:**
1. **signup_started**
2. **checkout_started**
3. **subscription_active** (Triggered via Stripe Webhook)

**Goal:** Shows the raw conversion rate of free users moving to a paid subscription. Segment this by `plan_type` to see which demographics convert best.

## 5. D1 / D7 Retention
**Insight Type:** Retention
**Cohort Definition:** Users who performed `signup_started`
**Returning Event:** `task_completed` OR `plan_accepted`

**Goal:** D1 retention (Do they come back the next day?) and D7 retention (Do they build a habit?). Tracking `task_completed` as the returning event ensures we measure active value realization, not just passive logins.

---

**Next Steps for Founder:**
1. Log into your PostHog Project.
2. Navigate to "Dashboards" and click "New Dashboard".
3. Name it "Launch Metrics".
4. Add the 5 insights above.
5. Set the dashboard date range to "Last 14 days" by default.
