import { getAcceptView } from "@/lib/data/accept"
import { formatCurrency, formatDate } from "@/lib/format"
import { AcceptByTokenButton } from "@/components/accept/accept-by-token-button"

export default async function AcceptQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const view = await getAcceptView(token)

  return (
    <main className="flex min-h-svh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <p className="font-sebenta text-lg font-bold tracking-tight">Homei</p>

        {!view ? (
          <Notice
            title="Link not found"
            body="This acceptance link is invalid or has expired. Please check your email for the latest one."
          />
        ) : view.status === "accepted" ? (
          <Notice
            title="You're all set"
            body={`You've accepted ${view.contractorName ?? "this contractor"}'s quote. They'll be in touch to schedule the work.`}
          />
        ) : view.leadStatus === "awarded" ? (
          <Notice
            title="Already decided"
            body="This request has already been awarded to another contractor."
          />
        ) : view.status !== "sent" ? (
          <Notice title="Quote unavailable" body="This quote can no longer be accepted." />
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">
                {view.contractorName ?? "A contractor"} sent you a quote for{" "}
                {view.subtype ?? view.serviceName}.
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {formatCurrency(view.total ?? "0")}
              </p>
            </div>

            <ul className="space-y-1.5 rounded-md border border-border bg-muted/30 p-4 text-sm">
              {view.lineItems.map((li, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-muted-foreground">
                  <span className="truncate">{li.label}</span>
                  <span className="tabular-nums">{formatCurrency(li.amount)}</span>
                </li>
              ))}
            </ul>

            {view.scopeNotes ? (
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{view.scopeNotes}</p>
            ) : null}

            <p className="text-xs text-muted-foreground">Valid until {formatDate(view.validUntil)}</p>

            <AcceptByTokenButton token={token} />
            <p className="text-center text-xs text-muted-foreground">
              Accepting hires {view.contractorName ?? "this contractor"} and declines the other quotes.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
