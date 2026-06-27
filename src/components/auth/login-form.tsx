"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  loginAction,
  getOAuthSignInUrl,
  checkEmailRegistered,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useAuthExperience } from "./auth-experience";

type FieldErrors = Record<string, string>;
type EmailStatus = "idle" | "checking" | "new" | "exists";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const experience = useAuthExperience();
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(() => {
    const err = searchParams.get("error");
    return err === "missing_code" || err === "callback"
      ? "That sign-in link expired or is invalid. Please try again."
      : null;
  });
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [pending, startTransition] = useTransition();
  const [googlePending, startGoogle] = useTransition();
  const [showPw, setShowPw] = useState(false);

  const isNew = emailStatus === "new";

  async function handleEmailBlur() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailStatus("idle");
      experience?.reset();
      return;
    }
    setEmailStatus("checking");
    try {
      const res = await checkEmailRegistered(value);
      if (res.exists) {
        setEmailStatus("exists");
        experience?.set(
          "welcome",
          res.role === "contractor"
            ? "contractor"
            : res.role === "homeowner"
            ? "homeowner"
            : null
        );
      } else {
        setEmailStatus("new");
        experience?.set("new-here");
      }
    } catch {
      setEmailStatus("idle");
      experience?.reset();
    }
  }

  function backToSignIn() {
    setEmailStatus("idle");
    setFormError(null);
    experience?.reset();
  }

  function handleGoogle() {
    startGoogle(async () => {
      const res = await getOAuthSignInUrl("google");
      if (!res.success || !res.data?.url) {
        setFormError(
          res.error ?? "Could not start Google sign-in. Please try again."
        );
        return;
      }
      window.location.href = res.data.url;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const redirectToParam = searchParams.get("redirectTo");
      const result = await loginAction(fd);
      if (!result.success) {
        // Tell "no account" apart from "wrong password" so we can guide the
        // newcomer to sign up instead of showing a dead-end error.
        let notFound = false;
        try {
          notFound = !(await checkEmailRegistered(email)).exists;
        } catch {
          notFound = false;
        }
        if (notFound) {
          setEmailStatus("new");
          experience?.set("new-here");
          return;
        }
        setFormError(
          "That email and password don't match an account. Double-check them, or create an account if you're new."
        );
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      const target =
        redirectToParam &&
        redirectToParam.startsWith("/") &&
        !redirectToParam.startsWith("//")
          ? redirectToParam
          : result.data?.redirectTo ?? "/";
      router.push(target);
      router.refresh();
    });
  }

  // ---- "No account" view: focused on getting the newcomer signed up. ----
  if (isNew) {
    return (
      <div className="space-y-7 lg:space-y-[1.944vw]">
        <div className="space-y-2.5 lg:space-y-[0.694vw]">
          <h1 className="font-sebenta text-3xl lg:text-[2.111vw] font-bold leading-tight tracking-tight text-foreground">
            Let&rsquo;s get you started
          </h1>
          <p className="text-sm lg:text-[0.972vw] leading-relaxed text-muted-foreground">
            We couldn&rsquo;t find a Hommy account for{" "}
            <span className="font-medium text-foreground">{email.trim()}</span>.
            Pick what fits you to create one — it takes about two minutes.
          </p>
        </div>

        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
          <AccountCard
            href="/auth/signup/homeowner"
            icon="home"
            title="I want to hire a roofer"
            subtitle="Find vetted roofers & compare quotes"
            highlight
          />
          <AccountCard
            href="/auth/signup/contractor"
            icon="work"
            title="I'm a roofer"
            subtitle="Get new jobs & grow your business"
            highlight
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={backToSignIn}
          className="h-11 lg:h-[3.056vw] w-full gap-2 lg:gap-[0.556vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground hover:text-foreground"
        >
          <Icon
            name="arrow-left"
            className="size-4 lg:size-[1vw] text-muted-foreground transition-colors group-hover:text-foreground"
          />
          Back to sign in
        </Button>
      </div>
    );
  }

  // ---- Default sign-in view ----
  return (
    <div className="space-y-7 lg:space-y-[1.944vw]">
      <div className="space-y-2.5 lg:space-y-[0.3vw]">
        <h1 className="font-sebenta text-3xl lg:text-[2.111vw] font-bold leading-tight tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          Sign in to your Hommy account. New here? Create one below.
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 lg:gap-[0.694vw] rounded-lg lg:rounded-[0.694vw] border border-destructive/30 bg-destructive/5 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]"
        >
          <Icon
            name="danger-circle"
            className="mt-0.5 size-5 lg:size-[1.25vw] shrink-0 text-destructive"
          />
          <p className="text-sm lg:text-[0.903vw] leading-relaxed text-foreground/80">
            {formError}
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={googlePending || pending}
        className="h-11 lg:h-[3.056vw] w-full gap-2.5 lg:gap-[0.694vw] bg-card hover:bg-background hover:border-foreground/40 text-sm lg:text-[0.972vw] font-semibold"
      >
        <Icon
          name="google"
          preserveColors
          className="size-[18px] lg:size-[1.25vw]"
        />
        {googlePending ? "Opening Google…" : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3 lg:gap-[0.833vw] text-xs lg:text-[0.833vw] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 lg:space-y-[1.389vw]"
        noValidate
      >
        <div className="space-y-1.5 lg:space-y-[0.417vw]">
          <Label
            htmlFor="login-email"
            className="text-xs lg:text-[0.833vw] font-medium text-foreground/80"
          >
            Email
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            required
            disabled={pending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className="h-11 lg:h-[3.056vw] bg-card"
            aria-invalid={!!fieldErrors.email}
          />
        </div>

        <div className="space-y-1.5 lg:space-y-[0.417vw]">
          <Label
            htmlFor="login-password"
            className="text-xs lg:text-[0.833vw] font-medium text-foreground/80"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              required
              disabled={pending}
              className="h-11 lg:h-[3.056vw] bg-card pr-11 lg:pr-[3.056vw]"
              aria-invalid={!!fieldErrors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 lg:right-[0.833vw] my-auto flex h-fit items-center text-foreground/45 transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              <Icon
                name={showPw ? "hide" : "show"}
                className="size-5 lg:size-[1.25vw]"
              />
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 lg:h-[3.056vw] w-full text-sm lg:text-[0.972vw] font-semibold"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 lg:px-[0.833vw] text-xs lg:text-[0.833vw] text-muted-foreground">
            New to Hommy?
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
        <AccountCard
          href="/auth/signup/homeowner"
          icon="home"
          title="I want to hire a roofer"
          subtitle="Find vetted roofers & compare quotes"
        />
        <AccountCard
          href="/auth/signup/contractor"
          icon="work"
          title="I'm a roofer"
          subtitle="Get new jobs & grow your business"
        />
      </div>
    </div>
  );
}

function AccountCard({
  href,
  icon,
  title,
  subtitle,
  highlight,
}: {
  href: string;
  icon: "home" | "work";
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 lg:gap-[0.833vw] rounded-lg lg:rounded-[0.694vw] bg-card p-4 lg:p-[1.111vw] transition-colors hover:bg-accent",
        highlight
          ? "gradient-frame [--gf-fill:var(--card)] [--gf-width:1.5px]"
          : "border border-border hover:border-foreground/20"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex size-10 lg:size-[2.778vw] items-center justify-center rounded-md lg:rounded-[0.556vw] bg-primary/10 text-primary">
          <Icon name={icon} className="size-5 lg:size-[1.389vw]" />
        </span>
        <Icon
          name="arrow-right"
          className="size-4 lg:size-[1.111vw] text-muted-foreground transition-colors group-hover:text-foreground"
        />
      </div>
      <span className="flex flex-col gap-0.5 lg:gap-[0.139vw]">
        <span className="text-sm lg:text-[0.972vw] font-semibold text-foreground">
          {title}
        </span>
        <span className="text-xs lg:text-[0.833vw] leading-snug text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
