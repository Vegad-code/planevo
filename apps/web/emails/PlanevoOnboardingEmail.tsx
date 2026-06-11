import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface PlanevoOnboardingEmailProps {
  firstName?: string;
  day?: 1 | 3;
}

export function PlanevoOnboardingEmail({
  firstName = "there",
  day = 1,
}: PlanevoOnboardingEmailProps) {
  const isDayOne = day === 1;
  const previewText = isDayOne
    ? "Bruno is ready to build your first Planevo plan."
    : "A calmer way to time-block your next focus window.";

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
                paper: "#ffffff",
                honey: "#d4a574",
                ink: "#1a1a1a",
                muted: "#4a4a4a",
              },
            },
          },
        }}
      >
        <Body className="bg-cream font-sans text-ink py-10">
          <Container className="bg-paper mx-auto p-10 rounded-2xl border border-[#e8e4de] max-w-[520px] shadow-sm">
            <Heading className="text-2xl font-bold mb-4 text-ink">
              {isDayOne ? `Welcome to Planevo, ${firstName}.` : `Time-blocking without the guilt, ${firstName}.`}
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-5">
              {isDayOne
                ? "Bruno can help turn your tasks, class deadlines, and calendar into one practical plan for the day."
                : "The trick is not filling every minute. It is protecting the right windows for the right kind of work."}
            </Text>

            <Text className="text-muted text-base leading-relaxed mb-8">
              {isDayOne
                ? "Open Planevo, finish setup, and Bruno will show you the first useful plan before you land in the dashboard."
                : "Open your Daily Plan when you are ready, and let Bruno move the logistics around the work that matters."}
            </Text>

            <Section className="text-center">
              <Button
                className="bg-honey text-ink font-semibold py-3 px-8 rounded-full no-underline inline-block"
                href="https://planevo.co/onboarding"
              >
                {isDayOne ? "Finish setup" : "Open Planevo"}
              </Button>
            </Section>

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed text-center">
              Planevo helps you plan without shame. You can change notification preferences in Settings.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PlanevoOnboardingEmail;
