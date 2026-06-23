import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { SITE_INDEXABLE, SITE_NAME, SITE_URL, OG_IMAGE } from "@/lib/seo";
import { inter, sebenta } from "@/style/font";
import { ThemeProvider } from "@/components/theme-provider";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { SanityLive } from "@/sanity/live";
import { Suspense } from "react";

const DEFAULT_TITLE = "Hommy — Find a roofer you can actually trust";
const DEFAULT_DESCRIPTION =
  "Hommy connects homeowners with licensed, insured, background-checked local roofers. Free to post a job, no spam calls — you choose the pros you talk to.";

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
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "A well-kept home with a freshly finished roof",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          // enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <AnchoredToastProvider>
              {/* Boundary for async layouts (auth) under Cache Components — see blocking-route.
                  Plain <div> (not <main>): each route group's own layout owns the single
                  <main> landmark, so this wrapper must not add a second one. */}
              <Suspense fallback={null}>
                <div>{children}</div>
              </Suspense>
            </AnchoredToastProvider>
          </ToastProvider>
        </ThemeProvider>
        {/* Sanity Live Content API — enables real-time content updates */}
        <SanityLive />
      </body>
    </html>
  );
}
