"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/billing/packs";
import type { PurchaseIntentRow } from "@/lib/data/admin";
import { grantCreditsToContractor, declinePurchaseIntent } from "@/lib/actions/admin";

const STATUS_STYLE: Record<PurchaseIntentRow["status"], string> = {
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  fulfilled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  declined: "bg-muted text-muted-foreground",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(d),
  );
}

export function CreditGrantsPanel({ intents }: { intents: PurchaseIntentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
      <table className="w-full min-w-[48rem] text-left text-sm lg:text-[0.903vw]">
        <thead className="border-b border-border bg-muted/40 text-xs lg:text-[0.833vw] text-muted-foreground">
          <tr>
            <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">Company</th>
            <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">Requested</th>
            <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">Balance</th>
            <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">When</th>
            <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">Status</th>
            <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {intents.map((i) => (
            <IntentRow key={i.id} intent={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntentRow({ intent }: { intent: PurchaseIntentRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const company = intent.companyName ?? "Unnamed company";

  function grant() {
    start(async () => {
      const res = await grantCreditsToContractor({
        contractorId: intent.contractorId,
        credits: intent.credits,
        kind: "purchase",
        intentId: intent.id,
      });
      if (res.success) {
        showToast(`Granted ${intent.credits} credits to ${company}.`, { type: "success" });
        router.refresh();
      } else {
        showToast(res.error, { type: "error" });
      }
    });
  }

  function decline() {
    start(async () => {
      const res = await declinePurchaseIntent(intent.id);
      if (res.success) {
        showToast("Request dismissed.", { type: "info" });
        router.refresh();
      } else {
        showToast(res.error, { type: "error" });
      }
    });
  }

  return (
    <tr className="align-middle">
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
        <span className="font-medium text-foreground">{company}</span>
        {intent.requestedByEmail ? (
          <span className="block text-xs lg:text-[0.764vw] text-muted-foreground">
            {intent.requestedByName ?? intent.requestedByEmail}
          </span>
        ) : null}
      </td>
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] tabular-nums">
        <span className="font-medium">{intent.credits} cr</span>
        <span className="block text-xs lg:text-[0.764vw] text-muted-foreground">
          {formatCents(intent.amountCents)}
        </span>
      </td>
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] tabular-nums text-muted-foreground">
        {intent.currentBalance}
      </td>
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] whitespace-nowrap text-muted-foreground">
        {formatDate(intent.createdAt)}
      </td>
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
        <span
          className={cn(
            "inline-flex rounded-full px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium capitalize",
            STATUS_STYLE[intent.status],
          )}
        >
          {intent.status}
        </span>
      </td>
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-right whitespace-nowrap">
        {intent.status === "requested" ? (
          <div className="inline-flex items-center gap-2 lg:gap-[0.556vw]">
            <Button size="sm" variant="outline" onClick={decline} disabled={pending}>
              Decline
            </Button>
            <Button size="sm" onClick={grant} disabled={pending}>
              {pending ? "Granting…" : `Grant ${intent.credits}`}
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
