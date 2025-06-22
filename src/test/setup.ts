import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_VAPID_PUBLIC_KEY: 'test-vapid-key'
  }
}));

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn().mockReturnThis()
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock navigator APIs
Object.defineProperty(window, 'navigator', {
  value: {
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn(),
          subscribe: vi.fn()
        }
      })
    }
  },
  writable: true
});

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn()
} as any;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    href: 'http://localhost:3000'
  },
  writable: true
});