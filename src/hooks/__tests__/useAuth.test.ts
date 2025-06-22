import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.userProfile).toBe(null);
  });

  it('should handle successful sign up', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signUp('test@example.com', 'password123');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should handle sign up error', async () => {
    const mockError = { message: 'Email already exists' };
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: mockError
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signUp('test@example.com', 'password123');
      expect(response.error).toBe(mockError);
    });
  });

  it('should handle successful sign in', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'password123');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signOut();
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});