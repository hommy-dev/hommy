import Link from "next/link";
import { Icon } from "../ui/icon";

const FOOTER = [
  {
    title: "For homeowners",
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "/get-a-quote", label: "Get a quote" },
      { href: "#reviews", label: "Reviews" },
    ],
  },
  {
    title: "For roofers",
    links: [
      { href: "/contractors", label: "Become a pro" },
      { href: "/contractors", label: "How it works" },
      { href: "/auth/login", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#", label: "About" },
      { href: "#", label: "Contact" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="lg:max-w-[90vw] mx-auto px-5 lg:px-[1.389vw] py-16 lg:py-[4.444vw] pb-12 lg:pb-[2vw]">
        <div className="grid gap-10 lg:gap-[2.778vw] sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <p className="font-sebenta text-xl lg:text-[1.389vw] font-bold">
              Hommy
            </p>
            <p className="mt-3 lg:mt-[0.833vw] max-w-xs lg:max-w-[22.22vw] text-sm lg:text-[0.972vw] leading-relaxed">
              Home services, done right. Starting with roofing.
            </p>
            <Link
              href="/get-a-quote"
              className="group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 px-6 lg:px-[1.5vw] py-2.5 lg:py-[0.5vw] text-base lg:text-[1vw] transition-colors hover:border-foreground"
            >
              Post a job
              <Icon
                name="arrow-right"
                className="size-6 lg:size-[1.4vw] transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <p className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider">
                {col.title}
              </p>
              <ul className="mt-4 lg:mt-[1.111vw] space-y-2.5 lg:space-y-[0.694vw]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm lg:text-[0.972vw] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* big wordmark */}
        <div className="mt-8 lg:mt-[2vw] border-t pt-4 lg:pt-[2vw]">
          <p className="text-center text-xs lg:text-[0.833vw]">
            © 2026 Hommy. Licensed and insured roofers only.
          </p>
        </div>
      </div>
    </footer>
  );
}
