"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { acceptEstimateByToken } from "@/lib/actions/accept-estimate";

/** Public accept button — token authorizes. Refreshes into the accepted state. */
export function AcceptByTokenButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function accept() {
    if (pending) return;
    start(async () => {
      const res = await acceptEstimateByToken(token);
      if (res.ok) {
        showToast("Quote accepted. You're all set!", { type: "success" });
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={accept}
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Accepting…" : "Accept this quote"}
    </button>
  );
}
