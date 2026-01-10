import type { User } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

export interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}