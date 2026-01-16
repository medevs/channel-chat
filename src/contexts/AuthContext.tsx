import { createContext, useEffect, useState, useMemo } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { AuthContextType, AuthState } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    // Initialize with loading true to prevent flash of unauthenticated content
    return {
      user: null,
      loading: true,
      error: null,
    };
  });

  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setState({
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      }
    }).catch((error) => {
      // Handle session fetch errors gracefully
      if (mounted) {
        setState({
          user: null,
          loading: false,
          error: error.message || "Failed to load session",
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setState({
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) throw error;
    
    // When email confirmations are enabled, Supabase creates the user and returns:
    // - data.user: new user object
    // - data.session: null (waiting for email confirmation)
    // This is normal behavior, not an error
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const value: AuthContextType = useMemo(() => ({
    ...state,
    signUp,
    signIn,
    signOut,
    clearError,
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };