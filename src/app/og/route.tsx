import { ImageResponse } from "next/og";

import { sebentaFonts, LOGO_PATHS, HERO_DATA_URI } from "@/lib/og-assets";

// Dynamic Open Graph image (1200×630). Renders the landing-hero look — the roof
// photo full-bleed, a dark scrim for legibility, and centered light text — from
// query params: ?t=<title>&k=<kicker>&s=<value>~<label>&s=… (up to 3 stats).
// Built by src/lib/og.ts (ogImageUrl / ogImageMeta), which the SEO pages call in
// their generateMetadata. For the editorial blog cover variant, see ./blog.
//
// Runs on the default Node runtime (cacheComponents forbids a `runtime` export);
// the brand font, logo mark, and hero photo come from src/lib/og-assets. The
// route output is immutable per-URL and cached hard at the CDN (headers below).

// Palette for text-over-photo. Light theme on the card itself washes out on a
// busy photo, so text is white/light and a scrim does the contrast work.
const WHITE = "#ffffff"; // headline + brand wordmark + stat values
const SOFT = "#eef0ff"; // trust line / secondary text (faint lavender-white)
const ACCENT = "#cdbcff"; // light indigo for the eyebrow + dot + stat labels
const HAIRLINE = "rgba(255,255,255,0.45)"; // stat-box borders on the photo

const PAD_X = 60; // horizontal content inset

function headlineSize(len: number): number {
  if (len <= 28) return 78;
  if (len <= 48) return 66;
  if (len <= 74) return 56;
  return 46;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const title = (
    searchParams.get("t") || "Find a roofer you can actually trust"
  ).slice(0, 120);
  const kicker = (searchParams.get("k") || "").slice(0, 48);
  const stats = searchParams
    .getAll("s")
    .slice(0, 3)
    .map((raw) => {
      const idx = raw.indexOf("~");
      const value = (idx === -1 ? raw : raw.slice(0, idx)).slice(0, 12);
      const label = (idx === -1 ? "" : raw.slice(idx + 1)).slice(0, 24);
      return { value, label };
    })
    .filter((s) => s.value && s.label);

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
            justifyContent: "flex-start",
            height: "100%",
            width: "100%",
            paddingTop: 90,
            paddingLeft: PAD_X,
            paddingRight: PAD_X,
            textAlign: "center",
          }}
        >
          {/* Brand lockup */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 30,
            }}
          >
            <svg width="46" height="46" viewBox="0 0 512 512">
              {LOGO_PATHS.map((d) => (
                <path key={d} d={d} fill={WHITE} />
              ))}
            </svg>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: -0.5,
                color: WHITE,
                marginLeft: 11,
              }}
            >
              Hommy
            </div>
          </div>

          {kicker ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 22,
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
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: ACCENT,
                }}
              >
                {kicker}
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

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 0.2,
              color: SOFT,
            }}
          >
            Licensed · Insured · Verified roofers
          </div>

          {/* Stats */}
          {stats.length ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                marginTop: 34,
              }}
            >
              {stats.map((s, i) => (
                <div
                  key={`${s.value}-${s.label}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginLeft: i ? 30 : 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      lineHeight: 1,
                      marginBottom: 10,
                      color: WHITE,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      padding: "5px 9px",
                      borderRadius: 7,
                      border: `1px solid ${HAIRLINE}`,
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: SOFT,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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
