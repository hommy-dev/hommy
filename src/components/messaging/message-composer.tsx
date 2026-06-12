'use client'

import { useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'

/**
 * Text composer. Enter sends, Shift+Enter inserts a newline. Auto-grows up to a
 * few lines. Disabled while a send is in flight.
 */
export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (body: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const body = value.trim()
    if (!body || disabled) return
    onSend(body)
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  function grow() {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="flex items-end gap-2 lg:gap-[0.556vw] border-t border-border bg-background p-3 lg:p-[0.833vw]">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        onChange={(e) => {
          setValue(e.target.value)
          grow()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Write a message…"
        className="max-h-40 lg:max-h-[11vw] min-h-9 lg:min-h-[2.5vw] flex-1 resize-none rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
        className="grid size-9 lg:size-[2.5vw] shrink-0 place-items-center rounded-md lg:rounded-[0.556vw] bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <SendHorizontal className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
      </button>
    </div>
  )
}
