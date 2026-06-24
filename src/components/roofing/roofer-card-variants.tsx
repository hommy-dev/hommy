"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { MediaLightbox, type LightboxSlide } from "@/components/ui/media-lightbox";

// Mock data for the sandbox previews.
const SAMPLE = {
  name: "Bluebonnet Roofers",
  logoUrl: "/avatars/pro-1.jpg",
  avgRating: 4.6,
  totalReviews: 29,
  yearsInBusiness: 12,
  subtypes: ["Repair", "Replacement", "Storm damage"],
  images: [
    "/bg/roof-replacement.jpg",
    "/bg/roof-repair.jpg",
    "/bg/storm-damage.jpg",
    "/bg/roof-inspection.jpg",
    "/bg/worker-0.jpeg",
  ],
};

const slidesOf = (images: string[]): LightboxSlide[] => images.map((u, i) => ({ id: String(i), url: u }));

// ── shared bits ─────────────────────────────────────────────────────────────
function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sample
    <img src={SAMPLE.logoUrl} alt="" className="size-12 shrink-0 rounded-md object-cover ring-1 ring-foreground/10" />
  );
}

function NameRating() {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="truncate font-semibold text-foreground">{SAMPLE.name}</span>
        <Icon name="badge-check" className="size-4 shrink-0 text-primary" />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Icon name="star-filled" className="size-3.5 text-warning" />
          <span className="font-semibold text-foreground">{SAMPLE.avgRating.toFixed(1)}</span>
          <span>({SAMPLE.totalReviews})</span>
        </span>
        <span aria-hidden>·</span>
        <span>{SAMPLE.yearsInBusiness} yrs</span>
      </div>
    </div>
  );
}

function Chips() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SAMPLE.subtypes.map((s) => (
        <span key={s} className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground/70">
          {s}
        </span>
      ))}
    </div>
  );
}

const quoteCls =
  "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";
const profileCls =
  "inline-flex items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30";

function Photo({
  src,
  onClick,
  className,
  children,
}: {
  src: string;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`group relative overflow-hidden bg-muted ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- sample */}
      <img src={src} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
      {children}
    </button>
  );
}

function useLightbox() {
  const [open, setOpen] = useState<number | null>(null);
  const node =
    open !== null ? (
      <MediaLightbox
        slides={slidesOf(SAMPLE.images)}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
        title={SAMPLE.name}
      />
    ) : null;
  return { setOpen, node };
}

// ── Variant A — info + single button left, big image right ───────────────────
export function CardVariantA() {
  const { setOpen, node } = useLightbox();
  return (
    <article className="flex overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Logo />
          <NameRating />
        </div>
        <Chips />
        <div className="mt-auto flex items-center gap-4 pt-2">
          <button className={`${quoteCls} w-1/2`}>Get a quote</button>
          <button className="text-sm font-semibold text-primary hover:underline">View profile →</button>
        </div>
      </div>
      <Photo src={SAMPLE.images[0]} onClick={() => setOpen(0)} className="w-[42%] shrink-0">
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background backdrop-blur">
          {SAMPLE.images.length} photos
        </span>
      </Photo>
      {node}
    </article>
  );
}

// ── Variant B — info + 2 buttons left, 2×2 photo grid right ───────────────────
export function CardVariantB() {
  const { setOpen, node } = useLightbox();
  const grid = SAMPLE.images.slice(0, 4);
  const extra = SAMPLE.images.length - grid.length;
  return (
    <article className="flex overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Logo />
          <NameRating />
        </div>
        <Chips />
        <div className="mt-auto flex gap-2 pt-2">
          <button className={`${quoteCls} flex-1`}>Get a quote</button>
          <button className={`${profileCls} flex-1`}>View profile</button>
        </div>
      </div>
      <div className="grid w-[42%] shrink-0 grid-cols-2 grid-rows-2 gap-0.5">
        {grid.map((u, i) => (
          <Photo key={i} src={u} onClick={() => setOpen(i)} className="size-full">
            {i === grid.length - 1 && extra > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-base font-semibold text-background">
                +{extra}
              </span>
            )}
          </Photo>
        ))}
      </div>
      {node}
    </article>
  );
}

// ── Variant C — image banner on top, info + buttons below ────────────────────
export function CardVariantC() {
  const { setOpen, node } = useLightbox();
  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <Photo src={SAMPLE.images[0]} onClick={() => setOpen(0)} className="aspect-[16/7] w-full">
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background backdrop-blur">
          {SAMPLE.images.length} photos
        </span>
      </Photo>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Logo />
          <NameRating />
        </div>
        <Chips />
        <div className="flex gap-2 pt-1">
          <button className={`${quoteCls} flex-1`}>Get a quote</button>
          <button className={`${profileCls} flex-1`}>View profile</button>
        </div>
      </div>
      {node}
    </article>
  );
}

// ── Variant D — info + 2 buttons left, one full image right w/ overlay ───────
export function CardVariantD() {
  const { setOpen, node } = useLightbox();
  return (
    <article className="flex overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Logo />
          <NameRating />
        </div>
        <Chips />
        <div className="mt-auto flex gap-2 pt-2">
          <button className={`${quoteCls} flex-1`}>Get a quote</button>
          <button className={`${profileCls} flex-1`}>View profile</button>
        </div>
      </div>
      <Photo src={SAMPLE.images[0]} onClick={() => setOpen(0)} className="w-[40%] shrink-0">
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-foreground/80 to-transparent p-3 text-sm font-medium text-background">
          View {SAMPLE.images.length} photos
          <Icon name="arrow-right" className="size-4" />
        </span>
      </Photo>
      {node}
    </article>
  );
}
