import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeedback } from '../useFeedback';

// Mock useAuth
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('useFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user feedback on mount', async () => {
    const mockFeedback = [
      {
        id: '1',
        user_id: 'test-user-id',
        type: 'suggestion',
        title: 'Test Suggestion',
        description: 'This is a test suggestion',
        status: 'pending',
        created_at: '2023-01-01T00:00:00Z'
      }
    ];

    mockSupabase.from().single.mockResolvedValue({
      data: mockFeedback,
      error: null
    });

    const { result } = renderHook(() => useFeedback());

    expect(result.current.loading).toBe(true);
    
    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('user_feedback');
  });

  it('should submit new feedback', async () => {
    const newFeedback = {
      type: 'suggestion',
      title: 'New Feature Idea',
      description: 'It would be great if...',
      rating: null
    };

    const mockResponse = {
      id: 'new-feedback-id',
      user_id: 'test-user-id',
      ...newFeedback
    };

    mockSupabase.from().single.mockResolvedValue({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      const response = await result.current.submitFeedback(newFeedback as any);
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('user_feedback');
  });

  it('should handle submit feedback error', async () => {
    const newFeedback = {
      type: 'bug',
      title: 'Found a Bug',
      description: 'When I click on...',
      rating: null
    };

    const mockError = { message: 'Database error' };
    mockSupabase.from().single.mockResolvedValue({
      data: null,
      error: mockError
    });

    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      const response = await result.current.submitFeedback(newFeedback as any);
      expect(response.error).toBe('Database error');
    });
  });

  it('should refresh feedback list', async () => {
    const mockFeedback = [
      {
        id: '1',
        user_id: 'test-user-id',
        type: 'suggestion',
        title: 'Test Suggestion',
        description: 'This is a test suggestion',
        status: 'pending',
        created_at: '2023-01-01T00:00:00Z'
      }
    ];

    mockSupabase.from().single.mockResolvedValue({
      data: mockFeedback,
      error: null
    });

    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      await result.current.refreshFeedback();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('user_feedback');
  });
});