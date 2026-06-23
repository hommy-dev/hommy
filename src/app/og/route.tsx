import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Dynamic Open Graph image (1200×630). Renders the landing-hero look — the roof
// photo full-bleed, a dark scrim for legibility, and centered light text — from
// query params: ?t=<title>&k=<kicker>&s=<value>~<label>&s=… (up to 3 stats).
// Built by src/lib/og.ts (ogImageUrl / ogImageMeta), which the SEO pages call in
// their generateMetadata.
//
// Runs on the default Node runtime (cacheComponents forbids a `runtime` export),
// so we can read the brand font + hero photo off disk once at module load; the
// route output is immutable per-URL and cached hard at the CDN (headers below).

// Brand display font (Sebenta). Read once, reused across requests.
const FONT_DIR = join(process.cwd(), "public/font/sebenta");
const fontMedium = readFileSync(join(FONT_DIR, "sebenta-medium.otf"));
const fontSemibold = readFileSync(join(FONT_DIR, "sebenta-semibold.otf"));
const fontBold = readFileSync(join(FONT_DIR, "sebenta-bold.otf"));

// Hero background — an OG-sized (1200×630) crop of the landing photo, kept small
// (~67KB) so we're not base64-embedding the 2MB original on every render. Satori
// only decodes JPEG/PNG (no AVIF/WebP), so this is a .jpg. Read + encoded once.
const heroBuf = readFileSync(join(process.cwd(), "public/bg/og-hero.jpg"));
const HERO_DATA_URI = `data:image/jpeg;base64,${heroBuf.toString("base64")}`;

// Palette for text-over-photo. Light theme on the card itself washes out on a
// busy photo, so text is white/light and a scrim does the contrast work.
const WHITE = "#ffffff"; // headline + brand wordmark + stat values
const SOFT = "#eef0ff"; // trust line / secondary text (faint lavender-white)
const ACCENT = "#cdbcff"; // light indigo for the eyebrow + dot + stat labels
const HAIRLINE = "rgba(255,255,255,0.45)"; // stat-box borders on the photo

const PAD_X = 60; // horizontal content inset

// Hommy logo mark — the 4 paths from public/logo/logo.svg (viewBox 0 0 512 512).
const LOGO_PATHS = [
  "M230.15 70.4903V94.9804L215.527 107.403C195.921 124.055 170.039 146.061 156.387 157.685C150.24 162.89 137.816 173.449 128.725 181.14C110.543 196.549 109.281 197.703 106.726 201.163C102.811 206.458 100.643 212.166 100.061 218.732C99.7051 222.607 99.7698 259.047 100.126 259.372C100.482 259.697 160.269 259.549 164.022 259.224C199.868 256.148 229.859 234.882 242.315 203.678C243.932 199.655 245.582 193.828 246.585 188.563L247.459 183.979L247.524 114.975L247.621 46.0001H238.885H230.15V70.4903Z",
  "M264.865 131.952C264.962 183.506 264.962 183.683 265.673 187.558C267.809 199.33 271.529 208.972 277.547 218.289C284.826 229.558 295.438 239.585 307.376 246.506C319.799 253.693 334.002 258.13 348.399 259.254C350.857 259.431 373.213 259.549 409.157 259.549H466V251.563V243.577H439.309H412.618V232.545C412.618 220.123 412.327 216.248 411.162 212.048C410.16 208.528 407.183 202.849 404.886 200.099C403.01 197.821 399.095 194.331 387.222 184.275C382.401 180.223 374.184 173.213 368.942 168.747C363.669 164.28 356.26 157.951 352.443 154.727C348.625 151.473 343.675 147.273 341.443 145.38C339.211 143.487 332.966 138.163 327.531 133.549C299.061 109.355 290.941 102.463 285.797 98.0564C280.555 93.5606 272.597 86.8169 268.067 83.0014L264.735 80.2212L264.865 131.952Z",
  "M46.1941 275.876C46.2912 276.261 46.3882 279.839 46.3882 283.862V291.197L73.079 291.256L99.7698 291.345V335.268C99.7698 359.432 99.9316 381.113 100.093 383.479C100.579 390.577 102.746 396.463 106.952 402.024C112.776 409.744 122.611 415.245 132.931 416.606C134.355 416.783 155.901 416.901 191.424 416.901H247.653L247.524 383.982C247.427 352.097 247.394 350.973 246.747 347.246C244.385 333.996 239.856 323.2 232.415 312.996C218.827 294.392 198.315 281.584 174.666 277.03C165.898 275.344 169.392 275.403 105.14 275.314L46 275.196L46.1941 275.876Z",
  "M349.855 275.432C343.513 275.787 333.096 277.739 326.658 279.78C304.464 286.849 285.894 301.549 275.153 320.508C270.267 329.145 267.582 336.687 265.641 347.217L264.962 351.092L264.865 408.531L264.735 466H273.503H282.238V441.658V417.286L288.126 417.108C291.329 416.99 312.714 416.901 335.619 416.901C372.113 416.901 377.613 416.842 380.298 416.428C396.248 413.973 408.283 403.237 411.842 388.211C412.424 385.815 412.457 383.124 412.457 330.535V275.373L382.045 275.344C365.319 275.344 350.825 275.373 349.855 275.432Z",
];

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
        <img
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
            Licensed · Insured · Background-checked pros
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
      fonts: [
        { name: "Sebenta", data: fontMedium, weight: 500, style: "normal" },
        { name: "Sebenta", data: fontSemibold, weight: 600, style: "normal" },
        { name: "Sebenta", data: fontBold, weight: 700, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
