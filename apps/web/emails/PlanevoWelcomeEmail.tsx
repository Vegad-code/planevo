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

interface WelcomeEmailProps {
  confirmationUrl?: string;
  firstName?: string;
}

export const PlanevoWelcomeEmail = ({
  confirmationUrl = "{{ .ConfirmationURL }}",
  firstName = "there",
}: WelcomeEmailProps) => {
  const previewText = "Welcome to Planevo! Verify your email to get started.";

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
              Welcome to Planevo, {firstName}!
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-6">
              We are absolutely thrilled to have you here. Planevo was built to help you master your day and find focus without the pressure. We can&apos;t wait to see what you achieve.
            </Text>

            <Text className="text-muted text-base leading-relaxed mb-8">
              To dive in and get started, please verify your email address below:
            </Text>

            <Section className="mb-8">
              <Button
                className="bg-honey text-dark font-semibold py-3 px-8 rounded-full no-underline inline-block"
                href={confirmationUrl}
              >
                Verify My Email
              </Button>
            </Section>

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed">
              If you didn&apos;t create this account, you can safely ignore this email.<br />
              The Planevo Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanevoWelcomeEmail;
