import { Inter } from "next/font/google";

/**
 * Single font for the platform: Inter (sans).
 *
 * Spectral, Mulish, and Satoshi were dropped at v1 — design moved to a
 * sans-only system. The local Satoshi files in `public/font/satoshi/` are
 * unused and can be deleted in a separate housekeeping pass.
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-inter",
});
