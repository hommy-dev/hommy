import { SiteFooter } from "@/components/landing-page/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { AnnouncementBar } from "@/components/public/announcement-bar";

/** Shared chrome for the public marketing site: header, footer, and the
 *  pre-launch "early access" bar. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <AnnouncementBar />
    </div>
  );
}
