import type { Metadata } from "next";
import Link from "next/link";
import { ContractorSignupForm } from "@/components/auth/contractor-signup-form";
import { ActivityResetKey } from "@/components/auth/activity-reset-key";

export const metadata: Metadata = {
  title: "Become a Homei roofer",
  description:
    "Join Homei and get matched with homeowners who need roofing work. No charge to receive a lead. Pay only when you win the job.",
};

const POINTS = [
  "No charge to receive a lead",
  "Pay only when you win the job",
  "A CRM built for how roofers really work",
];

export default function ContractorSignupPage() {
  return (
    <div className="flex min-h-svh bg-canvas text-foreground">
      {/* brand panel */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-foreground px-12 py-8 text-background lg:flex">
        <Link href="/" className="relative font-sebenta text-xl font-bold">
          Homei
        </Link>

        <div className="relative max-w-sm">
          <h2 className="font-sebenta text-[2.4rem] font-bold leading-[110%] tracking-normal">
            Real leads. No upfront cost.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-background/65">
            Get matched with homeowners near you who actually need work done.
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
          <ContractorSignupForm />
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
