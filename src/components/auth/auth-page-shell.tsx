import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/icon";
import { AuthExperienceProvider } from "./auth-experience";
import { ShowcasePanel } from "./showcase-panel";

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
    <AuthExperienceProvider variant={variant}>
      <div
        className={cn(
          "relative flex min-h-svh w-full bg-background text-foreground lg:h-svh lg:overflow-hidden",
          className,
        )}
      >
        {/* Desktop logo pinned top-left */}
        {/* <Link
          href="/"
          aria-label="Hommy home"
          className="absolute left-[2.5vw] top-[2.222vw] z-20 hidden text-foreground lg:inline-flex"
        >
          <Icon name="logo" className="size-10 lg:size-[2vw]" />
        </Link> */}

        {/* Form column */}
        <main className="relative flex flex-1 flex-col lg:h-svh lg:overflow-y-auto ">
          {/* Mobile header */}
          <header className="flex items-center justify-between px-6 py-6 lg:hidden">
            <Link
              href="/"
              aria-label="Hommy home"
              className="inline-flex text-foreground"
            >
              <Icon name="logo" className="size-7" />
            </Link>
            <Link
              href="/"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to site
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-2 lg:px-[1.667vw] lg:pb-[3.333vw] lg:pt-[3vw]">
            <div className="w-full max-w-lg lg:max-w-[31vw]">{children}</div>
          </div>
        </main>

        <ShowcasePanel />
      </div>
    </AuthExperienceProvider>
  );
}
