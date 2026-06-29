"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getDashboardPath } from "@/lib/actions/auth";
import { resetAnalytics } from "@/lib/analytics/client";
import { MenuToggleIcon } from "@/components/ui/menu-icon";
import { Icon, type IconName } from "../ui/icon";

// Roofing services — each opens the post-a-job wizard pre-set to that subtype.
// `subtype` matches the labels stored in services.subtypes (see seed.ts), so the
// wizard preselects it; encodeURIComponent handles the space in "Storm Damage".
type Service = { name: string; subtype: string; icon: IconName; desc: string };
const SERVICES: Service[] = [
  {
    name: "Roof repair",
    subtype: "Repair",
    icon: "wrench",
    desc: "Leaks, missing shingles, quick fixes",
  },
  {
    name: "Roof replacement",
    subtype: "Replacement",
    icon: "swap",
    desc: "Full tear-off and re-roof",
  },
  {
    name: "Storm damage",
    subtype: "Storm Damage",
    icon: "storm",
    desc: "Hail & wind, plus insurance help",
  },
  {
    name: "Roof inspection",
    subtype: "Inspection",
    icon: "search",
    desc: "Know your roof's real condition",
  },
];
const serviceHref = (s: Service) =>
  `/get-a-quote?subtype=${encodeURIComponent(s.subtype)}`;

// Homepage section anchors are absolute (`/#id`) so they work from any page —
// click "How it works" on /roofing and it lands on the homepage section.
type NavItem =
  | { kind: "menu"; name: string }
  | { kind: "link"; name: string; href: string };
const NAV: NavItem[] = [
  { kind: "menu", name: "Services" },
  { kind: "link", name: "Blog", href: "/blog" },
  { kind: "link", name: "For roofers", href: "/contractor" },
];

// Role → dashboard home. Mirrors ROLE_DEFAULT_PATH in src/lib/actions/auth.ts
// and ROLE_HOMES in src/lib/auth/session.ts.
const ROLE_HOMES: Record<string, string> = {
  contractor: "/contractor",
  homeowner: "/homeowner",
  admin: "/admin",
};

// Optimistic dashboard link from user_metadata.role. This is set for
// email/password signups but NOT for OAuth (Google) — those carry the role only
// in the DB `users` row. So we use this for an instant link and then confirm/
// correct it via the getDashboardPath() server action (DB source of truth).
function getDashboardHref(user: User): string {
  const role = user.user_metadata?.role as string | undefined;
  return (role && ROLE_HOMES[role]) || "/";
}

