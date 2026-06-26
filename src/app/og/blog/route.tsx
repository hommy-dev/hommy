import { ImageResponse } from "next/og";

import { sebentaFonts, LOGO_PATHS, HERO_DATA_URI } from "@/lib/og-assets";

// Dynamic blog cover (1200×630) — the editorial counterpart to the hero share
// card in ../route.tsx. Same look (roof photo full-bleed, dark scrim, centered
// light text) but stripped to the essentials: brand lockup, category eyebrow,
// and the post title. No trust line, no stats — so an imageless post still gets
// a clean, on-brand cover.
//
// FLOW: open /og/blog?t=<title>&c=<category> in the browser, download the PNG,
// then upload it to the post in Sanity (mainImage / SEO ogImage). The blog's
// generateMetadata (src/app/(public)/blog/[slug]/page.tsx) then serves it as the
// post's Open Graph image automatically — same path a hand-uploaded cover takes.
//
// Node runtime (cacheComponents forbids a `runtime` export); the font, logo, and
// hero photo come from src/lib/og-assets. Output is immutable per-URL and cached
// hard at the CDN (headers below).

const WHITE = "#ffffff"; // headline + brand wordmark
const ACCENT = "#cdbcff"; // light indigo for the eyebrow + dot

const PAD_X = 70; // horizontal content inset

function headlineSize(len: number): number {
  if (len <= 28) return 80;
  if (len <= 52) return 66;
  if (len <= 80) return 54;
  return 46;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("t") || "The Hommy Journal").slice(0, 120);
  const category = (searchParams.get("c") || "").slice(0, 32);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          fontFamily: "Sebenta",
        }}
      >
        {/* Full-bleed hero photo */}
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) requires a raw <img>, not next/image */}
        <img
          alt=""
          src={HERO_DATA_URI}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Scrim — keeps light text legible over both the sky and the red tiles */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(180deg, rgba(8,10,28,0.42) 0%, rgba(8,10,28,0.30) 42%, rgba(8,10,28,0.52) 74%, rgba(8,10,28,0.82) 100%)",
          }}
        />

        {/* Centered content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            paddingLeft: PAD_X,
            paddingRight: PAD_X,
            paddingBottom: 110, // nudge the centered block slightly above center
            textAlign: "center",
          }}
        >
          {/* Brand lockup */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 36,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 512 512">
              {LOGO_PATHS.map((d) => (
                <path key={d} d={d} fill={WHITE} />
              ))}
            </svg>
            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: -0.5,
                color: WHITE,
                marginLeft: 11,
              }}
            >
              Hommy
            </div>
          </div>

          {category ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 11,
                  backgroundColor: ACCENT,
                  marginRight: 14,
                }}
              />
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  color: ACCENT,
                }}
              >
                {category}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              maxWidth: 1000,
              fontSize: headlineSize(title.length),
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -0.6,
              color: WHITE,
              textAlign: "center",
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: sebentaFonts,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
