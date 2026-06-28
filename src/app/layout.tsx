import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { SITE_INDEXABLE, SITE_NAME, SITE_URL } from "@/lib/seo";
import { ogImageUrl } from "@/lib/og";
import { inter, sebenta } from "@/style/font";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { ConsentProvider } from "@/components/consent/consent-context";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { SanityLive } from "@/sanity/live";
import { Suspense } from "react";

const DEFAULT_TITLE = "Hommy: Find a roofer you can actually trust";
const DEFAULT_DESCRIPTION =
  "Hommy connects homeowners with licensed and insured local roofers. Free to post a job, no spam calls, and you choose the roofers you talk to.";

// Default share card for any page that doesn't set its own — the dynamic /og
// route, rendered to match the landing hero. Pages override via ogImageMeta().
const DEFAULT_OG_CARD = ogImageUrl({ title: "Find a roofer you can actually trust" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // `default` is used as-is; child pages that set a string `title` get "%s | Hommy".
  // Pages that want to opt out of the suffix set `title: { absolute: "…" }`.
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Hommy",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_CARD,
        width: 1200,
        height: 630,
        alt: DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_CARD],
  },
  // Pre-launch: keep the whole site out of search engines. Pages inherit this
  // unless they set their own `robots`. Flip SITE_INDEXABLE at launch.
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false, noimageindex: true },
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "scrollbar-thin h-full antialiased font-sans",
        inter.variable,
        sebenta.variable,
      )}
      suppressHydrationWarning
    >
      <body className="antialiased " suppressHydrationWarning>
        <ConsentProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            // enableSystem
            disableTransitionOnChange
          >
            {/* PostHog (posthog-js) and the toast providers (base-ui) read
                `new Date()` / `Math.random()` at module init, which trips Cache
                Components when they're in the prerendered static shell. Keeping
                them inside this Suspense boundary marks the subtree dynamic so
                those calls are allowed. ThemeProvider stays ABOVE the boundary
                so its theme script is in the initial HTML (no flash). This same
                boundary also covers async layouts (auth) — see blocking-route.
                Plain <div> (not <main>): each route group's layout owns the
                single <main> landmark, so this wrapper must not add a second. */}
            <Suspense fallback={null}>
              <PostHogProvider>
                <ToastProvider>
                  <AnchoredToastProvider>
                    <div>{children}</div>
                  </AnchoredToastProvider>
                </ToastProvider>
              </PostHogProvider>
            </Suspense>
          </ThemeProvider>
          <CookieConsent />
        </ConsentProvider>
        {/* Sanity Live Content API — enables real-time content updates */}
        <SanityLive />
      </body>
    </html>
  );
}
