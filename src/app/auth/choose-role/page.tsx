import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getRequiredUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ChooseRole } from "@/components/auth/choose-role";

export const metadata: Metadata = {
  title: "Choose your account type",
};

const ROLE_HOMES: Record<string, string> = {
  contractor: "/contractor",
  homeowner: "/homeowner",
  admin: "/admin",
};

export default async function ChooseRolePage() {
  // Must have a valid session (redirects to /auth/login otherwise).
  const userId = await getRequiredUserId();

  // If they already have a profile, they don't belong here — send them home.
  const [profile] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (profile) {
    redirect(ROLE_HOMES[profile.role] ?? "/");
  }

  return (
    <AuthPageShell variant="default">
      <ChooseRole />
    </AuthPageShell>
  );
}
