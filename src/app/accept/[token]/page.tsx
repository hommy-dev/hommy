import { getAcceptView } from "@/lib/data/accept"
import { QuoteDocument } from "@/components/quote/quote-document"
import { AcceptByTokenButton } from "@/components/accept/accept-by-token-button"
import { buttonVariants } from "@/components/ui/button"

export default async function AcceptQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const view = await getAcceptView(token)

  const showQuote = view && view.status === "sent" && view.leadStatus !== "awarded"

  return (
    <main className="flex min-h-svh flex-col items-center bg-canvas px-4 py-10">
      <p className="font-sebenta text-lg font-bold tracking-tight">Hommy</p>

      <div className="mt-6 w-full max-w-xl">
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
        ) : showQuote ? (
          <div className="space-y-5">
            <QuoteDocument
              data={{
                estimateId: view.estimateId,
                status: view.status,
                company: {
                  name: view.contractorName,
                  logoUrl: view.company.logoUrl,
                  licenseNumber: view.company.licenseNumber,
                  insuranceProvider: view.company.insuranceProvider,
                  yearsInBusiness: view.company.yearsInBusiness,
                  verified: view.company.verified,
                  avgRating: view.company.avgRating,
                  totalReviews: view.company.totalReviews,
                },
                serviceName: view.serviceName,
                subtype: view.subtype,
                clientName: null,
                issuedAt: view.issuedAt ? view.issuedAt.toISOString() : null,
                validUntil: view.validUntil ? view.validUntil.toISOString() : null,
                lineItems: view.lineItems,
                subtotal: view.subtotal,
                taxRate: view.taxRate,
                taxAmount: view.taxAmount,
                total: view.total,
                scopeNotes: view.scopeNotes,
                warranty: view.warranty,
              }}
            />

            <div className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
              <AcceptByTokenButton token={token} />
              <a
                href={`/api/quotes/${view.estimateId}/pdf?token=${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "surface", className: "w-full" })}
              >
                Download PDF
              </a>
              <p className="text-center text-xs text-muted-foreground">
                Accepting hires {view.contractorName ?? "this contractor"} and declines the other quotes.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
