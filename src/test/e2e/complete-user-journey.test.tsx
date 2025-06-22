import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock all external dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
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
      single: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true })
});

describe('Complete User Journey E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
  });

  it('simulates complete new user onboarding and usage', async () => {
    const user = userEvent.setup();
    
    // Mock authentication flow
    let isAuthenticated = false;
    let currentUser: any = null;

    const mockAuth = {
      getSession: vi.fn().mockImplementation(() => 
        Promise.resolve({ data: { session: isAuthenticated ? { user: currentUser } : null } })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signUp: vi.fn().mockImplementation(() => {
        isAuthenticated = true;
        currentUser = { id: 'new-user', email: 'newuser@example.com' };
        return Promise.resolve({ data: { user: currentUser }, error: null });
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockImplementation(() => {
        isAuthenticated = false;
        currentUser = null;
        return Promise.resolve({ error: null });
      })
    };

    vi.mocked(require('../../lib/supabase').supabase.auth).mockImplementation(() => mockAuth);

    render(<App />);

    // Step 1: User sees auth form
    expect(screen.getByText('Welcome back')).toBeInTheDocument();

    // Step 2: User switches to sign up
    await user.click(screen.getByText("Don't have an account? Sign up"));
    expect(screen.getByText('Create your account')).toBeInTheDocument();

    // Step 3: User creates account
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'newuser@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Step 4: User should see success message and be redirected to sign in
    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });

    // Step 5: Simulate successful authentication (would happen automatically in real app)
    // Re-render with authenticated state
    vi.mocked(require('../../hooks/useAuth').useAuth).mockReturnValue({
      user: currentUser,
      userProfile: { full_name: 'New User', email: 'newuser@example.com' },
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: mockAuth.signOut
    });

    // Mock other hooks for authenticated state
    vi.mocked(require('../../hooks/useHealthMetrics').useHealthMetrics).mockReturnValue({
      metrics: [],
      loading: false,
      addMetric: vi.fn().mockResolvedValue({ data: { id: 'new-metric' }, error: null }),
      deleteMetric: vi.fn()
    });

    vi.mocked(require('../../hooks/useChat').useChat).mockReturnValue({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      error: null,
      sendMessageToLLM: vi.fn().mockResolvedValue({ error: null }),
      switchConversation: vi.fn(),
      startNewConversation: vi.fn(),
      deleteConversation: vi.fn()
    });

    vi.mocked(require('../../hooks/useFriends').useFriends).mockReturnValue({
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
    });

    // Re-render with authenticated state
    render(<App />);

    // Step 6: User sees dashboard
    await waitFor(() => {
      expect(screen.getByText('Welcome, newuser!')).toBeInTheDocument();
    });

    // Step 7: User adds first health metric
    await user.click(screen.getByText('Add Health Data'));
    
    await waitFor(() => {
      expect(screen.getByText('Add Health Readings')).toBeInTheDocument();
    });

    // Fill in blood pressure
    const bpInput = screen.getByPlaceholderText(/120\/80 mmHg/i);
    await user.type(bpInput, '125/82');

    // Save the reading
    await user.click(screen.getByRole('button', { name: /save readings/i }));

    // Step 8: User tries AI chat
    await user.click(screen.getByText('Talk to me'));

    await waitFor(() => {
      expect(screen.getByText('AI Health Assistant')).toBeInTheDocument();
    });

    // Send a health question
    const chatInput = screen.getByPlaceholderText('Type your health question...');
    await user.type(chatInput, 'What does my blood pressure reading mean?');
    
    const sendButton = screen.getByRole('button', { name: '' }); // Send icon
    await user.click(sendButton);

    // Step 9: User explores access management
    await user.click(screen.getByText('Access'));

    await waitFor(() => {
      expect(screen.getByText('Access Management')).toBeInTheDocument();
    });

    // Step 10: User updates profile
    await user.click(screen.getByText('Settings'));

    await waitFor(() => {
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });

    // Step 11: User signs out
    const profileButton = screen.getByTitle('User Profile');
    await user.click(profileButton);
    
    await user.click(screen.getByText('Sign Out'));

    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('simulates returning user workflow', async () => {
    const user = userEvent.setup();
    
    // Mock returning user with existing data
    const mockUser = { id: 'returning-user', email: 'returning@example.com' };
    
    vi.mocked(require('../../hooks/useAuth').useAuth).mockReturnValue({
      user: mockUser,
      userProfile: { full_name: 'Returning User', email: 'returning@example.com' },
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    });

    // Mock existing health data
    vi.mocked(require('../../hooks/useHealthMetrics').useHealthMetrics).mockReturnValue({
      metrics: [
        {
          id: '1',
          user_id: 'returning-user',
          metric_type: 'blood_pressure',
          value: '120/80',
          unit: 'mmHg',
          recorded_at: '2023-01-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z'
        }
      ],
      loading: false,
      addMetric: vi.fn(),
      deleteMetric: vi.fn()
    });

    // Mock existing conversations
    vi.mocked(require('../../hooks/useChat').useChat).mockReturnValue({
      conversations: [
        {
          id: 'conv-1',
          title: 'Previous Health Discussion',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ],
      currentConversation: null,
      messages: [],
      loading: false,
      error: null,
      sendMessageToLLM: vi.fn(),
      switchConversation: vi.fn(),
      startNewConversation: vi.fn(),
      deleteConversation: vi.fn()
    });

    render(<App />);

    // User should see dashboard with existing data
    expect(screen.getByText('Welcome, returning!')).toBeInTheDocument();

    // Should see latest health metrics
    expect(screen.getByText('120/80')).toBeInTheDocument();

    // Check chat history
    await user.click(screen.getByText('Chat History'));

    await waitFor(() => {
      expect(screen.getByText('Previous Health Discussion')).toBeInTheDocument();
    });

    // User can continue using the app normally
    await user.click(screen.getByText('Dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Welcome, returning!')).toBeInTheDocument();
    });
  });
});