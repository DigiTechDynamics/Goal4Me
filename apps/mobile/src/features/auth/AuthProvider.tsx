import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";
import { getSupabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  /** True until the stored session has been read on start-up. */
  initializing: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, initializing: true });

/** Keeps the current Supabase session in React state for route guards and queries. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, initializing: true });

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) logger.warn("Could not restore session", { code: error.code });
        if (active) setState({ session: data.session, initializing: false });
      })
      .catch((error: unknown) => {
        logger.error("Session restore failed", { error: String(error) });
        if (active) setState({ session: null, initializing: false });
      });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Never let one user's cached data leak into the next user's session.
      if (event === "SIGNED_OUT") queryClient.clear();
      setState({ session, initializing: false });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => useContext(AuthContext);

/** For screens that only render when signed in (inside the protected group). */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error("useUserId called without a session");
  return session.user.id;
}
