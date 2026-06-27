"use client";

import { useConsent } from "./consent-context";

/** Footer entry to reopen the cookie settings dialog. Client-only (needs the
 *  consent context); safe to drop into the server-rendered footer. */
export function CookieSettingsLink({ className }: { className?: string }) {
  const { openSettings } = useConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      Cookie settings
    </button>
  );
}
