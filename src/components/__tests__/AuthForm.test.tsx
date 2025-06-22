import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from '../AuthForm';

// Mock useAuth hook
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp
  })
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form by default', () => {
    render(<AuthForm />);
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account? Sign up")).toBeInTheDocument();
  });

  it('switches to sign up form when clicked', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    
    await user.click(screen.getByText("Don't have an account? Sign up"));
    
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), '123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
  });

  it('validates password confirmation in sign up mode', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    
    // Switch to sign up
    await user.click(screen.getByText("Don't have an account? Sign up"));
    
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'different');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('handles successful sign in', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<AuthForm />);
    
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
    
    render(<AuthForm />);
    
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('handles successful sign up', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ error: null });
    
    render(<AuthForm />);
    
    // Switch to sign up
    await user.click(screen.getByText("Don't have an account? Sign up"));
    
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});