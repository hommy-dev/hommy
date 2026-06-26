// Static trust row for the hero — honest, day-one-true signals (vetting + model),
// shown as understated icon + label items over the dark hero photo. No animation:
// it sits quietly under the subheadline and lets the CTA lead.
//
// Swap/extend TRUST as the product grows (e.g. add "4.9 ★ from 200+ homeowners"
// once reviews exist).

import { Icon, type IconName } from "@/components/ui/icon"

const TRUST: { icon: IconName; label: string }[] = [
  { icon: "shield-done", label: "Licensed & insured" },
  { icon: "badge-check", label: "Verified" },
  { icon: "discount", label: "Free quotes" },
  { icon: "location", label: "Local roofers" },
]

export function HeroTrust({ className }: { className?: string }) {
  return (
    <ul
      className={
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:gap-x-[1.667vw] " +
        (className ?? "")
      }
    >
      {TRUST.map((t) => (
        <li
          key={t.label}
          className="inline-flex items-center gap-2 lg:gap-[0.417vw] whitespace-nowrap text-sm lg:text-[0.972vw] font-medium tracking-tight text-current/85"
        >
          <Icon name={t.icon} className="size-4 lg:size-[1.111vw] shrink-0 text-current/70" />
          {t.label}
        </li>
      ))}
    </ul>
  )
}
