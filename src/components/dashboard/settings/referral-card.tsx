"use client"

import { useState } from "react"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"

export function ReferralCard({
  url,
  referred,
  rewarded,
  earned,
}: {
  url: string
  referred: number
  rewarded: number
  earned: number
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      showToast("Referral link copied", { type: "success" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast("Couldn't copy. Select and copy manually", { type: "error" })
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-sebenta text-xl font-bold text-foreground">
        Refer a roofer. You both get 25 credits
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Share your link. When a roofer you refer signs up and gets verified, you each get
        <strong className="text-foreground"> 25 credits</strong> (valid 4 months).
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Your referral link"
        />
        <Button type="button" onClick={copy} className="shrink-0">
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{referred}</strong> referred</span>
        <span><strong className="text-foreground">{rewarded}</strong> verified</span>
        <span><strong className="text-foreground">{earned}</strong> credits earned</span>
      </div>
    </section>
  )
}
