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

interface DeadlineRescueEmailProps {
  firstName?: string;
  taskCount?: number;
  bodyText?: string;
}

export const PlanevoDeadlineRescueEmail = ({
  firstName = "there",
  taskCount = 3,
  bodyText = "I noticed you have a few tasks due today that you haven't started yet.",
}: DeadlineRescueEmailProps) => {
  const previewText = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} due today`;

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
              <Img src="https://planevo.app/logo.png" alt="Planevo" width="48" height="48" className="mx-auto inline-block" />
            </Section>

            <Heading className="text-2xl font-bold mb-4 text-dark">
              Deadline Rescue
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-6 text-left">
              Hey {firstName}! {bodyText}
            </Text>

            <Section className="mb-8">
              <Button
                className="bg-dark text-white font-semibold py-3 px-8 rounded-full no-underline inline-block"
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

export default PlanevoDeadlineRescueEmail;
