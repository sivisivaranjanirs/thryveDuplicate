import { useState, useEffect } from 'react';
import { supabase, ChatConversation, ChatMessage } from '../lib/supabase';
import { useAuth } from './useAuth';
import { WaveFile } from 'wavefile';

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
  const sendMessageToLLM = async (message: string, isVoice = false, playAudio = true) => {
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

      // Convert AI response to speech if needed
      if (playAudio) {
        try {
          const ttsResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eleven-labs-tts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: data.response
            }),
          });

          if (ttsResponse.ok) {
            const ttsData = await ttsResponse.json();
            if (ttsData.success && ttsData.audioBase64) {
              // Play the audio
              const audio = new Audio(`data:${ttsData.format};base64,${ttsData.audioBase64}`);
              audio.play();
            }
          }
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
          // Continue even if TTS fails
        }
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

  // Send voice recording to STT and then to LLM
  const sendVoiceRecording = async (audioBlob: Blob) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      console.log('Voice recording: Starting STT process');
      console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      console.log('Voice recording: Converted to base64, length:', base64Audio.length);

      // Send to Eleven Labs STT (Scribe v1)
      const sttResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eleven-labs-stt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: base64Audio
        }),
      });

      console.log('Voice recording: STT response status:', sttResponse.status);

      if (!sttResponse.ok) {
        const errorText = await sttResponse.text();
        console.error('Voice recording: STT error response:', errorText);
        throw new Error(`Speech-to-text error: ${sttResponse.status} - ${errorText}`);
      }

      const sttData = await sttResponse.json();
      console.log('Voice recording: STT response data:', sttData);
      
      if (!sttData.success || !sttData.text) {
        throw new Error(sttData.error || 'Failed to transcribe audio');
      }

      console.log('Voice recording: Transcribed text:', sttData.text);

      // Send transcribed text to LLM
      return await sendMessageToLLM(sttData.text, true);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      console.error('Voice processing error:', err);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Convert raw PCM audio data to WAV format
  const convertToWav = (audioBuffer: Float32Array, sampleRate: number): Blob => {
    // Create a WaveFile instance
    const wav = new WaveFile();
    
    // Convert Float32Array to Int16Array for better compatibility
    const intData = new Int16Array(audioBuffer.length);
    for (let i = 0; i < audioBuffer.length; i++) {
      // Convert float to int, scale to 16-bit range
      intData[i] = Math.max(-32768, Math.min(32767, Math.floor(audioBuffer[i] * 32767)));
    }
    
    // Create WAV from the samples
    wav.fromScratch(1, sampleRate, '16', intData);
    
    // Get WAV file buffer
    const wavBuffer = wav.toBuffer();
    
    // Convert buffer to Blob
    return new Blob([wavBuffer], { type: 'audio/wav' });
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
    sendVoiceRecording,
    convertToWav,
    switchConversation,
    startNewConversation,
    deleteConversation,
    fetchConversations,
  };
}