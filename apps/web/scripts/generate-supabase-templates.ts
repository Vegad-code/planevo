import * as fs from 'fs';
import * as path from 'path';
import { render } from '@react-email/render';
import React from 'react';

import PlanevoConfirmSignupEmail from '../emails/PlanevoWelcomeEmail';
import PlanevoMagicLinkEmail from '../emails/PlanevoMagicLinkEmail';
import PlanevoResetPasswordEmail from '../emails/PlanevoResetPasswordEmail';

async function generate() {
  console.log('Compiling React Email templates for Supabase...');

  const confirmSignupHtml = await render(React.createElement(PlanevoConfirmSignupEmail, { confirmationUrl: "{{ .ConfirmationURL }}", firstName: "there" }));
  const magicLinkHtml = await render(React.createElement(PlanevoMagicLinkEmail, { confirmationUrl: "{{ .ConfirmationURL }}" }));
  const resetPasswordHtml = await render(React.createElement(PlanevoResetPasswordEmail, { confirmationUrl: "{{ .ConfirmationURL }}" }));

  const markdownContent = `# Supabase Custom Email Templates

To use these templates:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication > Email Templates**.
3. For each section, clear out the default text and paste in the HTML below.

---

## 1. Confirm Signup

**Subject:** Welcome to Planevo! Let's get started

\`\`\`html
${confirmSignupHtml}
\`\`\`

---

## 2. Magic Link

**Subject:** Your Magic Link for Planevo

\`\`\`html
${magicLinkHtml}
\`\`\`

---

## 3. Reset Password

**Subject:** Reset your Planevo password

\`\`\`html
${resetPasswordHtml}
\`\`\`
`;

  const outPath = path.join(__dirname, '..', 'docs', 'SUPABASE_EMAIL_TEMPLATES.md');
  fs.writeFileSync(outPath, markdownContent, 'utf-8');
  console.log(`Successfully generated and saved templates to ${outPath}`);
}

generate().catch(console.error);
