import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from '../useChat';

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

// Mock fetch for LLM API
global.fetch = vi.fn();

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch conversations on mount', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        user_id: 'test-user-id',
        title: 'Test Conversation',
        created_at: '2023-01-01T00:00:00Z'
      }
    ];

    mockSupabase.from().single.mockResolvedValue({
      data: mockConversations,
      error: null
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('chat_conversations');
  });

  it('should create a new conversation', async () => {
    const mockConversation = {
      id: 'new-conv-id',
      user_id: 'test-user-id',
      title: 'New Conversation',
      created_at: '2023-01-01T00:00:00Z'
    };

    mockSupabase.from().single.mockResolvedValue({
      data: mockConversation,
      error: null
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.startNewConversation();
    });

    expect(result.current.currentConversation).toBe(null);
    expect(result.current.messages).toEqual([]);
  });

  it('should send message to LLM and get response', async () => {
    // Mock successful conversation creation
    const mockConversation = {
      id: 'conv-id',
      user_id: 'test-user-id',
      title: 'Test Message',
      created_at: '2023-01-01T00:00:00Z'
    };

    // Mock successful message insertion
    const mockMessage = {
      id: 'msg-id',
      conversation_id: 'conv-id',
      user_id: 'test-user-id',
      message_type: 'user',
      content: 'Test message',
      created_at: '2023-01-01T00:00:00Z'
    };

    mockSupabase.from().single
      .mockResolvedValueOnce({ data: mockConversation, error: null })
      .mockResolvedValueOnce({ data: mockMessage, error: null })
      .mockResolvedValueOnce({ data: { ...mockMessage, message_type: 'assistant', content: 'AI response' }, error: null });

    // Mock LLM API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        response: 'This is an AI response'
      })
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      const response = await result.current.sendMessageToLLM('Test message');
      expect(response.error).toBe(null);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/llm-chat'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('Test message')
      })
    );
  });

  it('should handle LLM API error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      const response = await result.current.sendMessageToLLM('Test message');
      expect(response.error).toContain('HTTP error');
    });
  });

  it('should delete a conversation', async () => {
    mockSupabase.from().single.mockResolvedValue({
      data: null,
      error: null
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      const response = await result.current.deleteConversation('conv-id');
      expect(response.success).toBe(true);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('chat_conversations');
  });
});