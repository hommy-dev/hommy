import Link from "next/link";
import { cn } from "@/lib/utils";
import { SVGIcon } from "../ui/svg-icon";

type BrandVariant = "default" | "contractor";

interface AuthPageShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: BrandVariant;
}

export function AuthPageShell({
  children,
  className,
  variant = "default",
}: AuthPageShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-svh w-full bg-background text-foreground",
        className,
      )}
    >
      <BrandPanel variant={variant} />

      <main className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-6 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground"
          >
            <BrandMark className="size-6" />
            <span className="text-base font-semibold tracking-tight">
              RoofLink
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-2">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </main>
    </div>
  );
}

function BrandPanel({ variant }: { variant: BrandVariant }) {
  const headline =
    variant === "contractor"
      ? "The modern marketplace for professional roofing contractors."
      : "Built for the trades. Ready for the future.";

  const sub =
    variant === "contractor"
      ? "Win better leads, quote faster with AI, and get paid securely. Free for contractors, forever."
      : "Connect with vetted local pros. Compare quotes, book confidently, and pay only when the work is done.";

  return (
    <aside
      className={cn(
        "relative hidden overflow-hidden bg-foreground text-background",
        "lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-[46%] lg:shrink-0 lg:flex-col lg:self-start",
      )}
      style={{
        backgroundImage: "url('/images/handshake.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-foreground/30"
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <Link
          href="/"
          className="relative z-10 flex w-fit shrink-0 items-center gap-2"
        >
          <SVGIcon src="/icons/logo.svg" className="size-10" />
        </Link>

        {/* <div className="max-w-md space-y-10">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight">
              {headline}
            </h1>
            <p className="text-base leading-relaxed text-background/70">
              {sub}
            </p>
          </div>

        </div> */}

        <p className="text-xs text-background/45">© 2025 RoofLink, Inc.</p>
      </div>
    </aside>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect
        x="2.25"
        y="3"
        width="13.5"
        height="8"
        rx="2"
        className="fill-current"
      />
      <rect
        x="16.5"
        y="5.25"
        width="3"
        height="3.5"
        rx="0.75"
        className="fill-current opacity-70"
      />
      <path
        d="M9 11v3.25a3 3 0 0 0 3 3"
        className="stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="20" r="1.75" className="fill-current" />
    </svg>
  );
}
