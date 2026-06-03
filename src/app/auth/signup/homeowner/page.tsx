import type { Metadata } from "next";
import Link from "next/link";
import { HomeownerSignupForm } from "@/components/auth/homeowner-signup-form";
import { ActivityResetKey } from "@/components/auth/activity-reset-key";

export const metadata: Metadata = {
  title: "Sign up | Homei",
  description:
    "Create a free Homei account and get matched with vetted local roofers. Compare quotes and pay only when the work is done.",
};

const POINTS = [
  "Matched with vetted local roofers",
  "Compare quotes side by side",
  "Free, with no obligation to hire",
];

export default function HomeownerSignupPage() {
  return (
    <div className="flex min-h-svh bg-canvas text-foreground">
      {/* brand panel */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-foreground px-12 py-8 text-background lg:flex">
        <Link href="/" className="relative font-sebenta text-xl font-bold">
          Homei
        </Link>

        <div className="relative max-w-sm">
          <h2 className="font-sebenta text-[2.4rem] font-bold leading-[1.05] tracking-tight">
            The right roofer, without the guesswork.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-background/65">
            Tell us about your project and we’ll connect you with trusted pros
            near you.
          </p>
          <ul className="mt-7 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Check />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-background/40">© 2026 Homei</p>
      </aside>

      {/* form side */}
      <main className="flex flex-1 items-center justify-center w-full max-w-md mx-auto py-8">
        <ActivityResetKey>
          <HomeownerSignupForm />
        </ActivityResetKey>
      </main>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
