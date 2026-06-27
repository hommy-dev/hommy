import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { HomeownerSignupForm } from "@/components/auth/homeowner-signup-form";
import { ActivityResetKey } from "@/components/auth/activity-reset-key";

export const metadata: Metadata = {
  title: "Sign up | Hommy",
  description:
    "Create a free Hommy account and get matched with vetted local roofers. Compare quotes and pay only when the work is done.",
};

export default function HomeownerSignupPage() {
  return (
    <AuthPageShell variant="homeowner">
      <ActivityResetKey>
        <HomeownerSignupForm />
      </ActivityResetKey>
    </AuthPageShell>
  );
}
