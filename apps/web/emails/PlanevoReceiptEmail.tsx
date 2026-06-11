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

interface ReceiptEmailProps {
  firstName?: string;
  amount?: string;
  planName?: string;
}

export const PlanevoReceiptEmail = ({
  firstName = "there",
  amount = "9.99",
  planName = "Planevo Premium",
}: ReceiptEmailProps) => {
  const previewText = "Your Planevo payment was successful.";
  const date = new Date().toLocaleDateString();

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
          <Container className="bg-white mx-auto p-10 rounded-2xl border border-[#e8e4de] max-w-[500px] shadow-sm">
            <Section className="mb-4 text-center">
              <Img src="https://planevo.co/logo.png" alt="Planevo" width="48" height="48" className="mx-auto inline-block" />
            </Section>

            <Heading className="text-2xl font-bold mb-4 text-dark text-center">
              Payment Successful
            </Heading>

            <Text className="text-muted text-base leading-relaxed mb-6">
              Hi {firstName}, your payment for Planevo was successful. Thanks for being a premium member!
            </Text>

            <Section className="bg-cream p-6 rounded-xl border border-[#e8e4de] mb-8">
              <Text className="m-0 mb-2 text-dark"><strong>Plan:</strong> {planName}</Text>
              <Text className="m-0 mb-2 text-dark"><strong>Amount:</strong> ${amount}</Text>
              <Text className="m-0 text-dark"><strong>Date:</strong> {date}</Text>
            </Section>

            <Section className="text-center">
              <Button
                className="bg-honey text-dark font-semibold py-3 px-8 rounded-full no-underline inline-block"
                href="https://planevo.co/dashboard"
              >
                Go to Dashboard
              </Button>
            </Section>

            <Text className="text-[#aaa] text-xs mt-8 leading-relaxed text-center">
              The Planevo Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanevoReceiptEmail;
