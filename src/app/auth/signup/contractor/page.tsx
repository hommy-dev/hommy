import type { Metadata } from "next";
import Link from "next/link";
import { ContractorSignupForm } from "@/components/auth/contractor-signup-form";
import { ActivityResetKey } from "@/components/auth/activity-reset-key";

export const metadata: Metadata = {
  title: "Become a Hommy roofer",
  description:
    "Join Hommy and get matched with homeowners who need roofing work. No charge to receive a lead. Pay only when you win the job.",
};

const POINTS = [
  "No charge to receive a lead",
  "Pay only when you win the job",
  "A CRM built for how roofers really work",
];

export default async function ContractorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <div className="flex min-h-svh bg-canvas text-foreground">
      {/* brand panel */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-foreground px-12 lg:px-[3.333vw] py-8 lg:py-[2.222vw] text-background lg:flex">
        <Link href="/" className="relative font-sebenta text-xl lg:text-[1.389vw] font-bold">
          Hommy
        </Link>

        <div className="relative max-w-sm lg:max-w-[26.664vw]">
          <h2 className="font-sebenta text-[2.4rem] lg:text-[2.666vw] font-bold leading-[110%] tracking-normal">
            Real leads. No upfront cost.
          </h2>
          <p className="mt-4 lg:mt-[1.111vw] text-[15px] lg:text-[1.042vw] leading-relaxed text-background/65">
            Get matched with homeowners near you who actually need work done.
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

        <p className="relative text-xs lg:text-[0.833vw] text-background/40">© 2026 Hommy</p>
      </aside>

      {/* form side */}
      <main className="flex flex-1 items-center justify-center w-full max-w-md lg:max-w-[31.108vw] mx-auto py-8 lg:py-[2.222vw]">
        <ActivityResetKey>
          <ContractorSignupForm referralCode={ref} />
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
