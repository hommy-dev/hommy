import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.100.5'
  ],

  async redirects() {
    return [
      { source: "/painter", destination: "/contractor", permanent: true },
      {
        source: "/painter/:path*",
        destination: "/contractor/:path*",
        permanent: true,
      },
    ];
  },

  // Enables "use cache" directive + PPR — required for this guide
  cacheComponents: true,

  // Turbopack filesystem cache — much faster dev restarts on large projects
  experimental: {
    turbopackFileSystemCacheForDev: true,
    viewTransition: true,
  },

  // Forward browser errors to terminal — critical for AI debugging (16.2+)
  // AI agents can't see the browser console. This makes errors visible.
  logging: {
    browserToTerminal: "error", // 'warn' | true (all) | false (disable)
  },

  // Custom cache profiles — reference by name in cacheLife()
  cacheLife: {
    // Almost never changes: platform config, pricing tiers, static content
    static: {
      stale: 60 * 60 * 24 * 7, // 7 days client-side
      revalidate: 60 * 60 * 24, // recheck once/day
      expire: 60 * 60 * 24 * 30, // max 30 days
    },
    // Contractor profiles, city pages, reviews — updates occasionally
    standard: {
      stale: 60, // 1 min client
      revalidate: 300, // recheck every 5 min
      expire: 3600, // max 1 hour
    },
    // Lead counts, active job statuses — updates frequently
    live: {
      stale: 10,
      revalidate: 30,
      expire: 60,
    },
  },

  images: {
    minimumCacheTTL: 14400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  reactCompiler: true,
};

export default nextConfig;
