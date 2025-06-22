import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushNotificationSettings from '../PushNotificationSettings';

// Mock usePushNotifications hook
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockSendTestNotification = vi.fn();
const mockRequestPermission = vi.fn();

vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: true,
    isSubscribed: false,
    permission: 'default',
    loading: false,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    sendTestNotification: mockSendTestNotification,
    requestPermission: mockRequestPermission
  })
}));

describe('PushNotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders push notification settings', () => {
    render(<PushNotificationSettings />);
    
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Get notified about health updates and activities')).toBeInTheDocument();
  });

  it('shows unsupported message when not supported', () => {
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: false,
      isSubscribed: false,
      permission: 'default',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    expect(screen.getByText('Push Notifications Not Supported')).toBeInTheDocument();
    expect(screen.getByText(/Your browser doesn't support push notifications/)).toBeInTheDocument();
  });

  it('shows request permission button when permission is default', () => {
    render(<PushNotificationSettings />);
    
    expect(screen.getByText('Notification Permission')).toBeInTheDocument();
    expect(screen.getByText('Not Set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request permission/i })).toBeInTheDocument();
  });

  it('requests permission when button clicked', async () => {
    const user = userEvent.setup();
    mockRequestPermission.mockResolvedValue(true);
    
    render(<PushNotificationSettings />);
    
    await user.click(screen.getByRole('button', { name: /request permission/i }));
    
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('shows subscription toggle when permission granted', () => {
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      permission: 'granted',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Enable push notifications to stay updated')).toBeInTheDocument();
  });

  it('subscribes to notifications when toggle clicked', async () => {
    const user = userEvent.setup();
    mockSubscribe.mockResolvedValue(true);
    
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      permission: 'granted',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    const toggle = screen.getByRole('button', { name: '' }); // Toggle switch
    await user.click(toggle);
    
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('unsubscribes when toggle clicked while subscribed', async () => {
    const user = userEvent.setup();
    mockUnsubscribe.mockResolvedValue(true);
    
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: true,
      permission: 'granted',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    const toggle = screen.getByRole('button', { name: '' }); // Toggle switch
    await user.click(toggle);
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('shows test notification button when subscribed', () => {
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: true,
      permission: 'granted',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    expect(screen.getByRole('button', { name: /send test notification/i })).toBeInTheDocument();
  });

  it('sends test notification when button clicked', async () => {
    const user = userEvent.setup();
    mockSendTestNotification.mockResolvedValue();
    
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: true,
      permission: 'granted',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    await user.click(screen.getByRole('button', { name: /send test notification/i }));
    
    expect(mockSendTestNotification).toHaveBeenCalled();
  });

  it('shows notification types when subscribed', () => {
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: true,
      permission: 'granted',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    expect(screen.getByText('Notification Types')).toBeInTheDocument();
    expect(screen.getByText('Health Updates')).toBeInTheDocument();
    expect(screen.getByText('Access Requests')).toBeInTheDocument();
    expect(screen.getByText('Request Approvals')).toBeInTheDocument();
  });

  it('shows denied permission message', () => {
    vi.mocked(require('../../hooks/usePushNotifications').usePushNotifications).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      permission: 'denied',
      loading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      sendTestNotification: mockSendTestNotification,
      requestPermission: mockRequestPermission
    });
    
    render(<PushNotificationSettings />);
    
    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument();
  });
});