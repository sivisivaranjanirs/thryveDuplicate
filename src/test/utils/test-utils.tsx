import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Custom render function that includes providers if needed
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  // Add any providers here if needed in the future
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createMockHealthMetric = (overrides = {}) => ({
  id: 'metric-id',
  user_id: 'test-user-id',
  metric_type: 'blood_pressure',
  value: '120/80',
  unit: 'mmHg',
  recorded_at: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createMockConversation = (overrides = {}) => ({
  id: 'conv-id',
  user_id: 'test-user-id',
  title: 'Test Conversation',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-id',
  conversation_id: 'conv-id',
  user_id: 'test-user-id',
  message_type: 'user',
  content: 'Test message',
  is_voice: false,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};