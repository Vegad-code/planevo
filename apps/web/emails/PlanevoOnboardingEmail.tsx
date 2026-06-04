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

interface OnboardingEmailProps {
  firstName?: string;
  day?: 1 | 3;
}

export const PlanevoOnboardingEmail = ({
  firstName = "there",
  day = 1,
}: OnboardingEmailProps) => {
  const isDay1 = day === 1;
  const previewText = isDay1
    ? "Welcome to Planevo!"
    : "Time Blocking: The secret to getting things done";

  const headline = isDay1 ? "Welcome to Planevo!" : "Master your schedule";
  const bodyText = isDay1
    ? `Welcome to Planevo! We'll be helping you organize your days and smash your goals without the overwhelm. To get started, try adding a few tasks to your Inbox.`
    : `It's day 3! The best way to use Planevo is through Time Blocking. Drag your tasks directly onto your calendar to protect your focus time.`;

  const showLogo = isDay1;

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
            {showLogo ? (
              <Section className="mb-4 text-center">
                <Img src="https://planevo.app/logo.png" alt="Planevo" width="48" height="48" className="mx-auto inline-block" />
              </Section>
            ) : (
              <Section className="mb-4">
                <Text className="text-5xl m-0">⏱️</Text>
              </Section>
            )}

            <Heading className="text-2xl font-bold mb-4 text-dark">
              {headline}
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-6">
              Hey {firstName},
            </Text>

            <Text className="text-muted text-base leading-relaxed mb-8">
              {bodyText}
            </Text>

            <Section className="mb-8">
              <Button
                className="bg-honey text-dark font-semibold py-3 px-8 rounded-full no-underline inline-block"
                href="https://planevo.app/dashboard"
              >
                Open Planevo
              </Button>
            </Section>

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed">
              The Planevo Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanevoOnboardingEmail;
