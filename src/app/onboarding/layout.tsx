import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merchant Onboarding | Surfboard Payments",
  description:
    "Get started accepting payments with Surfboard. Complete your merchant application in under 10 minutes.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
