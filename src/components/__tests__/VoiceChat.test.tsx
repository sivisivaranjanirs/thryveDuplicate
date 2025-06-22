import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceChat from '../VoiceChat';

// Mock useChat hook
const mockSendMessageToLLM = vi.fn();
const mockSwitchConversation = vi.fn();
const mockStartNewConversation = vi.fn();
const mockDeleteConversation = vi.fn();

const mockConversations = [
  {
    id: 'conv-1',
    title: 'Health Questions',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

const mockMessages = [
  {
    id: 'msg-1',
    message_type: 'user',
    content: 'How can I improve my sleep?',
    created_at: '2023-01-01T00:00:00Z',
    is_voice: false
  },
  {
    id: 'msg-2',
    message_type: 'assistant',
    content: 'Here are some tips for better sleep...',
    created_at: '2023-01-01T00:00:00Z',
    is_voice: false
  }
];

vi.mock('../../hooks/useChat', () => ({
  useChat: () => ({
    conversations: mockConversations,
    currentConversation: mockConversations[0],
    messages: mockMessages,
    loading: false,
    error: null,
    sendMessageToLLM: mockSendMessageToLLM,
    switchConversation: mockSwitchConversation,
    startNewConversation: mockStartNewConversation,
    deleteConversation: mockDeleteConversation
  })
}));

describe('VoiceChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat interface', () => {
    render(<VoiceChat />);
    
    expect(screen.getByText('AI Health Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your health question...')).toBeInTheDocument();
  });

  it('displays conversation messages', () => {
    render(<VoiceChat />);
    
    expect(screen.getByText('How can I improve my sleep?')).toBeInTheDocument();
    expect(screen.getByText('Here are some tips for better sleep...')).toBeInTheDocument();
  });

  it('sends text message when form submitted', async () => {
    const user = userEvent.setup();
    mockSendMessageToLLM.mockResolvedValue({ error: null });
    
    render(<VoiceChat />);
    
    const input = screen.getByPlaceholderText('Type your health question...');
    const sendButton = screen.getByRole('button', { name: '' }); // Send icon button
    
    await user.type(input, 'What should I eat for breakfast?');
    await user.click(sendButton);
    
    expect(mockSendMessageToLLM).toHaveBeenCalledWith('What should I eat for breakfast?', false);
    expect(input).toHaveValue('');
  });

  it('shows conversations sidebar when toggled', async () => {
    const user = userEvent.setup();
    render(<VoiceChat />);
    
    const conversationsButton = screen.getByTitle('Conversations');
    await user.click(conversationsButton);
    
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Health Questions')).toBeInTheDocument();
  });

  it('creates new conversation', async () => {
    const user = userEvent.setup();
    render(<VoiceChat />);
    
    // Open sidebar first
    const conversationsButton = screen.getByTitle('Conversations');
    await user.click(conversationsButton);
    
    const newConversationButton = screen.getByTitle('New conversation');
    await user.click(newConversationButton);
    
    expect(mockStartNewConversation).toHaveBeenCalled();
  });

  it('switches to different conversation', async () => {
    const user = userEvent.setup();
    render(<VoiceChat />);
    
    // Open sidebar
    const conversationsButton = screen.getByTitle('Conversations');
    await user.click(conversationsButton);
    
    // Click on conversation
    await user.click(screen.getByText('Health Questions'));
    
    expect(mockSwitchConversation).toHaveBeenCalledWith(mockConversations[0]);
  });

  it('deletes conversation with confirmation', async () => {
    const user = userEvent.setup();
    mockDeleteConversation.mockResolvedValue({ error: null });
    window.confirm = vi.fn(() => true);
    
    render(<VoiceChat />);
    
    // Open sidebar
    const conversationsButton = screen.getByTitle('Conversations');
    await user.click(conversationsButton);
    
    // Click delete button (need to hover to show it)
    const conversationItem = screen.getByText('Health Questions').closest('div');
    const deleteButton = conversationItem?.querySelector('[title="Delete conversation"]');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this conversation?');
    expect(mockDeleteConversation).toHaveBeenCalledWith('conv-1');
  });

  it('shows loading state when sending message', () => {
    vi.mocked(require('../../hooks/useChat').useChat).mockReturnValue({
      conversations: mockConversations,
      currentConversation: mockConversations[0],
      messages: mockMessages,
      loading: true,
      error: null,
      sendMessageToLLM: mockSendMessageToLLM,
      switchConversation: mockSwitchConversation,
      startNewConversation: mockStartNewConversation,
      deleteConversation: mockDeleteConversation
    });
    
    render(<VoiceChat />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('shows error message when present', () => {
    vi.mocked(require('../../hooks/useChat').useChat).mockReturnValue({
      conversations: mockConversations,
      currentConversation: mockConversations[0],
      messages: mockMessages,
      loading: false,
      error: 'Failed to send message',
      sendMessageToLLM: mockSendMessageToLLM,
      switchConversation: mockSwitchConversation,
      startNewConversation: mockStartNewConversation,
      deleteConversation: mockDeleteConversation
    });
    
    render(<VoiceChat />);
    
    expect(screen.getByText('Failed to send message')).toBeInTheDocument();
  });

  it('shows quick action buttons when no messages', () => {
    vi.mocked(require('../../hooks/useChat').useChat).mockReturnValue({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      error: null,
      sendMessageToLLM: mockSendMessageToLLM,
      switchConversation: mockSwitchConversation,
      startNewConversation: mockStartNewConversation,
      deleteConversation: mockDeleteConversation
    });
    
    render(<VoiceChat />);
    
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText('Blood pressure tracking')).toBeInTheDocument();
    expect(screen.getByText('Sleep habits')).toBeInTheDocument();
    expect(screen.getByText('Exercise routine')).toBeInTheDocument();
  });
});