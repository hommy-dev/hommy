"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#why", label: "Why Homei" },
  { href: "#reviews", label: "Reviews" },
  { href: "/contractors", label: "For roofers" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/5 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link
          href="/"
          className="font-sebenta text-xl font-bold tracking-tight text-foreground"
          aria-label="Homei home"
        >
          Homei
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden text-sm font-medium text-foreground/65 transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="#quote"
            className="hidden rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
          >
            Get my quotes
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex size-9 items-center justify-center rounded-full text-foreground md:hidden"
          >
            <Burger open={open} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-foreground/5 md:hidden",
          open ? "max-h-80" : "max-h-0",
          "transition-[max-height] duration-300 ease-out",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-[15px] font-medium text-foreground/80 hover:bg-foreground/5"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="#quote"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background"
          >
            Get my quotes
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Burger({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
