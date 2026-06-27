"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chooseGoogleRole } from "@/lib/actions/auth";
import { showToast } from "@/components/ui/toast";
import { Icon, type IconName } from "@/components/ui/icon";
import { Loading } from "@/components/ui/loading";

type Role = "homeowner" | "contractor";

export function ChooseRole() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Role | null>(null);

  function pick(role: Role) {
    if (pending) return;
    setSelected(role);
    start(async () => {
      const res = await chooseGoogleRole(role);
      if (!res.success) {
        showToast(res.error, { type: "error" });
        setSelected(null);
        return;
      }
      router.push(res.data!.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-7 lg:space-y-[1.944vw]">
      <div className="space-y-2.5 lg:space-y-[0.694vw]">
        <h1 className="font-sebenta text-3xl lg:text-[2.111vw] font-bold leading-tight tracking-tight text-foreground">
          You&rsquo;re almost in
        </h1>
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          One quick question so we can set things up for you. Which sounds like
          you?
        </p>
      </div>

      <div className="space-y-3 lg:space-y-[0.833vw]">
        <RoleCard
          icon="home"
          title="I'm a homeowner"
          subtitle="Get quotes from trusted local roofers. Free, no obligation."
          loading={pending && selected === "homeowner"}
          dimmed={pending && selected !== "homeowner"}
          onClick={() => pick("homeowner")}
        />
        <RoleCard
          icon="work"
          title="I&rsquo;m a roofer"
          subtitle="Get matched with nearby jobs and grow your business."
          loading={pending && selected === "contractor"}
          dimmed={pending && selected !== "contractor"}
          onClick={() => pick("contractor")}
        />
      </div>

      <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
        Not sure? Most people here are homeowners looking for help with their
        place.
      </p>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  subtitle,
  loading,
  dimmed,
  onClick,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  loading: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dimmed || loading}
      className="group flex w-full items-center gap-4 lg:gap-[1.111vw] rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-4 lg:p-[1.25vw] text-left transition-colors hover:border-foreground/25 hover:bg-accent disabled:opacity-50"
    >
      <span className="flex size-12 lg:size-[3.333vw] shrink-0 items-center justify-center rounded-lg lg:rounded-[0.694vw] bg-primary/10 text-primary">
        {loading ? (
          <Loading fill className="size-5 lg:size-[1.389vw]" />
        ) : (
          <Icon name={icon} className="size-6 lg:size-[1.667vw]" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-[0.139vw]">
        <span className="text-base lg:text-[1.111vw] font-semibold text-foreground">
          {title}
        </span>
        <span className="text-xs lg:text-[0.833vw] leading-snug text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <Icon
        name="arrow-right"
        className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
      />
    </button>
  );
}
