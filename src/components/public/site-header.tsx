"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { MenuToggleIcon } from "@/components/ui/menu-icon"

const LINKS = [
  { name: "How it works", href: "#how-it-works" },
  { name: "Why Homei", href: "#why" },
  { name: "Reviews", href: "#reviews" },
  { name: "For roofers", href: "/contractors" },
]

// Role → dashboard home. Mirrors ROLE_DEFAULT_PATH in src/lib/actions/auth.ts
// and ROLE_HOMES in src/lib/auth/session.ts.
const ROLE_HOMES: Record<string, string> = {
  contractor: "/contractor",
  homeowner: "/homeowner",
  admin: "/admin",
}

// Role is stamped into Supabase user_metadata at signup (auth.ts) and by the
// admin script, so the marketing header can resolve the dashboard link
// client-side without a DB round-trip.
function getDashboardHref(user: User): string {
  const role = user.user_metadata?.role as string | undefined
  return (role && ROLE_HOMES[role]) || "/"
}

// In-page anchors are tracked by scroll position; the "/contractors" route is
// matched against the pathname. Both feed the same `activeHref`.
const SECTION_IDS = LINKS.filter((l) => l.href.startsWith("#")).map((l) =>
  l.href.slice(1),
)

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  // Until the Supabase client confirms the session we don't know which buttons
  // to show, so the auth slot renders a placeholder rather than flashing the
  // signed-out CTAs and then swapping them.
  const [authResolved, setAuthResolved] = useState(false)

  // Client-side auth state — resolve the user and keep it in sync with sign-in
  // / sign-out happening in other tabs or via the auth flow.
  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user ?? null)
      setAuthResolved(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setAuthResolved(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsOpen(false)
    router.refresh()
  }

  const dashboardHref = user ? getDashboardHref(user) : "/"

  // Scroll-spy: the active link follows the section currently in view, so the
  // underline moves when you actually arrive at a section — never optimistically
  // on click (the one thing the reference header got wrong).
  useEffect(() => {
    if (pathname !== "/") return
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (sections.length === 0) return

    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        let best: string | null = null
        let bestRatio = 0
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id
            bestRatio = ratio
          }
        }
        setActiveSection(best)
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    )

    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [pathname])

  const activeHref =
    pathname === "/"
      ? activeSection
        ? `#${activeSection}`
        : null
      : LINKS.find((l) => l.href !== "/" && pathname.startsWith(l.href))?.href ??
        null

  // Lock body scroll when the mobile menu is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 flex justify-center transition-all duration-300 ease-out",
        isOpen ? "z-[920]" : "z-50",
      )}
    >
      <div className="relative mx-auto w-full xl:max-w-[90vw]">
        {/* Inverted (concave) top corners — flare the island into the top edge (desktop) */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 hidden size-6 -translate-x-full lg:block"
          style={{ background: "radial-gradient(circle at bottom left, transparent 24px, rgba(0,0,0,0.72) 25px)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 hidden size-6 translate-x-full lg:block"
          style={{ background: "radial-gradient(circle at bottom right, transparent 24px, rgba(0,0,0,0.72) 25px)" }}
        />

        {/* Centered dark glass island — flush top, inverted top corners, rounded bottom */}
        <div
          className="flex w-full flex-col overflow-hidden rounded-b-2xl"
          style={{
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.45)",
          }}
        >
          {/* Main Header Row */}
          <div className="relative flex w-full items-center justify-between gap-4 px-4 py-3.5 md:px-6">
            {/* Left: Logo */}
            <div className="flex flex-1 items-center">
              <Link
                href="/"
                className="font-sebenta text-xl font-bold tracking-tight text-white"
                aria-label="Homei home"
              >
                Homei
              </Link>
            </div>

            <DesktopNav links={LINKS} activeHref={activeHref} />

            {/* Right: Actions */}
            <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
              {/* Desktop Actions */}
              <div className="hidden items-center gap-2 md:flex">
                {!authResolved ? (
                  <div aria-hidden className="h-[42px] w-[170px] animate-pulse rounded-md bg-white/10" />
                ) : user ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="cursor-pointer rounded-md px-3 py-2 text-[15px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Sign out
                    </button>
                    <Link
                      href={dashboardHref}
                      className="rounded-md bg-white px-5 py-2.5 text-[15px] font-semibold text-[#111] transition-colors hover:bg-white/90"
                    >
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className={cn(
                        "rounded-md px-3 py-2 text-[15px] transition-colors hover:bg-white/10 hover:text-white",
                        pathname === "/auth/login" ? "bg-white/10 text-white" : "text-white/80",
                      )}
                    >
                      Sign in
                    </Link>
                    <Link
                      href="#quote"
                      className="rounded-md bg-white px-5 py-2.5 text-[15px] font-semibold text-[#111] transition-colors hover:bg-white/90"
                    >
                      Get my quotes
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center gap-3 md:hidden">
                {!authResolved ? (
                  <div aria-hidden className="h-[40px] w-[110px] animate-pulse rounded-md bg-white/10" />
                ) : (
                  <Link
                    href={user ? dashboardHref : "#quote"}
                    onClick={() => setIsOpen(false)}
                    className="rounded-md bg-white px-4 py-2.5 text-[12px] font-semibold text-[#111]"
                  >
                    {user ? "Dashboard" : "Get my quotes"}
                  </Link>
                )}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="z-50 p-1 text-white"
                  aria-label="Toggle Menu"
                  aria-expanded={isOpen}
                >
                  <MenuToggleIcon open={isOpen} className="size-8" stroke="#fff" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile expanding menu */}
          <div
            className={cn(
              "w-full overflow-hidden border-t border-white/10 md:hidden",
              isOpen ? "max-h-96" : "max-h-0",
              "transition-[max-height] duration-300 ease-out",
            )}
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={activeHref === l.href ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-2.5 text-[15px] font-medium hover:bg-white/10",
                    activeHref === l.href ? "text-white" : "text-white/75",
                  )}
                >
                  {l.name}
                </Link>
              ))}
              {!authResolved ? null : user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md px-2 py-2.5 text-left text-[15px] font-medium text-white/75 hover:bg-white/10"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-2 py-2.5 text-[15px] font-medium text-white/75 hover:bg-white/10"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Desktop nav. The active link is highlighted by weight/color only — driven by
 * where the user actually is (scroll-spy / pathname).
 */
function DesktopNav({
  links,
  activeHref,
}: {
  links: { name: string; href: string }[]
  activeHref: string | null
}) {
  return (
    <nav className="hidden md:flex items-center gap-8 h-full md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
      {links.map((link) => {
        const isActive = activeHref === link.href
        return (
          <Link
            key={link.name}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className="relative flex items-center gap-1.5 h-full cursor-pointer group"
          >
            {/* Ghost-bold span keeps the link width stable across active toggles. */}
            <span className="relative inline-block text-[15px] tracking-wide leading-none">
              <span aria-hidden className="invisible font-medium">
                {link.name}
              </span>
              <span
                className={cn(
                  "absolute inset-0 transition-colors duration-300",
                  isActive
                    ? "font-medium text-white"
                    : "font-normal text-white/75 group-hover:font-medium group-hover:text-white",
                )}
              >
                {link.name}
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
