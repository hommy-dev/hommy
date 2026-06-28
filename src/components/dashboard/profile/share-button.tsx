"use client"

// Share the public company profile. Uses the native share sheet on devices that
// support it (mobile), and falls back to copying the link on desktop.

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { showToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function ShareButton({
  url,
  title,
  label = "Share",
  className,
}: {
  url: string
  title?: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      // Native share sheet. A cancel rejects — we just swallow it (no fallback).
      try {
        await navigator.share({ title, url })
      } catch {
        /* dismissed */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      showToast("Profile link copied", { type: "success" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast("Couldn't copy the link", { type: "error" })
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      <Icon
        name={copied ? "tick" : "send"}
        className={cn("size-4 lg:size-[1.111vw]", copied && "text-primary")}
      />
      {copied ? "Copied" : label}
    </button>
  )
}
