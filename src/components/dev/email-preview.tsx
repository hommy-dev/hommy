"use client"

import { useState } from "react"
import { EMAIL_SAMPLES } from "@/lib/notifications/email/preview"

/**
 * Sandbox-only previewer for the shared transactional-email layout.
 * Renders each real template's HTML inside an isolated <iframe srcDoc>
 * so the app's CSS can't leak in — what you see is what an inbox renders.
 */
export function EmailPreview() {
  const [sampleId, setSampleId] = useState(EMAIL_SAMPLES[0].id)
  const [mobile, setMobile] = useState(false)

  const sample =
    EMAIL_SAMPLES.find((s) => s.id === sampleId) ?? EMAIL_SAMPLES[0]

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 lg:gap-[0.833vw]">
        <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
          {EMAIL_SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSampleId(s.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors lg:text-[0.903vw] ${
                s.id === sampleId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMobile((m) => !m)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted lg:text-[0.903vw]"
        >
          {mobile ? "Mobile width" : "Desktop width"}
        </button>
      </div>

      {/* Preview */}
      <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-white">
        <iframe
          key={sample.id}
          title={sample.label}
          srcDoc={sample.html}
          className="block h-[680px] w-full border-0"
          style={{ maxWidth: mobile ? 390 : 640 }}
        />
      </div>
    </div>
  )
}
