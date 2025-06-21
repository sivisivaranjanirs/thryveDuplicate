import { useState, useEffect } from 'react';
import { supabase, ChatConversation, ChatMessage } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch all conversations for the user
  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('useChat - fetchMessages called for conversation:', conversationId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('useChat - fetchMessages result:', data?.length || 0, 'messages');
      console.log('useChat - fetchMessages data:', data);
      setMessages(data || []);
    } catch (err) {
      console.error('useChat - fetchMessages error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  // Create a new conversation
  const createConversation = async (title: string) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert([{
          user_id: user.id,
          title: title
        }])
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setCurrentConversation(data);
      setMessages([]);
      
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  // Add a message to a specific conversation
  const addMessage = async (content: string, messageType: 'user' | 'assistant', conversationId?: string, isVoice = false) => {
    if (!user) return { data: null, error: 'User not authenticated' };
    
    // Use provided conversationId or fall back to currentConversation
    const targetConversationId = conversationId || currentConversation?.id;
    if (!targetConversationId) return { data: null, error: 'No active conversation' };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: targetConversationId,
          user_id: user.id,
          message_type: messageType,
          content: content,
          is_voice: isVoice
        }])
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      
      // Update conversation timestamp
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetConversationId);
      
      if (updateError) {
        console.warn('Failed to update conversation timestamp:', updateError);
      }

      // Update conversations list to reflect new timestamp
      setConversations(prev => prev.map(conv => 
        conv.id === targetConversationId 
          ? { ...conv, updated_at: new Date().toISOString() }
          : conv
      ));

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
      setError(errorMessage);
      console.error('Add message error:', err);
      return { data: null, error: errorMessage };
    }
  };

  // Send message to LLM and get response
  const sendMessageToLLM = async (message: string, isVoice = false) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      // Create conversation if none exists
      let conversation = currentConversation;
      if (!conversation) {
        const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
        const result = await createConversation(title);
        if (result.error) {
          throw new Error(`Failed to create conversation: ${result.error}`);
        }
        conversation = result.data;
        if (!conversation) {
          throw new Error('Failed to create conversation: No data returned');
        }
      }

      // Add user message using explicit conversation ID
      const userMessageResult = await addMessage(message, 'user', conversation.id, isVoice);
      if (userMessageResult.error) {
        throw new Error(`Failed to add user message: ${userMessageResult.error}`);
      }

      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.message_type as 'user' | 'assistant',
        content: msg.content
      }));

      // Call LLM edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      // Add AI response using explicit conversation ID
      const aiMessageResult = await addMessage(data.response, 'assistant', conversation.id);
      if (aiMessageResult.error) {
        throw new Error(`Failed to add AI response: ${aiMessageResult.error}`);
      }

      return { success: true, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      console.error('Chat error:', err);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Switch to a different conversation
  const switchConversation = async (conversation: ChatConversation) => {
    console.log('useChat - switchConversation called with:', conversation.id);
    setCurrentConversation(conversation);
    setError(null);
    // Fetch messages immediately
    await fetchMessages(conversation.id);
  };

  // Start a new conversation
  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  // Delete a conversation
  const deleteConversation = async (conversationId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete conversation';
      return { error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    sendMessageToLLM,
    switchConversation,
    startNewConversation,
    deleteConversation,
    fetchConversations,
  };
}