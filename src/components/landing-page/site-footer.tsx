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
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <p className="font-sebenta text-xl font-bold">Homei</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-background/55">
              Home services, done right. Starting with roofing.
            </p>
            <Link
              href="/get-a-quote"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
            >
              Post a job
              <Arrow />
            </Link>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-background/45">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-background/70 transition-colors hover:text-background"
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
        <div className="mt-16 border-t border-background/10 pt-8">
          <p className="font-sebenta text-[18vw] font-bold leading-[0.8] tracking-tighter text-background/10 lg:text-[12rem]">
            Homei
          </p>
          <p className="mt-6 text-xs text-background/45">
            © 2026 Homei. Licensed and insured roofers only.
          </p>
        </div>
      </div>
    </footer>
  )
}
