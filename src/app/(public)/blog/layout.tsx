import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing-page/site-footer";

/** Shared chrome for the blog: a light top bar + the site footer. */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-sebenta text-xl font-bold tracking-tight">
              Hommy
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Journal
            </Link>
          </div>
          <Button asChild size="sm">
            <Link href="/get-a-quote">Get a quote</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
