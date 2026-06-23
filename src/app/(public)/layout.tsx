import { SiteFooter } from "@/components/landing-page/site-footer";
import { SiteHeader } from "@/components/public/site-header";

/** Shared chrome for the blog: a light top bar + the site footer. */
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
