"use client";

// Company intro-video player. One stored URL → either a native <video> (our
// Cloudinary upload) or a YouTube/Vimeo embed. Embeds use a click-to-play
// facade (poster + play button) so we don't load a heavy iframe until asked.

import { useState } from "react";
import { parseVideoSource } from "@/lib/video";
import { Icon } from "@/components/ui/icon";

export function IntroVideo({
  url,
  posterUrl,
  companyName,
}: {
  url: string;
  posterUrl: string | null;
  companyName: string;
}) {
  const [playing, setPlaying] = useState(false);
  const source = parseVideoSource(url);
  if (!source) return null;

  const poster = posterUrl ?? source.thumbnailUrl;

  // Hosted file — native player with a poster (no heavy preload).
  if (source.kind === "file") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-black">
        <video
          src={source.embedUrl}
          poster={poster ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="size-full"
        />
      </div>
    );
  }

  // YouTube / Vimeo — facade until the viewer clicks play.
  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${companyName} intro video`}
        className="group relative block aspect-video w-full overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-black"
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote video thumbnail
          <img
            src={poster}
            alt=""
            className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        ) : null}
        <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/30">
          <Icon
            name="play"
            className="grid size-14 lg:size-[3.889vw] place-items-center bg-background shadow-lg transition-transform"
          />
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-black">
      <iframe
        src={`${source.embedUrl}?autoplay=1`}
        title={`${companyName} intro video`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full"
      />
    </div>
  );
}
