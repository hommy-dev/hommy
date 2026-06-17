"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { computeTotals } from "@/lib/estimates/compute";
import { formatCurrency } from "@/lib/format";
import { saveEstimateDraft, sendEstimate } from "@/lib/actions/estimates";

type Row = { label: string; amount: string };

const blankRow = (): Row => ({ label: "", amount: "" });

export function QuoteBuilderDialog({
  projectId,
  triggerLabel = "Build quote",
  triggerClassName,
}: {
  projectId: string;
  triggerLabel?: string;
  /** Override the trigger button styling (e.g. to match a button cluster). */
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [taxRate, setTaxRate] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [estimateId, setEstimateId] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  const items = rows
    .map((r) => ({ label: r.label.trim(), amount: parseFloat(r.amount) || 0 }))
    .filter((r) => r.label.length > 0);
  const totals = computeTotals(items, parseFloat(taxRate) || 0);
  const canSubmit = items.length > 0 && parseFloat(totals.total) > 0;

  function input() {
    return {
      projectId,
      estimateId,
      lineItems: items,
      taxRatePct: parseFloat(taxRate) || 0,
      scopeNotes,
      validDays: Math.max(1, Math.min(365, parseInt(validDays, 10) || 30)),
    };
  }

  function onSaveDraft() {
    if (!canSubmit || pending) return;
    start(async () => {
      const res = await saveEstimateDraft(input());
      if (res.ok) {
        setEstimateId(res.estimateId);
        showToast("Draft saved.", { type: "success" });
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  function onSend() {
    if (!canSubmit || pending) return;
    start(async () => {
      const res = await sendEstimate(input());
      if (res.ok) {
        showToast("Quote sent to the homeowner.", { type: "success" });
        setOpen(false);
        reset();
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  function reset() {
    setRows([blankRow()]);
    setTaxRate("");
    setScopeNotes("");
    setValidDays("30");
    setEstimateId(undefined);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "rounded-md lg:rounded-[0.556vw] bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          }
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg lg:max-w-[36vw]">
        <DialogHeader>
          <DialogTitle>Build a quote</DialogTitle>
          <DialogDescription>
            Add line items, set tax, and send it to the homeowner to review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 lg:space-y-[1.111vw] max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-2 lg:space-y-[0.556vw]">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2 lg:gap-[0.556vw]">
                <input
                  value={row.label}
                  onChange={(e) => setRows((p) => p.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                  placeholder="Description (e.g. Tear-off & disposal)"
                  className="h-9 lg:h-[2.5vw] flex-1 rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
                />
                <div className="relative w-28 lg:w-[9vw]">
                  <span className="pointer-events-none absolute left-2.5 lg:left-[0.694vw] top-1/2 -translate-y-1/2 text-sm lg:text-[0.903vw] text-muted-foreground">
                    $
                  </span>
                  <input
                    value={row.amount}
                    onChange={(e) => setRows((p) => p.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-6 lg:pl-[1.667vw] pr-2 lg:pr-[0.556vw] text-right text-sm lg:text-[0.903vw] tabular-nums outline-none focus-visible:border-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))}
                  aria-label="Remove line"
                  className="grid size-9 lg:size-[2.5vw] shrink-0 place-items-center rounded-md lg:rounded-[0.556vw] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                  disabled={rows.length === 1}
                >
                  <Trash2 className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((p) => [...p, blankRow()])}
              className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.903vw] font-medium text-primary transition-opacity hover:opacity-80"
            >
              <Plus className="size-4 lg:size-[1.111vw]" strokeWidth={2.2} /> Add line
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
            <label className="text-sm lg:text-[0.903vw] text-muted-foreground">Tax rate (%)</label>
            <input
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="h-9 lg:h-[2.5vw] w-24 lg:w-[8vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-right text-sm lg:text-[0.903vw] tabular-nums outline-none focus-visible:border-ring"
            />
          </div>

          <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
            <label className="text-sm lg:text-[0.903vw] text-muted-foreground">Valid for (days)</label>
            <input
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
              inputMode="numeric"
              className="h-9 lg:h-[2.5vw] w-24 lg:w-[8vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-right text-sm lg:text-[0.903vw] tabular-nums outline-none focus-visible:border-ring"
            />
          </div>

          <textarea
            value={scopeNotes}
            onChange={(e) => setScopeNotes(e.target.value)}
            rows={3}
            placeholder="Scope notes (optional) — what's included, materials, timeline…"
            className="w-full resize-none rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
          />

          <dl className="space-y-1 lg:space-y-[0.278vw] rounded-md lg:rounded-[0.556vw] border border-border bg-muted/30 p-3 lg:p-[0.833vw] text-sm lg:text-[0.903vw]">
            <Row2 label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <Row2 label="Tax" value={formatCurrency(totals.taxAmount)} />
            <div className="flex items-center justify-between pt-1 lg:pt-[0.278vw] font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={!canSubmit || pending}
            className="rounded-md lg:rounded-[0.556vw] border border-border bg-card px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSubmit || pending}
            className="rounded-md lg:rounded-[0.556vw] bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Sending…" : "Send quote"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row2({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
