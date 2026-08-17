import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get set up | Surfboard Payments",
  description:
    "Confirm your company details and start accepting payments with Surfboard. Most of it is filled in for you.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