// Homepage anchors are tracked by scroll position; route links are matched
// against the pathname. Both feed the same `activeHref`.
const ANCHOR_LINKS = NAV.filter(
  (n): n is Extract<NavItem, { kind: "link" }> =>
    n.kind === "link" && n.href.includes("#")
);
const ROUTE_LINKS = NAV.filter(
  (n): n is Extract<NavItem, { kind: "link" }> =>
    n.kind === "link" && !n.href.includes("#")
);
const SECTION_IDS = ANCHOR_LINKS.map((l) => l.href.split("#")[1]);
// All plain links (anchors + routes), in nav order — used by the mobile menu.
const LINK_ITEMS = NAV.filter(
  (n): n is Extract<NavItem, { kind: "link" }> => n.kind === "link"
);

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Until the Supabase client confirms the session we don't know which buttons
  // to show, so the auth slot renders a placeholder rather than flashing the
  // signed-out CTAs and then swapping them.
  const [authResolved, setAuthResolved] = useState(false);
  // The dashboard link. Optimistic from metadata, then corrected from the DB
  // role via getDashboardPath() (so OAuth users don't get sent to "/").
  const [dashboardHref, setDashboardHref] = useState("/");

  // Client-side auth state — resolve the user and keep it in sync with sign-in
  // / sign-out happening in other tabs or via the auth flow.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const applyUser = (u: User | null) => {
      if (!active) return;
      setUser(u);
      setAuthResolved(true);
      if (!u) {
        setDashboardHref("/");
        return;
      }
      setDashboardHref(getDashboardHref(u)); // instant (email signups)
      void getDashboardPath()
        .then((path) => {
          if (active && path) setDashboardHref(path); // authoritative (DB role)
        })
        .catch(() => {});
    };

    supabase.auth.getUser().then(({ data }) => applyUser(data.user ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      applyUser(session?.user ?? null)
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetAnalytics(); // drop the PostHog identity so the next user starts fresh
    setIsOpen(false);
    router.refresh();
  };

  // Home: transparent header sitting over the dark hero (light text).
  // Other pages: solid canvas header (dark text) so it reads on a light bg.
  const isHome = pathname === "/";
  // On the home hero the header floats transparent with light text. But when the
  // mobile menu is open we switch to the solid treatment so the dropdown panel
  // (and its links) sit on a real background instead of bleeding through to the
  // hero. Off-home is always solid. `isOpen` is only ever set on mobile, so this
  // never affects the desktop nav.
  const solid = !isHome || isOpen;
  const navText = solid ? "text-foreground" : "text-background";
  const navTextMuted = solid ? "text-foreground/70" : "text-background/80";

  // Scroll-spy: the active link follows the section currently in view, so the
  // underline moves when you actually arrive at a section — never optimistically
  // on click (the one thing the reference header got wrong).
  useEffect(() => {
    if (pathname !== "/") return;
    const sections = SECTION_IDS.map((id) =>
      document.getElementById(id)
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActiveSection(best);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  const activeHref =
    pathname === "/" && activeSection
      ? `/#${activeSection}`
      : ROUTE_LINKS.find((l) => pathname.startsWith(l.href))?.href ?? null;

  // Lock body scroll when the mobile menu is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  return (
    <header
      className={cn(
        "top-0 w-full flex flex-col items-center transition-all duration-300 ease-out",
        solid ? "bg-canvas text-foreground" : "bg-transparent text-background",
        // Open on mobile → a full-screen overlay (fixed + full viewport height)
        // so the menu sits on a full background. Otherwise it floats over the hero.
        isOpen ? "fixed h-svh z-[920]" : "absolute z-50"
      )}
    >
      {/* Main Header Row */}
      <div className="relative lg:max-w-[95vw] mx-auto w-full flex items-center justify-between gap-4 lg:gap-[1.111vw] px-4 lg:px-[1.111vw] md:px-6 py-3.5 lg:py-[0.972vw] mx-auto]">
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex-1 flex gap-2 lg:gap-[0.6vw] items-center"
          aria-label="Hommy home"
        >
          <Icon name="logo" className="size-8 lg:size-[2.5vw]" />
          <span className="font-sebenta text-xl lg:text-[1.5vw] font-bold tracking-tight leading-[100%]">
            Hommy
          </span>
        </Link>

        <DesktopNav activeHref={activeHref} pathname={pathname} />

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-3 lg:gap-[0.833vw] md:gap-4">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 lg:gap-[0.833vw]">
            {!authResolved ? (
              <div
                aria-hidden
                className="h-[42px] lg:h-[2.917vw] w-[180px] lg:w-[12.5vw] animate-pulse rounded-md lg:rounded-[0.556vw] bg-foreground/[0.06]"
              />
            ) : user ? (
              <>
                {/* <button
                  type="button"
                  onClick={handleSignOut}
                  className="relative flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] px-2.5 lg:px-[0.694vw] py-1.5 lg:py-[0.417vw] h-full cursor-pointer transition-all duration-300 text-background/90 hover:hover:text-background hover:bg-foreground/[0.06]"
                >
                  <span className="text-[15px] lg:text-[1.042vw] tracking-wide">Sign out</span>
                </button> */}
                <Link
                  href={dashboardHref}
                  className={cn(
                    "relative flex items-center gap-1.5 lg:gap-[0.417vw] h-full cursor-pointer transition-all duration-300 group border-2 rounded-md lg:rounded-[0.556vw] px-4 lg:px-[1.111vw] py-1.5 lg:py-[0.417vw]",
                    isHome
                      ? "border-background/60 text-background hover:border-background/90"
                      : "border-foreground/30 text-foreground hover:border-foreground/60"
                  )}
                >
                  <span className="text-[15px] lg:text-[1.042vw] tracking-wide">
                    Dashboard
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={cn(
                    "relative flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] px-2.5 lg:px-[0.694vw] py-1.5 lg:py-[0.417vw] h-full cursor-pointer transition-all duration-300 group",
                    pathname === "/auth/login" ? "" : ""
                  )}
                >
                  <span className="text-[15px] lg:text-[1.042vw] tracking-wide">
                    Sign in
                  </span>
                </Link>
                {/* Primary roofer entry point — on-brand gradient border. */}
                <Link
                  href="/auth/signup/contractor"
                  className="relative flex items-center gap-1.5 lg:gap-[0.417vw] h-full cursor-pointer transition-all duration-300 group bg-primary hover:bg-primary/80 text-background rounded-md lg:rounded-[0.556vw] px-5 lg:px-[1.389vw] py-2.5 lg:py-[0.694vw]"
                >
                  <span className="text-[15px] lg:text-[1.042vw]">
                    Join as a roofer
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-4 lg:gap-[1.111vw]">
            {!authResolved ? (
              <div
                aria-hidden
                className="h-[40px] lg:h-[2.778vw] w-[110px] lg:w-[7.639vw] animate-pulse rounded-md lg:rounded-[0.556vw] bg-foreground/[0.06]"
              />
            ) : (
              <Link
                href={user ? dashboardHref : isHome ? "/auth/signup/contractor" : "/get-a-quote"}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center text-center cursor-pointer transition-all duration-300 group bg-foreground hover:bg-foreground/80 text-background rounded-md lg:rounded-[0.556vw] px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw]"
              >
                <span className="text-[12px] lg:text-[0.833vw] text-nowrap">
                  {user ? "Dashboard" : "Join as a roofer"}
                </span>
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "p-1 lg:p-[0.278vw] z-50",
                solid ? "text-foreground" : "text-background"
              )}
              aria-label="Toggle Menu"
              aria-expanded={isOpen}
            >
              <MenuToggleIcon
                open={isOpen}
                className="size-8 lg:size-[2.222vw]"
                stroke="currentColor"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile expanding menu — fills the rest of the viewport when open */}
      <div
        className={cn(
          "w-full border-t border-foreground/5 md:hidden",
          isOpen ? "flex-1 overflow-y-auto" : "max-h-0 overflow-hidden"
        )}
      >
        <nav className="mx-auto flex flex-col gap-1 lg:gap-[0.278vw] px-4 lg:px-[1.111vw] py-8 lg:py-[0.833vw]">
          <p
            className={cn(
              "px-2 lg:px-[0.556vw] pt-1 pb-0.5 text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide",
              navTextMuted
            )}
          >
            Services
          </p>
          {SERVICES.map((s) => (
            <Link
              key={s.subtype}
              href={serviceHref(s)}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-2.5 lg:gap-[0.694vw] rounded-md lg:rounded-[0.556vw] px-2 lg:px-[0.556vw] py-2.5 lg:py-[0.694vw] text-[15px] lg:text-[1.042vw] hover:bg-foreground/5",
                navText
              )}
            >
              <Icon
                name={s.icon}
                className="size-4 lg:size-[1.25vw] shrink-0 opacity-70"
              />
              {s.name}
            </Link>
          ))}
          <Link
            href="/roofers"
            onClick={() => setIsOpen(false)}
            className={cn(
              "rounded-md lg:rounded-[0.556vw] px-2 lg:px-[0.556vw] py-2.5 lg:py-[0.694vw] text-[15px] lg:text-[1.042vw] hover:bg-foreground/5",
              navTextMuted
            )}
          >
            Find roofers near you
          </Link>
          <div className="my-1 lg:my-[0.278vw] h-px bg-foreground/10" />
          {LINK_ITEMS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setIsOpen(false)}
              aria-current={activeHref === l.href ? "page" : undefined}
              className={cn(
                "rounded-md lg:rounded-[0.556vw] px-2 lg:px-[0.556vw] py-2.5 lg:py-[0.694vw] text-[15px] lg:text-[1.042vw] hover:bg-foreground/5",
                activeHref === l.href ? navText : navTextMuted
              )}
            >
              {l.name}
            </Link>
          ))}
          <div className="my-1 lg:my-[0.278vw] h-px bg-foreground/10" />
          {!authResolved ? null : user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                "rounded-md lg:rounded-[0.556vw] px-2 lg:px-[0.556vw] py-2.5 lg:py-[0.694vw] text-left text-[15px] lg:text-[1.042vw] hover:bg-foreground/5",
                navTextMuted
              )}
            >
              Sign out
            </button>
          ) : (
            <>
              {/* Prominent roofer entry point in the full-screen menu. */}
              <Link
                href="/auth/signup/contractor"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] bg-primary px-2 lg:px-[0.556vw] py-2.5 lg:py-[0.694vw] text-[15px] lg:text-[1.042vw] font-semibold text-background transition-colors hover:bg-primary/90"
              >
                <Icon
                  name="work"
                  className="size-4 lg:size-[1.25vw] shrink-0 opacity-70"
                />
                Join as a roofer
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "rounded-md lg:rounded-[0.556vw] px-2 lg:px-[0.556vw] py-2.5 lg:py-[0.694vw] text-[15px] lg:text-[1.042vw] hover:bg-foreground/5",
                  navTextMuted
                )}
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * Desktop nav. The active link is highlighted by weight/color only — driven by
 * where the user actually is (scroll-spy / pathname). The first item is the
 * Services mega-dropdown; the rest are plain links.
 */
