import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface ResetPasswordEmailProps {
  confirmationUrl: string;
}

export const PlanevoResetPasswordEmail = ({ confirmationUrl }: ResetPasswordEmailProps) => {
  const previewText = 'Reset your Planevo password.';
  const isLocalDevLink =
    confirmationUrl.includes('localhost') || confirmationUrl.includes('127.0.0.1');

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                cream: '#faf8f3',
                honey: '#d4a574',
                sage: '#9caf88',
                dark: '#1a1a1a',
                muted: '#4a4a4a',
              },
            },
          },
        }}
      >
        <Body className="bg-cream font-sans text-dark py-10">
          <Container className="bg-white mx-auto p-10 rounded-2xl border border-[#e8e4de] max-w-[500px] text-center shadow-sm">
            <Section className="mb-4 text-center">
              <Img
                src="https://planevo.co/logo.png"
                alt="Planevo"
                width="48"
                height="48"
                className="mx-auto inline-block"
              />
            </Section>

            <Heading className="text-2xl font-bold mb-4 text-dark">Reset your password</Heading>

            <Text className="text-muted text-base leading-relaxed mb-8">
              We received a request to reset the password for your Planevo account. Click the button
              below to choose a new password.
            </Text>

            <Section className="mb-8">
              <Link
                href={confirmationUrl}
                className="bg-dark text-white font-semibold py-3 px-8 rounded-full no-underline inline-block"
              >
                Reset Password
              </Link>
            </Section>

            <Text className="text-muted text-xs leading-relaxed mb-4 break-all">
              Or copy this link into your browser:
              <br />
              <Link href={confirmationUrl} className="text-dark underline">
                {confirmationUrl}
              </Link>
            </Text>

            {isLocalDevLink ? (
              <Text className="text-[#888] text-xs leading-relaxed mb-4">
                Local development link — open it on the same computer running{' '}
                <span className="font-semibold">npm run dev</span>. The Resend dashboard preview
                button is not the live link.
              </Text>
            ) : null}

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed">
              If you didn&apos;t request a password reset, you can safely ignore this email.
              <br />
              The Planevo Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanevoResetPasswordEmail;
