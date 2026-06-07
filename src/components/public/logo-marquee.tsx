// Infinite logo marquee — pure CSS (no JS). Inherits the parent text color, so
// over the dark hero photo the wordmarks read as light/translucent.
//
// PLACEHOLDER wordmarks: swap BRANDS for real <SVGIcon>/<Image> logos when you
// have them (e.g. the roofing manufacturers your pros are certified to install,
// or review platforms). Duplicated once so the -50% translate loops seamlessly.

const BRANDS = [
  "GAF",
  "Owens Corning",
  "CertainTeed",
  "IKO",
  "Malarkey",
  "Atlas",
  "TAMKO",
]

export function LogoMarquee({ className }: { className?: string }) {
  return (
    <div
      className={
        "relative w-full overflow-hidden " +
        "[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] " +
        (className ?? "")
      }
    >
      <div className="flex w-max animate-[homei-marquee_30s_linear_infinite] items-center gap-x-10 sm:gap-x-14">
        {[...BRANDS, ...BRANDS].map((brand, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-[15px] font-semibold uppercase tracking-[0.14em] text-current opacity-60"
          >
            {brand}
          </span>
        ))}
      </div>
      <style>{`@keyframes homei-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}
