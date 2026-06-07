import Link from "next/link";
import { cn } from "@/lib/utils";
import { SVGIcon } from "../ui/svg-icon";

type BrandVariant = "default" | "contractor" | "homeowner";

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
        <header className="flex items-center justify-between px-6 lg:px-[1.667vw] py-6 lg:py-[1.667vw] lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 lg:gap-[0.556vw] text-foreground"
          >
            <BrandMark className="size-6 lg:size-[1.667vw]" />
            <span className="text-base lg:text-[1.111vw] font-semibold tracking-tight">
              Homei
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs lg:text-[0.833vw] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 lg:px-[1.667vw] pb-16 lg:pb-[4.444vw] pt-2 lg:pt-[0.556vw]">
          <div className="w-full max-w-lg lg:max-w-[35.552vw]">{children}</div>
        </div>
      </main>
    </div>
  );
}

function BrandPanel({ variant }: { variant: BrandVariant }) {
  const headline =
    variant === "contractor"
      ? "The modern marketplace for professional roofing contractors."
      : variant === "homeowner"
        ? "The right roofer, without the guesswork."
        : "Built for the trades. Ready for the future.";

  const sub =
    variant === "contractor"
      ? "Win better leads, quote faster with AI, and get paid securely. Free for contractors, forever."
      : variant === "homeowner"
        ? "Tell us about your project and we’ll connect you with trusted, vetted pros near you. Free, with no obligation."
        : "Connect with vetted local pros. Compare quotes, book confidently, and pay only when the work is done.";

  return (
    <aside
      className={cn(
        "relative hidden overflow-hidden bg-foreground text-background",
        "lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-[46%] lg:shrink-0 lg:flex-col lg:self-start",
      )}
      style={{
        backgroundImage: "url('/bg/house-lake.avif')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-foreground/30"
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-12 lg:p-[3.333vw]">
        <Link
          href="/"
          className="relative z-10 flex w-fit shrink-0 items-center gap-2 lg:gap-[0.556vw]"
        >
          <SVGIcon src="/icons/logo.svg" className="size-10 lg:size-[2.778vw]" />
        </Link>

        <div className="max-w-md lg:max-w-[31.108vw] space-y-5 lg:space-y-[1.389vw]">
          <h1 className="font-sebenta text-[2.4rem] lg:text-[2.666vw] font-bold leading-[110%] tracking-normal">
            {headline}
          </h1>
          <p className="text-base lg:text-[1.111vw] leading-relaxed text-background/70">{sub}</p>
        </div>

        <p className="text-xs lg:text-[0.833vw] text-background/45">© 2025 Homei, Inc.</p>
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
