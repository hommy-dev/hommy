"use client";

// Global cookie/analytics consent (GDPR-grade, opt-in). Hommy is worldwide, so we
// design to the strictest bar: NOTHING non-essential runs until the visitor opts
// in. `necessary` cookies (auth/session) are always allowed and not tracked here.
// The only optional category today is `analytics` (PostHog) — see
// posthog-provider.tsx, which only initializes once `analytics` is true.
//
// prefs === null  → undecided (show the banner)
// prefs.analytics → the visitor's choice (persisted in localStorage)

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ConsentPrefs = { analytics: boolean };

const STORAGE_KEY = "hommy:consent";
const CONSENT_VERSION = 1;

type ConsentContextValue = {
  ready: boolean; // localStorage has been read (avoids SSR/hydration flash)
  prefs: ConsentPrefs | null; // null = not yet decided
  settingsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (prefs: ConsentPrefs) => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within <ConsentProvider>");
  return ctx;
}

function persist(prefs: ConsentPrefs) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: CONSENT_VERSION, analytics: prefs.analytics, ts: Date.now() }),
    );
  } catch {
    /* storage blocked — choice holds for this session only */
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; prefs: ConsentPrefs | null }>({
    ready: false,
    prefs: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hydrate the stored choice once on mount (consent lives in localStorage, an
  // external store — reading it here is the intended pattern).
  useEffect(() => {
    let stored: ConsentPrefs | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const j = JSON.parse(raw);
        if (j && j.v === CONSENT_VERSION && typeof j.analytics === "boolean") {
          stored = { analytics: j.analytics };
        }
      }
    } catch {
      stored = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate consent from localStorage on mount
    setState({ ready: true, prefs: stored });
  }, []);

  const acceptAll = useCallback(() => {
    const p = { analytics: true };
    setState((s) => ({ ...s, prefs: p }));
    persist(p);
    setSettingsOpen(false);
  }, []);

  const rejectAll = useCallback(() => {
    const p = { analytics: false };
    setState((s) => ({ ...s, prefs: p }));
    persist(p);
    setSettingsOpen(false);
  }, []);

  const save = useCallback((p: ConsentPrefs) => {
    setState((s) => ({ ...s, prefs: p }));
    persist(p);
    setSettingsOpen(false);
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <ConsentContext.Provider
      value={{
        ready: state.ready,
        prefs: state.prefs,
        settingsOpen,
        acceptAll,
        rejectAll,
        save,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}
