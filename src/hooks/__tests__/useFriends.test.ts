import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFriends } from '../useFriends';

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
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn()
  })),
  rpc: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  })),
  removeChannel: vi.fn()
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock fetch for notifications
global.fetch = vi.fn();

describe('useFriends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch reading permissions on mount', async () => {
    const mockPermissions = [
      {
        id: 'perm-1',
        viewer_id: 'test-user-id',
        owner_id: 'friend-id',
        status: 'active',
        owner_profile: { email: 'friend@example.com', full_name: 'Friend Name' }
      }
    ];

    mockSupabase.from().single.mockResolvedValue({
      data: mockPermissions,
      error: null
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('reading_permissions');
  });

  it('should send reading request', async () => {
    // Mock user lookup
    mockSupabase.rpc.mockResolvedValue({
      data: [{ user_id: 'target-user-id', user_email: 'target@example.com' }],
      error: null
    });

    // Mock permission check
    mockSupabase.from().single
      .mockResolvedValueOnce({ data: null, error: null }) // No existing permission
      .mockResolvedValueOnce({ data: null, error: null }) // No existing request
      .mockResolvedValueOnce({ 
        data: { id: 'request-id', requester_id: 'test-user-id', owner_id: 'target-user-id' }, 
        error: null 
      }); // Successful request creation

    // Mock notification API
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      const response = await result.current.sendReadingRequest('target@example.com', 'Test message');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_id_by_email', {
      search_email: 'target@example.com'
    });
  });

  it('should handle user not found error', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null
    });

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      const response = await result.current.sendReadingRequest('nonexistent@example.com');
      expect(response.error).toContain('User not found');
    });
  });

  it('should accept reading request', async () => {
    const mockRequest = {
      id: 'request-id',
      requester_id: 'requester-id',
      owner_id: 'test-user-id',
      status: 'accepted'
    };

    mockSupabase.from().single.mockResolvedValue({
      data: mockRequest,
      error: null
    });

    // Mock notification API
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      const response = await result.current.acceptReadingRequest('request-id');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('reading_requests');
  });

  it('should decline reading request', async () => {
    const mockRequest = {
      id: 'request-id',
      requester_id: 'requester-id',
      owner_id: 'test-user-id',
      status: 'declined'
    };

    mockSupabase.from().single.mockResolvedValue({
      data: mockRequest,
      error: null
    });

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      const response = await result.current.declineReadingRequest('request-id');
      expect(response.error).toBe(null);
    });
  });

  it('should mark notification as read', async () => {
    mockSupabase.from().single.mockResolvedValue({
      data: null,
      error: null
    });

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      const response = await result.current.markNotificationAsRead('notification-id');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('friend_notifications');
  });

  it('should remove access', async () => {
    mockSupabase.from().single.mockResolvedValue({
      data: null,
      error: null
    });

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      const response = await result.current.removeAccess('viewer-id', 'Viewer Name');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('reading_permissions');
  });
});