import { renderHook, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '@/contexts/AuthContext';
import { useContext } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';

const mockSupabase = vi.mocked(supabase);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('initializes with loading state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    expect(result.current?.loading).toBe(true);
    expect(result.current?.user).toBe(null);
    expect(result.current?.error).toBe(null);
  });

  it('provides clearError function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    expect(typeof result.current?.clearError).toBe('function');
  });

  it('handles session fetch errors gracefully', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current?.loading).toBe(false);
    expect(result.current?.user).toBe(null);
    expect(result.current?.error).toBe('Network error');
  });

  it('clears error when clearError is called', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    // Wait for the error to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current?.error).toBe('Network error');

    // Clear the error
    act(() => {
      result.current?.clearError();
    });

    expect(result.current?.error).toBe(null);
  });
});
