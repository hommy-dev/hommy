"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DetailDialog } from "@/components/ui/detail-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";
import type { AdminContractorRow, AdminContractorDetail } from "@/lib/data/admin";
import {
  decideVerification,
  grantCreditsToContractor,
  getAdminContractorDetailAction,
} from "@/lib/actions/admin";
import { SearchBox, Th, Td, Pill } from "./leads-table";

const VERIF_STYLE: Record<AdminContractorRow["verificationStatus"], { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
};

export function ContractorsTable({ contractors }: { contractors: AdminContractorRow[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<AdminContractorRow | null>(null);

  const filtered = contractors.filter((c) =>
    query.trim() ? (c.companyName ?? "").toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <SearchBox value={query} onChange={setQuery} placeholder="Search companies…" />
      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No companies match" description="Try a different company name." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Company</Th>
                <Th>Status</Th>
                <Th>Members</Th>
                <Th>Credits</Th>
                <Th>Score</Th>
                <Th>Rating</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setOpen(c)}
                  className="cursor-pointer align-middle transition-colors hover:bg-muted/40"
                >
                  <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{c.companyName ?? "Unnamed company"}</Td>
                  <Td><Pill {...VERIF_STYLE[c.verificationStatus]} /></Td>
                  <Td className="tabular-nums text-muted-foreground">{c.memberCount}</Td>
                  <Td className={cn("tabular-nums", c.creditBalance < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                    {c.creditBalance}
                  </Td>
                  <Td className="tabular-nums text-muted-foreground">{c.profileScore}</Td>
                  <Td className="tabular-nums text-muted-foreground">
                    {c.totalReviews > 0 && c.avgRating ? `${Number(c.avgRating).toFixed(1)} (${c.totalReviews})` : "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt))}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContractorDetailDialog
        contractor={open}
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
      />
    </div>
  );
}

function ContractorDetailDialog({
  contractor,
  open,
  onOpenChange,
}: {
  contractor: AdminContractorRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminContractorDetail | null>(null);
  const [loading, startLoad] = useTransition();
  const [acting, startAction] = useTransition();
  const [grantAmount, setGrantAmount] = useState("");

  function reload(id: string) {
    startLoad(async () => setDetail(await getAdminContractorDetailAction(id)));
  }

  useEffect(() => {
    if (!open || !contractor) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset panel state when the opened contractor changes
    setDetail(null);
    setGrantAmount("");
    reload(contractor.id);
  }, [open, contractor]);

  function verify(decision: "verified" | "rejected") {
    if (!contractor || acting) return;
    startAction(async () => {
      const res = await decideVerification({ contractorId: contractor.id, decision });
      if (res.success) {
        showToast(`Company ${decision}.`, { type: "success" });
        reload(contractor.id);
        router.refresh();
      } else {
        showToast(res.error, { type: "error" });
      }
    });
  }

  function grant() {
    if (!contractor || acting) return;
    const credits = Math.floor(Number(grantAmount));
    if (!Number.isFinite(credits) || credits <= 0) {
      showToast("Enter a positive number of credits.", { type: "warning" });
      return;
    }
    startAction(async () => {
      const res = await grantCreditsToContractor({ contractorId: contractor.id, credits, kind: "adjustment" });
      if (res.success) {
        showToast(`Granted ${credits} credits.`, { type: "success" });
        setGrantAmount("");
        reload(contractor.id);
        router.refresh();
      } else {
        showToast(res.error, { type: "error" });
      }
    });
  }

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contractor?.companyName ?? detail?.companyName ?? "Company"}
    >
      {loading && !detail ? (
        <p className="py-8 lg:py-[2.222vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
      ) : !detail ? (
        <EmptyState
          size="sm"
          icon="danger-triangle"
          title="We couldn't load this company"
          description="Something went wrong. Close this and try again."
        />
      ) : (
        <div className="space-y-6 lg:space-y-[1.667vw]">
          {/* Snapshot + verification */}
          <section className="flex flex-wrap items-center justify-between gap-3 lg:gap-[0.833vw] rounded-lg lg:rounded-[0.694vw] border border-border bg-muted/30 p-4 lg:p-[1.111vw]">
            <dl className="flex flex-wrap gap-x-6 gap-y-2 lg:gap-x-[1.667vw] text-sm lg:text-[0.903vw]">
              <div>
                <dt className="text-muted-foreground">Credits</dt>
                <dd className={cn("font-semibold tabular-nums", detail.creditBalance < 0 && "text-red-600 dark:text-red-400")}>
                  {detail.creditBalance}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Score</dt>
                <dd className="font-semibold tabular-nums">{detail.profileScore}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rating</dt>
                <dd className="font-semibold tabular-nums">
                  {detail.totalReviews > 0 && detail.avgRating ? `${Number(detail.avgRating).toFixed(1)} (${detail.totalReviews})` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Years</dt>
                <dd className="font-semibold tabular-nums">{detail.yearsInBusiness ?? "—"}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-2 lg:gap-[0.556vw]">
              <Pill {...VERIF_STYLE[detail.verificationStatus]} />
              {detail.verificationStatus === "pending" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => verify("rejected")} disabled={acting}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => verify("verified")} disabled={acting}>
                    Verify
                  </Button>
                </>
              ) : null}
            </div>
          </section>

          {/* Adjust credits */}
          <section className="space-y-2 lg:space-y-[0.556vw]">
            <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">Grant credits</h3>
            <div className="flex items-center gap-2 lg:gap-[0.556vw]">
              <input
                type="number"
                min={1}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                placeholder="Credits to add"
                className="h-9 lg:h-[2.5vw] w-40 lg:w-[12vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
              />
              <Button onClick={grant} disabled={acting}>
                {acting ? "Working…" : "Grant"}
              </Button>
            </div>
            <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
              Recorded as an admin adjustment in the ledger — used to settle offline payments.
            </p>
          </section>

          {/* Members */}
          <section className="space-y-2 lg:space-y-[0.556vw]">
            <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
              Members ({detail.members.length})
            </h3>
            <ul className="divide-y divide-border rounded-md lg:rounded-[0.556vw] border border-border">
              {detail.members.map((m) => (
                <li key={m.email} className="flex items-center justify-between gap-3 lg:gap-[0.833vw] px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw]">
                  <div className="min-w-0">
                    <p className="truncate text-sm lg:text-[0.903vw] font-medium text-foreground">{m.name ?? m.email}</p>
                    <p className="truncate text-xs lg:text-[0.764vw] text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="shrink-0 text-xs lg:text-[0.833vw] capitalize text-muted-foreground">
                    {m.role}
                    {m.status !== "active" ? ` · ${m.status}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </DetailDialog>
  );
}
