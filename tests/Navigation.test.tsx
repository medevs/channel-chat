import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth');

const mockUseAuth = vi.mocked(useAuth);

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign in and get started buttons when user is not authenticated', () => {
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
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  it('shows user info and sign out button when user is authenticated', () => {
    const mockSignOut = vi.fn();
    const mockUser = { 
      id: '1', 
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
      clearError: vi.fn(),
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument();
  });

  it('calls signOut when sign out button is clicked', () => {
    const mockSignOut = vi.fn();
    const mockUser = { 
      id: '1', 
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
      clearError: vi.fn(),
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('shows email when full name is not available', () => {
    const mockUser = { 
      id: '1', 
      email: 'test@example.com',
      user_metadata: {}
    };
    
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
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
