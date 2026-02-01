import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AuthState } from "../types/database.types";

export function useAuth(): AuthState & { refreshUser: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setState((prev) => ({ ...prev, user: profile, loading: false }));
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setState({ user: null, session: null, loading: false });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setState({ user: null, session: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    ...state,
    refreshUser,
  };
}
