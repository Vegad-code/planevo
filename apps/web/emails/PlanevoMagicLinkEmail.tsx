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

interface MagicLinkEmailProps {
  confirmationUrl?: string;
}

export const PlanevoMagicLinkEmail = ({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: MagicLinkEmailProps) => {
  const previewText = "Your magic link to log in to Planevo.";

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
              Log in to Planevo
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-8">
              You requested a magic link to sign in. Click the button below to instantly log in to your account. No password required!
            </Text>

            <Section className="mb-8">
              <Button
                className="bg-dark text-white font-semibold py-3 px-8 rounded-full no-underline inline-block"
                href={confirmationUrl}
              >
                Sign In to Planevo
              </Button>
            </Section>

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed">
              This link expires soon. If you didn't request this, you can safely ignore this email.<br />
              The Planevo Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanevoMagicLinkEmail;
