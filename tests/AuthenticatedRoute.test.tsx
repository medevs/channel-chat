import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedRoute } from '@/components/AuthenticatedRoute';
import { useAuth } from '@/hooks/useAuth';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth');

const mockUseAuth = vi.mocked(useAuth);

// Test component
function TestComponent() {
  return <div>Test Content</div>;
}

// Wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('AuthenticatedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <TestWrapper>
        <AuthenticatedRoute>
          <TestComponent />
        </AuthenticatedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('redirects to /chat when user is authenticated', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <TestWrapper>
        <AuthenticatedRoute>
          <TestComponent />
        </AuthenticatedRoute>
      </TestWrapper>
    );

    // Should not show the test content since user is authenticated
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('shows children when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <TestWrapper>
        <AuthenticatedRoute>
          <TestComponent />
        </AuthenticatedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
