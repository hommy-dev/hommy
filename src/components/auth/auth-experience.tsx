"use client";

// Shared client state between the auth form (left) and the showcase panel
// (right) so the panel can gently react to what's happening in the form —
// e.g. switch to a "new here" guide when no account matches the typed email.
// The panel is decorative (aria-hidden); all real guidance also lives as text
// in the form, so this is pure enhancement.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type AuthPanelMode = "intro" | "new-here" | "welcome";
export type Audience = "homeowner" | "contractor";
export type AuthVariant = "default" | "contractor" | "homeowner";

interface AuthExperienceValue {
  variant: AuthVariant;
  mode: AuthPanelMode;
  audience: Audience | null;
  set: (mode: AuthPanelMode, audience?: Audience | null) => void;
  reset: () => void;
}

const AuthExperienceContext = createContext<AuthExperienceValue | null>(null);

export function AuthExperienceProvider({
  variant,
  children,
}: {
  variant: AuthVariant;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<AuthPanelMode>("intro");
  const [audience, setAudience] = useState<Audience | null>(null);

  const set = useCallback(
    (next: AuthPanelMode, who: Audience | null = null) => {
      setMode(next);
      setAudience(who);
    },
    [],
  );

  const reset = useCallback(() => {
    setMode("intro");
    setAudience(null);
  }, []);

  const value = useMemo(
    () => ({ variant, mode, audience, set, reset }),
    [variant, mode, audience, set, reset],
  );

  return (
    <AuthExperienceContext.Provider value={value}>
      {children}
    </AuthExperienceContext.Provider>
  );
}

/** Returns null when rendered outside a provider (e.g. a form used standalone). */
export function useAuthExperience() {
  return useContext(AuthExperienceContext);
}
