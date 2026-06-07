import Link from "next/link"
import { Arrow } from "./shared"

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
      { href: "#", label: "Privacy" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto px-5 lg:px-[1.389vw] py-16 lg:py-[4.444vw]">
        <div className="grid gap-10 lg:gap-[2.778vw] sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <p className="font-sebenta text-xl lg:text-[1.389vw] font-bold">Homei</p>
            <p className="mt-3 lg:mt-[0.833vw] max-w-xs lg:max-w-[22.22vw] text-sm lg:text-[0.972vw] leading-relaxed text-background/55">
              Home services, done right. Starting with roofing.
            </p>
            <Link
              href="/get-a-quote"
              className="mt-5 lg:mt-[1.389vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] bg-secondary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-secondary-foreground"
            >
              Post a job
              <Arrow />
            </Link>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <p className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-background/45">
                {col.title}
              </p>
              <ul className="mt-4 lg:mt-[1.111vw] space-y-2.5 lg:space-y-[0.694vw]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm lg:text-[0.972vw] text-background/70 transition-colors hover:text-background"
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
        <div className="mt-16 lg:mt-[4.444vw] border-t border-background/10 pt-8 lg:pt-[2.222vw]">
          <p className="font-sebenta text-[18vw] font-bold leading-[0.8] tracking-tighter text-background/10 lg:text-[13.332vw]">
            Homei
          </p>
          <p className="mt-6 lg:mt-[1.667vw] text-xs lg:text-[0.833vw] text-background/45">
            © 2026 Homei. Licensed and insured roofers only.
          </p>
        </div>
      </div>
    </footer>
  )
}
