export function isTestMode(): boolean {
  return process.env.NEXT_PUBLIC_TEST_MODE === "true";
}
