"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { submitFeatureSuggestion } from "@/lib/actions/support"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EditDialog, Field } from "@/components/dashboard/settings/edit-dialog"

// The teaser card's CTA on /contractor/coming-next. A feature suggestion posts a
// card into the user's Hommy Support chat, then drops them into that thread.
export function SuggestFeatureDialog() {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [errors, setErrors] = useState<{ subject?: string; details?: string }>({})

  function reset() {
    setSubject("")
    setDetails("")
    setErrors({})
  }

  async function save(): Promise<boolean> {
    setErrors({})
    const res = await submitFeatureSuggestion({ subject: subject.trim(), details: details.trim() })
    if (!res.success) {
      if (res.fieldErrors) setErrors(res.fieldErrors)
      showToast(res.error, { type: "error" })
      return false
    }
    showToast("Thanks for the idea!", {
      type: "success",
      description: "We've started a thread with you in Support.",
    })
    router.push(`/contractor/messages/${res.data.conversationId}`)
    return true
  }

  return (
    <EditDialog
      title="Suggest a feature"
      description="Tell us what would make Hommy better. It opens a chat with our team so we can follow up."
      triggerLabel="Suggest a feature"
      triggerIcon="lightbulb"
      triggerVariant="inverse"
      triggerSize="default"
      triggerClassName="mt-5 lg:mt-[1.389vw] w-full"
      saveLabel="Send idea"
      canSave={subject.trim().length >= 3 && details.trim().length >= 10}
      onOpen={reset}
      onSave={save}
    >
      <Field label="What's the idea?" error={errors.subject}>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, 140))}
          placeholder="A short title, e.g. Bulk-message my leads"
        />
      </Field>
      <Field
        label="Tell us more"
        hint="What problem would this solve for you? The more detail, the better."
        error={errors.details}
      >
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 4000))}
          rows={5}
          placeholder="Describe what you'd like to be able to do…"
          className="min-h-24 lg:min-h-[10vw]"
        />
      </Field>
    </EditDialog>
  )
}
