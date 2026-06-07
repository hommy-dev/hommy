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
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-foreground px-12 lg:px-[3.333vw] py-8 lg:py-[2.222vw] text-background lg:flex">
        <Link href="/" className="relative font-sebenta text-xl lg:text-[1.389vw] font-bold">
          Homei
        </Link>

        <div className="relative max-w-sm lg:max-w-[26.664vw]">
          <h2 className="font-sebenta text-[2.4rem] lg:text-[2.666vw] font-bold leading-[1.05] tracking-tight">
            The right roofer, without the guesswork.
          </h2>
          <p className="mt-4 lg:mt-[1.111vw] text-[15px] lg:text-[1.042vw] leading-relaxed text-background/65">
            Tell us about your project and we’ll connect you with trusted pros
            near you.
          </p>
          <ul className="mt-7 lg:mt-[1.944vw] space-y-3 lg:space-y-[0.833vw]">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 lg:gap-[0.833vw] text-[15px] lg:text-[1.042vw]">
                <span className="flex size-6 lg:size-[1.667vw] shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Check />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs lg:text-[0.833vw] text-background/40">© 2026 Homei</p>
      </aside>

      {/* form side */}
      <main className="flex flex-1 items-center justify-center w-full max-w-md lg:max-w-[31.108vw] mx-auto py-8 lg:py-[2.222vw]">
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
