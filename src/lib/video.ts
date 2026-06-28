// Video source parsing for the company intro video. One stored URL can be a
// YouTube/Vimeo link (rendered as an embed) or a hosted file (Cloudinary mp4,
// rendered with a native <video>). This figures out which, and exposes an embed
// URL + a poster/thumbnail where we can derive one.

export type VideoSource =
  | { kind: "youtube"; id: string; embedUrl: string; thumbnailUrl: string }
  | { kind: "vimeo"; id: string; embedUrl: string; thumbnailUrl: null }
  | { kind: "file"; embedUrl: string; thumbnailUrl: null }

const YT_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
  /youtu\.be\/([\w-]{11})/i,
  /youtube\.com\/embed\/([\w-]{11})/i,
  /youtube\.com\/shorts\/([\w-]{11})/i,
]

/** Parse a stored intro-video URL. Returns null only for an empty/garbage value. */
export function parseVideoSource(url: string | null | undefined): VideoSource | null {
  const u = (url ?? "").trim()
  if (!u) return null

  for (const re of YT_PATTERNS) {
    const m = u.match(re)
    if (m) {
      const id = m[1]
      return {
        kind: "youtube",
        id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      }
    }
  }

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) {
    const id = vimeo[1]
    return {
      kind: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: null,
    }
  }

  // Anything else is treated as a directly playable file (our Cloudinary mp4).
  return { kind: "file", embedUrl: u, thumbnailUrl: null }
}

/** True if a pasted link is a supported embed (YouTube/Vimeo). */
export function isEmbeddableVideoLink(url: string): boolean {
  const s = parseVideoSource(url)
  return s?.kind === "youtube" || s?.kind === "vimeo"
}

/**
 * Derive a poster (still frame) JPG from a Cloudinary VIDEO secure_url, e.g.
 *   .../video/upload/v123/hommy/videos/abc.mp4
 * → .../video/upload/so_0/v123/hommy/videos/abc.jpg
 * Returns null if the URL isn't a Cloudinary video upload.
 */
export function cloudinaryVideoPoster(secureUrl: string): string | null {
  if (!/res\.cloudinary\.com\/.+\/video\/upload\//.test(secureUrl)) return null
  const withOffset = secureUrl.replace("/upload/", "/upload/so_0/")
  return withOffset.replace(/\.[a-z0-9]+($|\?)/i, ".jpg$1")
}
