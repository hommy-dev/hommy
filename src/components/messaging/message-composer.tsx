'use client'

import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Text composer. Enter sends, Shift+Enter inserts a newline. Auto-grows up to a
 * few lines. The send button sits inside the input pill (iMessage-style); the
 * whole pill carries a single soft border that lights up on focus.
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
  const canSend = value.trim().length > 0 && !disabled

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
    <div className="px-4 pb-4 pt-1 lg:px-[1.111vw] lg:pb-[1.111vw] lg:pt-[0.278vw]">
      <div className="flex items-end gap-2 lg:gap-[0.556vw] rounded lg:rounded-[0.5vw] border border-input bg-card py-1.5 pl-4 pr-1.5 lg:py-[0.417vw] lg:pl-[1.111vw] lg:pr-[0.417vw] transition-colors focus-within:border-ring">
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
          className="max-h-40 lg:max-h-[11vw] min-h-8 lg:min-h-[2.222vw] flex-1 resize-none border-0 bg-transparent py-1 lg:py-[0.278vw] text-sm lg:text-[0.903vw] leading-6 lg:leading-[1.666vw] outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'inline-grid size-8 lg:size-[2.222vw] shrink-0 place-items-center rounded-full transition-all',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <ArrowUp className="size-4 lg:size-[1.111vw]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
