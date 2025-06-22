import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock all hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    userProfile: { full_name: 'Test User', email: 'test@example.com' },
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn()
  })
}));

vi.mock('../../hooks/useHealthMetrics', () => ({
  useHealthMetrics: () => ({
    metrics: [
      {
        id: '1',
        user_id: 'test-user',
        metric_type: 'blood_pressure',
        value: '120/80',
        unit: 'mmHg',
        recorded_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z'
      }
    ],
    loading: false,
    addMetric: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
    deleteMetric: vi.fn().mockResolvedValue({ error: null })
  })
}));

vi.mock('../../hooks/useChat', () => ({
  useChat: () => ({
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
    sendMessageToLLM: vi.fn().mockResolvedValue({ error: null }),
    switchConversation: vi.fn(),
    startNewConversation: vi.fn(),
    deleteConversation: vi.fn()
  })
}));

vi.mock('../../hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
    myViewers: [],
    friendRequests: [],
    notifications: [],
    unreadNotificationsCount: 0,
    loading: false,
    error: null,
    sendReadingRequest: vi.fn(),
    acceptReadingRequest: vi.fn(),
    declineReadingRequest: vi.fn(),
    removeAccess: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn()
  })
}));

describe('Health Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location.hash
    window.location.hash = '';
  });

  it('completes full health tracking workflow', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Should start on dashboard
    expect(screen.getByText('Welcome, test!')).toBeInTheDocument();

    // Navigate to health tracking
    await user.click(screen.getByText('Health Tracking'));

    await waitFor(() => {
      expect(screen.getByText('Monitor and track your health metrics')).toBeInTheDocument();
    });

    // Add a new health reading
    await user.click(screen.getByRole('button', { name: /add reading/i }));

    expect(screen.getByText('Add Health Readings')).toBeInTheDocument();

    // Fill in blood pressure
    const bpInput = screen.getByPlaceholderText(/120\/80 mmHg/i);
    await user.type(bpInput, '130/85');

    // Save the reading
    await user.click(screen.getByRole('button', { name: /save readings/i }));

    // Should close modal and return to health tracking view
    await waitFor(() => {
      expect(screen.queryByText('Add Health Readings')).not.toBeInTheDocument();
    });
  });

  it('completes AI chat workflow', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navigate to voice chat
    await user.click(screen.getByText('Talk to me'));

    await waitFor(() => {
      expect(screen.getByText('AI Health Assistant')).toBeInTheDocument();
    });

    // Send a message
    const input = screen.getByPlaceholderText('Type your health question...');
    await user.type(input, 'How can I improve my sleep?');

    const sendButton = screen.getByRole('button', { name: '' }); // Send icon
    await user.click(sendButton);

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  it('navigates between different sections', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Start on dashboard
    expect(screen.getByText('Welcome, test!')).toBeInTheDocument();

    // Go to health tracking
    await user.click(screen.getByText('Health Tracking'));
    await waitFor(() => {
      expect(screen.getByText('Monitor and track your health metrics')).toBeInTheDocument();
    });

    // Go to chat history
    await user.click(screen.getByText('Chat History'));
    await waitFor(() => {
      expect(screen.getByText('Your conversations')).toBeInTheDocument();
    });

    // Go to access management
    await user.click(screen.getByText('Access'));
    await waitFor(() => {
      expect(screen.getByText('Access Management')).toBeInTheDocument();
    });

    // Go to settings
    await user.click(screen.getByText('Settings'));
    await waitFor(() => {
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });

    // Return to dashboard
    await user.click(screen.getByText('Dashboard'));
    await waitFor(() => {
      expect(screen.getByText('Welcome, test!')).toBeInTheDocument();
    });
  });

  it('handles hash-based navigation', async () => {
    render(<App />);

    // Simulate hash change to health tracking
    window.location.hash = '#health-tracking';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(screen.getByText('Monitor and track your health metrics')).toBeInTheDocument();
    });

    // Simulate hash change to voice chat
    window.location.hash = '#voice-chat';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(screen.getByText('AI Health Assistant')).toBeInTheDocument();
    });
  });

  it('shows responsive sidebar on mobile', async () => {
    const user = userEvent.setup();
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<App />);

    // Should show menu button on mobile
    const menuButton = screen.getByRole('button', { name: '' }); // Menu icon
    await user.click(menuButton);

    // Sidebar should be visible
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });
});