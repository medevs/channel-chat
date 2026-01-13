import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefreshCreator } from '@/hooks/useRefreshCreator';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useRefreshCreator', () => {
  it('should initialize with empty refreshing state', () => {
    const { result } = renderHook(() => useRefreshCreator());
    
    expect(result.current.refreshingIds.size).toBe(0);
    expect(result.current.isRefreshing('test-channel')).toBe(false);
  });

  it('should track refreshing state correctly', async () => {
    const { result } = renderHook(() => useRefreshCreator());
    
    // Mock successful response
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { success: true, up_to_date: true },
      error: null,
    });
    
    vi.mocked(require('@/lib/supabase').supabase.functions.invoke).mockImplementation(mockInvoke);
    
    await act(async () => {
      await result.current.refreshCreator('test-channel');
    });
    
    expect(mockInvoke).toHaveBeenCalledWith('ingest-youtube-channel', {
      body: {
        refresh: true,
        channelId: 'test-channel',
        userId: 'test-user-id',
      },
    });
  });
});
