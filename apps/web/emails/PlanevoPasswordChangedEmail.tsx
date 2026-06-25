import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface PasswordChangedEmailProps {
  changedAt?: string;
  deviceHint?: string;
  resetPasswordUrl?: string;
}

export const PlanevoPasswordChangedEmail = ({
  changedAt = new Date().toUTCString(),
  deviceHint = "Unknown device",
  resetPasswordUrl = "https://planevo.co/forgot-password",
}: PasswordChangedEmailProps) => {
  const previewText = "Your Planevo password was changed.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                cream: "#faf8f3",
                honey: "#d4a574",
                sage: "#9caf88",
                dark: "#1a1a1a",
                muted: "#4a4a4a",
              },
            },
          },
        }}
      >
        <Body className="bg-cream font-sans text-dark py-10">
          <Container className="bg-white mx-auto p-10 rounded-2xl border border-[#e8e4de] max-w-[500px] text-center shadow-sm">
            <Section className="mb-4 text-center">
              <Img src="https://planevo.co/logo.png" alt="Planevo" width="48" height="48" className="mx-auto inline-block" />
            </Section>

            <Heading className="text-2xl font-bold mb-4 text-dark">
              Your password was changed
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-4">
              The password for your Planevo account was changed successfully.
            </Text>

            <Text className="text-muted text-sm leading-relaxed mb-8 text-left">
              <strong>When:</strong> {changedAt}
              <br />
              <strong>Device:</strong> {deviceHint}
            </Text>

            <Section className="mb-8">
              <Button
                className="bg-dark text-white font-semibold py-3 px-8 rounded-full no-underline inline-block"
                href={resetPasswordUrl}
              >
                Reset password if this wasn&apos;t you
              </Button>
            </Section>

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed">
              If you made this change, no further action is needed.
              <br />
              The Planevo Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanevoPasswordChangedEmail;
