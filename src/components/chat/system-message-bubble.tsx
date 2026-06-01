'use client'

/**
 * Renders a SYSTEM chat message — the kind-discriminated bubble that
 * drops into a thread when a server action transitions state.
 *
 * Looks visually distinct from USER bubbles: centered, muted background,
 * small icon header, optional inline-action buttons.
 *
 * For kinds with rich inline reactions (accept-quote, walkthrough-slot,
 * change-order, fix-item, final-approval) we delegate to the matching
 * inline-action component. The rest render as informational lines with
 * a deep-link CTA to the existing structured page where applicable.
 */

import Link from 'next/link'
import {
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileSignature,
  Hammer,
  ListTodo,
  MessageSquareWarning,
  PartyPopper,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Wrench,
} from 'lucide-react'
import type { ChatMessage } from './use-chat-messages'

type Props = {
  message: ChatMessage
  /** "homeowner" | "contractor" — controls what the deep-link CTA points at. */
  viewerRole: 'HOMEOWNER' | 'CONTRACTOR'
}

export function SystemMessageBubble({ message, viewerRole }: Props) {
  const payload = (message.systemPayload ?? {}) as { type?: string }
  const fallback = message.content || 'Activity update'

  const view = renderForType(payload, viewerRole, fallback)

  return (
    <div className="my-3 flex justify-center px-4">
      <div className="flex max-w-[80%] items-start gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div className="mt-0.5 shrink-0 text-primary">{view.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{view.title}</p>
          {view.subtitle ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{view.subtitle}</p>
          ) : null}
          {view.cta ? <div className="mt-1.5">{view.cta}</div> : null}
        </div>
      </div>
    </div>
  )
}

type View = {
  icon: React.ReactNode
  title: string
  subtitle?: string | null
  cta?: React.ReactNode
}

function renderForType(
  payload: { type?: string } & Record<string, unknown>,
  viewerRole: 'HOMEOWNER' | 'CONTRACTOR',
  fallback: string,
): View {
  switch (payload.type) {
    case 'quote.submitted': {
      const total = numberOr(payload.total, 0)
      const currency = stringOr(payload.currency, 'USD')
      const quoteId = stringOr(payload.quoteId, '')
      return {
        icon: <FileSignature className="size-4" />,
        title: 'Quote sent',
        subtitle: formatMoney(total, currency),
        cta:
          viewerRole === 'HOMEOWNER' && quoteId ? (
            <CTALink href={`/homeowner/quotes/${quoteId}`}>Review and accept</CTALink>
          ) : null,
      }
    }
    case 'walkthrough.requested': {
      const slots = Array.isArray(payload.proposedSlots)
        ? (payload.proposedSlots as string[]).slice(0, 3)
        : []
      return {
        icon: <CalendarCheck className="size-4" />,
        title: 'Walkthrough requested',
        subtitle:
          slots.length > 0
            ? `Proposed: ${slots.map((s) => formatSlotShort(s)).join(' · ')}`
            : null,
        cta:
          viewerRole === 'HOMEOWNER' ? (
            <CTALink href="#">Pick a slot</CTALink>
          ) : null,
      }
    }
    case 'walkthrough.confirmed': {
      const at = stringOr(payload.scheduledAt, '')
      return {
        icon: <CheckCircle2 className="size-4 text-green-600" />,
        title: 'Walkthrough confirmed',
        subtitle: at ? formatSlotLong(at) : null,
      }
    }
    case 'quote.accepted': {
      const total = numberOr(payload.agreedAmount, 0)
      const currency = stringOr(payload.currency, 'USD')
      return {
        icon: <PartyPopper className="size-4 text-primary" />,
        title: 'Quote accepted',
        subtitle: `Agreed at ${formatMoney(total, currency)}`,
      }
    }
    case 'deposit.sent': {
      const amt = numberOr(payload.amount, 0)
      const currency = stringOr(payload.currency, 'USD')
      const method = stringOr(payload.method, '')
      return {
        icon: <Wallet className="size-4" />,
        title: 'Deposit sent',
        subtitle: method
          ? `${formatMoney(amt, currency)} via ${method}`
          : formatMoney(amt, currency),
        cta:
          viewerRole === 'CONTRACTOR' ? (
            <span className="text-[11px] italic text-muted-foreground">
              Confirm receipt below
            </span>
          ) : null,
      }
    }
    case 'deposit.received': {
      return {
        icon: <ShieldCheck className="size-4 text-green-600" />,
        title: 'Deposit received',
        subtitle: 'Painter confirmed payment.',
      }
    }
    case 'cooling_off.expired': {
      return {
        icon: <Sparkles className="size-4" />,
        title: 'Cooling-off ended',
        subtitle: 'You can begin work.',
      }
    }
    case 'job.started': {
      return {
        icon: <Hammer className="size-4" />,
        title: 'Job started',
      }
    }
    case 'change_order.proposed': {
      const reason = stringOr(payload.reason, '')
      const delta = numberOr(payload.amountDelta, 0)
      const currency = stringOr(payload.currency, 'USD')
      return {
        icon: <ClipboardList className="size-4" />,
        title: 'Change order proposed',
        subtitle: `${reason ? reason + ' · ' : ''}${formatMoney(delta, currency, true)}`,
      }
    }
    case 'change_order.accepted': {
      return {
        icon: <CheckCircle2 className="size-4 text-green-600" />,
        title: 'Change order accepted',
      }
    }
    case 'change_order.rejected': {
      return {
        icon: <MessageSquareWarning className="size-4 text-amber-600" />,
        title: 'Change order rejected',
      }
    }
    case 'change_order.withdrawn': {
      return {
        icon: <MessageSquareWarning className="size-4 text-muted-foreground" />,
        title: 'Change order withdrawn',
      }
    }
    case 'fix_item.flagged': {
      const label = stringOr(payload.label, 'fix item')
      return {
        icon: <Wrench className="size-4 text-amber-600" />,
        title: 'Item flagged for fix',
        subtitle: label,
      }
    }
    case 'fix_item.fixed': {
      const label = stringOr(payload.label, '')
      return {
        icon: <CheckCircle2 className="size-4 text-green-600" />,
        title: 'Item marked fixed',
        subtitle: label || null,
      }
    }
    case 'job.complete': {
      return {
        icon: <ListTodo className="size-4" />,
        title: 'Painter marked job complete',
        subtitle:
          viewerRole === 'HOMEOWNER'
            ? 'Approve the work or flag items to fix.'
            : 'Waiting for homeowner approval.',
      }
    }
    case 'payment.released': {
      const amt = numberOr(payload.amount, 0)
      const currency = stringOr(payload.currency, 'USD')
      return {
        icon: <CircleDollarSign className="size-4 text-green-600" />,
        title: 'Payment released',
        subtitle: formatMoney(amt, currency),
      }
    }
    case 'review.window_opens': {
      return {
        icon: <Star className="size-4" />,
        title: 'Reviews open',
        subtitle: 'Both sides can leave a review.',
      }
    }
    case 'review.go_live': {
      return {
        icon: <Star className="size-4 text-primary" />,
        title: 'Reviews are now public',
      }
    }
    default: {
      return {
        icon: <Receipt className="size-4" />,
        title: fallback,
      }
    }
  }
}

function CTALink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  )
}

function stringOr(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}
function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}
function formatMoney(n: number, currency: string, signed = false): string {
  try {
    const fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    return fmt.format(n)
  } catch {
    return `${currency} ${n.toFixed(0)}`
  }
}
function formatSlotShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
function formatSlotLong(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
