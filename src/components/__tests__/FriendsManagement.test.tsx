import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FriendsManagement from '../FriendsManagement';

// Mock useFriends hook
const mockSendReadingRequest = vi.fn();
const mockAcceptReadingRequest = vi.fn();
const mockDeclineReadingRequest = vi.fn();
const mockRemoveAccess = vi.fn();

const mockFriends = [
  {
    id: 'perm-1',
    viewer_id: 'test-user',
    owner_id: 'friend-1',
    owner_email: 'friend@example.com',
    owner_name: 'Friend Name',
    created_at: '2023-01-01T00:00:00Z'
  }
];

const mockRequests = [
  {
    id: 'req-1',
    requester_id: 'requester-1',
    owner_id: 'test-user',
    requester_email: 'requester@example.com',
    requester_name: 'Requester Name',
    message: 'Please let me view your health data',
    created_at: '2023-01-01T00:00:00Z'
  }
];

vi.mock('../../hooks/useFriends', () => ({
  useFriends: () => ({
    friends: mockFriends,
    myViewers: [],
    friendRequests: mockRequests,
    notifications: [],
    unreadNotificationsCount: 0,
    loading: false,
    error: null,
    sendReadingRequest: mockSendReadingRequest,
    acceptReadingRequest: mockAcceptReadingRequest,
    declineReadingRequest: mockDeclineReadingRequest,
    removeAccess: mockRemoveAccess,
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn()
  })
}));

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' }
  })
}));

describe('FriendsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders access management interface', () => {
    render(<FriendsManagement />);
    
    expect(screen.getByText('Access Management')).toBeInTheDocument();
    expect(screen.getByText('Request access to view others\' health readings')).toBeInTheDocument();
  });

  it('shows accordion sections', () => {
    render(<FriendsManagement />);
    
    expect(screen.getByText('I Can View')).toBeInTheDocument();
    expect(screen.getByText('Who Can View Mine')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();
  });

  it('displays friends with reading access', () => {
    render(<FriendsManagement />);
    
    expect(screen.getByText('Friend Name')).toBeInTheDocument();
    expect(screen.getByText('friend@example.com')).toBeInTheDocument();
  });

  it('opens request access modal', async () => {
    const user = userEvent.setup();
    render(<FriendsManagement />);
    
    await user.click(screen.getByRole('button', { name: /request access/i }));
    
    expect(screen.getByText('Request Reading Access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
  });

  it('sends reading request', async () => {
    const user = userEvent.setup();
    mockSendReadingRequest.mockResolvedValue({ error: null });
    
    render(<FriendsManagement />);
    
    // Open modal
    await user.click(screen.getByRole('button', { name: /request access/i }));
    
    // Fill form
    await user.type(screen.getByPlaceholderText('user@example.com'), 'target@example.com');
    await user.type(
      screen.getByPlaceholderText(/Hi! I'd like to view your health readings/i),
      'Please share your health data with me'
    );
    
    // Submit
    await user.click(screen.getByRole('button', { name: /request access/i }));
    
    await waitFor(() => {
      expect(mockSendReadingRequest).toHaveBeenCalledWith(
        'target@example.com',
        'Please share your health data with me'
      );
    });
  });

  it('accepts reading request', async () => {
    const user = userEvent.setup();
    mockAcceptReadingRequest.mockResolvedValue({ error: null });
    
    render(<FriendsManagement />);
    
    // Open requests section
    await user.click(screen.getByText('Requests'));
    
    // Accept request
    const acceptButton = screen.getByTitle('Accept request');
    await user.click(acceptButton);
    
    expect(mockAcceptReadingRequest).toHaveBeenCalledWith('req-1');
  });

  it('declines reading request', async () => {
    const user = userEvent.setup();
    mockDeclineReadingRequest.mockResolvedValue({ error: null });
    
    render(<FriendsManagement />);
    
    // Open requests section
    await user.click(screen.getByText('Requests'));
    
    // Decline request
    const declineButton = screen.getByTitle('Decline request');
    await user.click(declineButton);
    
    expect(mockDeclineReadingRequest).toHaveBeenCalledWith('req-1');
  });

  it('removes access with confirmation', async () => {
    const user = userEvent.setup();
    mockRemoveAccess.mockResolvedValue({ error: null });
    window.confirm = vi.fn(() => true);
    
    render(<FriendsManagement />);
    
    // Remove access (need to hover to show button)
    const removeButton = screen.getByTitle('Remove access');
    await user.click(removeButton);
    
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to remove')
    );
    expect(mockRemoveAccess).toHaveBeenCalled();
  });

  it('shows empty state when no friends', () => {
    vi.mocked(require('../../hooks/useFriends').useFriends).mockReturnValue({
      friends: [],
      myViewers: [],
      friendRequests: [],
      notifications: [],
      unreadNotificationsCount: 0,
      loading: false,
      error: null,
      sendReadingRequest: mockSendReadingRequest,
      acceptReadingRequest: mockAcceptReadingRequest,
      declineReadingRequest: mockDeclineReadingRequest,
      removeAccess: mockRemoveAccess,
      markNotificationAsRead: vi.fn(),
      markAllNotificationsAsRead: vi.fn()
    });
    
    render(<FriendsManagement />);
    
    expect(screen.getByText('No reading access yet')).toBeInTheDocument();
    expect(screen.getByText('Request access to view others\' health readings')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    vi.mocked(require('../../hooks/useFriends').useFriends).mockReturnValue({
      friends: [],
      myViewers: [],
      friendRequests: [],
      notifications: [],
      unreadNotificationsCount: 0,
      loading: true,
      error: null,
      sendReadingRequest: mockSendReadingRequest,
      acceptReadingRequest: mockAcceptReadingRequest,
      declineReadingRequest: mockDeclineReadingRequest,
      removeAccess: mockRemoveAccess,
      markNotificationAsRead: vi.fn(),
      markAllNotificationsAsRead: vi.fn()
    });
    
    render(<FriendsManagement />);
    
    expect(screen.getByText('Loading access...')).toBeInTheDocument();
  });
});