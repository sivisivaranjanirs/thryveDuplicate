import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock auth states
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

let mockUser: any = null;
let mockLoading = false;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    userProfile: mockUser ? { full_name: 'Test User', email: mockUser.email } : null,
    loading: mockLoading,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut
  })
}));

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockLoading = false;
  });

  it('shows auth form when user is not logged in', () => {
    render(<App />);
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows loading state during authentication', () => {
    mockLoading = true;
    render(<App />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows main app when user is authenticated', () => {
    mockUser = { id: 'test-user', email: 'test@example.com' };
    
    // Mock other required hooks for authenticated state
    vi.doMock('../../hooks/useHealthMetrics', () => ({
      useHealthMetrics: () => ({
        metrics: [],
        loading: false,
        addMetric: vi.fn(),
        deleteMetric: vi.fn()
      })
    }));

    render(<App />);
    
    expect(screen.getByText('Welcome, test!')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('handles successful sign in flow', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<App />);
    
    // Fill in sign in form
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('handles sign in error', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    
    render(<App />);
    
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('handles successful sign up flow', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ error: null });
    
    render(<App />);
    
    // Switch to sign up
    await user.click(screen.getByText("Don't have an account? Sign up"));
    
    // Fill in sign up form
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'newuser@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123');
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });
  });

  it('handles sign out flow', async () => {
    const user = userEvent.setup();
    mockUser = { id: 'test-user', email: 'test@example.com' };
    mockSignOut.mockResolvedValue({ error: null });
    
    // Mock other hooks for authenticated state
    vi.doMock('../../hooks/useHealthMetrics', () => ({
      useHealthMetrics: () => ({ metrics: [], loading: false })
    }));
    vi.doMock('../../hooks/useFriends', () => ({
      useFriends: () => ({ 
        friends: [], 
        notifications: [], 
        unreadNotificationsCount: 0,
        loading: false 
      })
    }));
    
    render(<App />);
    
    // Click on user profile dropdown
    const profileButton = screen.getByTitle('User Profile');
    await user.click(profileButton);
    
    // Click sign out
    await user.click(screen.getByText('Sign Out'));
    
    expect(mockSignOut).toHaveBeenCalled();
  });
});