function DesktopNav({
  activeHref,
  pathname,
}: {
  activeHref: string | null;
  pathname: string;
}) {
  return (
    <nav className="hidden md:flex items-center gap-8 lg:gap-[2.222vw] h-full md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
      {NAV.map((item) =>
        item.kind === "menu" ? (
          <ServicesMenu key={item.name} name={item.name} pathname={pathname} />
        ) : (
          <Link
            key={item.name}
            href={item.href}
            aria-current={activeHref === item.href ? "page" : undefined}
            className="relative flex items-center gap-1.5 lg:gap-[0.417vw] h-full cursor-pointer group"
          >
            {/* Ghost-bold span keeps the link width stable across active toggles. */}
            <span className="relative inline-block text-[15px] lg:text-[1.042vw] tracking-wide leading-none">
              <span aria-hidden className="invisible">
                {item.name}
              </span>
              <span className="absolute inset-0 transition-colors duration-300 text-nowrap">
                {item.name}
              </span>
            </span>
          </Link>
        )
      )}
    </nav>
  );
}

/**
 * Services dropdown. Opens on hover/focus with a short close delay so moving the
 * pointer from the trigger into the panel doesn't dismiss it. The panel is a
 * solid `bg-background` card (no shadow, `ring-1 ring-foreground/10`, rounded-md)
 * so it reads on either header variant and matches the design system.
 */
