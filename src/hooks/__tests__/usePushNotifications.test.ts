import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';

// Mock useAuth
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock Service Worker and Push Manager
const mockPushManager = {
  getSubscription: vi.fn(),
  subscribe: vi.fn()
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve(mockServiceWorkerRegistration)
  },
  writable: true
});

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn()
  },
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect push notification support', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });

  it('should check subscription status on mount', async () => {
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockSupabase.from().single.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isSubscribed).toBe(false);
  });

  it('should request permission successfully', async () => {
    global.Notification.requestPermission.mockResolvedValue('granted');

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      const granted = await result.current.requestPermission();
      expect(granted).toBe(true);
    });

    expect(global.Notification.requestPermission).toHaveBeenCalled();
  });

  it('should handle permission denial', async () => {
    global.Notification.requestPermission.mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      const granted = await result.current.requestPermission();
      expect(granted).toBe(false);
    });
  });

  it('should subscribe to push notifications', async () => {
    global.Notification.requestPermission.mockResolvedValue('granted');
    
    const mockSubscription = {
      toJSON: () => ({
        endpoint: 'https://test-endpoint.com',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      })
    };

    mockPushManager.subscribe.mockResolvedValue(mockSubscription);
    mockSupabase.from().single.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      const success = await result.current.subscribe();
      expect(success).toBe(true);
    });

    expect(mockPushManager.subscribe).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions');
  });

  it('should unsubscribe from push notifications', async () => {
    const mockSubscription = {
      unsubscribe: vi.fn().mockResolvedValue(true)
    };

    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    mockSupabase.from().single.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      const success = await result.current.unsubscribe();
      expect(success).toBe(true);
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should send test notification', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => usePushNotifications());

    // Set up initial state
    await act(async () => {
      result.current.isSubscribed = true;
    });

    await act(async () => {
      await result.current.sendTestNotification();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/send-push-notification'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });
});