function ServicesMenu({ name, pathname }: { name: string; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Trigger reads "active" while browsing the funnel/SEO pages it points into.
  const isActive =
    pathname.startsWith("/get-a-quote") || pathname.startsWith("/roofing");

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <div
      className="relative flex h-full items-center"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1 lg:gap-[0.278vw] h-full cursor-pointer group"
      >
        <span className="text-[15px] lg:text-[1.042vw] tracking-wide leading-none text-nowrap">
          {name}
        </span>
        <Icon
          name="down"
          className={cn(
            "size-3.5 lg:size-[1vw] transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            // pt bridges the gap to the trigger so hover never drops the menu.
            className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 lg:pt-[0.833vw]"
          >
            <div className="w-[340px] lg:w-[24vw] overflow-hidden rounded-md lg:rounded-[0.556vw] bg-background p-1.5 lg:p-[0.417vw] text-foreground ring-1 ring-foreground/10">
              {SERVICES.map((s) => (
                <Link
                  key={s.subtype}
                  href={serviceHref(s)}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 lg:gap-[0.833vw] rounded-sm lg:rounded-[0.347vw] px-2.5 lg:px-[0.694vw] py-2.5 lg:py-[0.694vw] transition-colors hover:bg-foreground/[0.05]"
                >
                  <span className="grid size-9 lg:size-[2.6vw] shrink-0 place-items-center rounded-md lg:rounded-[0.417vw] bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon
                      name={s.icon}
                      className="size-[18px] lg:size-[1.25vw]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14px] lg:text-[0.972vw] font-semibold leading-tight text-foreground">
                      {s.name}
                    </span>
                    <span className="mt-0.5 lg:mt-[0.139vw] text-[12px] lg:text-[0.833vw] leading-snug text-muted-foreground">
                      {s.desc}
                    </span>
                  </span>
                </Link>
              ))}
              <div className="my-1 lg:my-[0.278vw] h-px bg-foreground/10" />
              <Link
                href="/roofers"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 lg:gap-[0.556vw] rounded-sm lg:rounded-[0.347vw] px-2.5 lg:px-[0.694vw] py-2.5 lg:py-[0.694vw] text-[13px] lg:text-[0.903vw] font-semibold text-primary transition-colors hover:bg-foreground/[0.05]"
              >
                Find roofers near you
                <Icon name="arrow-right" className="size-4 lg:size-[1.111vw]" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
