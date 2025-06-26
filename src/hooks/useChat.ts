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

      // Generate hardcoded response based on message content
      const aiResponse = generateHardcodedResponse(message);

      // Add AI response using explicit conversation ID
      const aiMessageResult = await addMessage(aiResponse, 'assistant', conversation.id);
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
              text: aiResponse
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

  // Generate hardcoded responses based on message content
  const generateHardcodedResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // Health-related responses
    if (lowerMessage.includes('blood pressure') || lowerMessage.includes('bp')) {
      return "Blood pressure is an important indicator of cardiovascular health. Normal blood pressure is typically around 120/80 mmHg. Regular monitoring can help you track patterns and identify any concerning changes. Have you been tracking your blood pressure regularly?";
    }
    
    if (lowerMessage.includes('heart rate') || lowerMessage.includes('pulse')) {
      return "Your heart rate can tell us a lot about your cardiovascular fitness and overall health. A normal resting heart rate for adults is typically between 60-100 beats per minute. Athletes often have lower resting heart rates. What's prompting you to ask about heart rate?";
    }
    
    if (lowerMessage.includes('weight') || lowerMessage.includes('lose weight') || lowerMessage.includes('diet')) {
      return "Weight management is about creating sustainable, healthy habits rather than quick fixes. Focus on balanced nutrition, regular physical activity, adequate sleep, and stress management. Small, consistent changes often lead to the most lasting results. What aspect of weight management would you like to explore?";
    }
    
    if (lowerMessage.includes('sleep') || lowerMessage.includes('tired') || lowerMessage.includes('insomnia')) {
      return "Good sleep is fundamental to your physical and mental health. Most adults need 7-9 hours of quality sleep per night. Creating a consistent bedtime routine, limiting screen time before bed, and keeping your bedroom cool and dark can help improve sleep quality. How has your sleep been lately?";
    }
    
    if (lowerMessage.includes('exercise') || lowerMessage.includes('workout') || lowerMessage.includes('fitness')) {
      return "Regular physical activity is one of the best things you can do for your health. The CDC recommends at least 150 minutes of moderate-intensity aerobic activity per week, plus muscle-strengthening activities twice a week. The key is finding activities you enjoy so you'll stick with them. What types of physical activities do you currently enjoy?";
    }
    
    if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('worried')) {
      return "Stress is a normal part of life, but chronic stress can impact both your physical and mental health. Some effective stress management techniques include deep breathing exercises, regular physical activity, mindfulness or meditation, and maintaining social connections. What's been causing you stress lately?";
    }
    
    if (lowerMessage.includes('temperature') || lowerMessage.includes('fever')) {
      return "Body temperature can be an important indicator of your health status. Normal body temperature is typically around 98.6°F (37°C), but can vary slightly from person to person and throughout the day. A fever is generally considered 100.4°F (38°C) or higher. Are you monitoring your temperature for a specific reason?";
    }
    
    if (lowerMessage.includes('glucose') || lowerMessage.includes('blood sugar') || lowerMessage.includes('diabetes')) {
      return "Blood glucose monitoring is crucial for managing diabetes and understanding how your body responds to food, exercise, and stress. Normal fasting blood glucose is typically 70-100 mg/dL. If you have diabetes, your healthcare provider will help you determine your target ranges. How often do you check your blood glucose?";
    }
    
    // Wellness and lifestyle responses
    if (lowerMessage.includes('water') || lowerMessage.includes('hydration') || lowerMessage.includes('drink')) {
      return "Staying well-hydrated is essential for your body to function properly. A general guideline is about 8 glasses (64 ounces) of water per day, but your needs may vary based on activity level, climate, and overall health. Signs of good hydration include pale yellow urine and feeling energetic. How much water do you typically drink in a day?";
    }
    
    if (lowerMessage.includes('nutrition') || lowerMessage.includes('eating') || lowerMessage.includes('food')) {
      return "Good nutrition provides your body with the energy and nutrients it needs to function optimally. Focus on a variety of whole foods including fruits, vegetables, lean proteins, whole grains, and healthy fats. Eating regular, balanced meals can help maintain steady energy levels throughout the day. What does a typical day of eating look like for you?";
    }
    
    // Mental health responses
    if (lowerMessage.includes('mood') || lowerMessage.includes('depression') || lowerMessage.includes('sad')) {
      return "Your emotional well-being is just as important as your physical health. It's normal to have ups and downs, but persistent feelings of sadness or changes in mood might benefit from professional support. Regular exercise, social connections, and stress management can all support mental health. How have you been feeling emotionally lately?";
    }
    
    // General health responses
    if (lowerMessage.includes('health') || lowerMessage.includes('wellness') || lowerMessage.includes('healthy')) {
      return "Health is multifaceted - it includes physical, mental, and social well-being. The foundations of good health typically include regular physical activity, balanced nutrition, adequate sleep, stress management, and maintaining social connections. Small, consistent healthy choices can make a big difference over time. What aspect of your health would you like to focus on?";
    }
    
    if (lowerMessage.includes('doctor') || lowerMessage.includes('medical') || lowerMessage.includes('appointment')) {
      return "Regular check-ups with healthcare providers are an important part of maintaining your health. They can help with preventive care, early detection of potential issues, and management of existing conditions. If you have specific health concerns, it's always best to discuss them with a qualified healthcare professional. Is there something specific you're considering discussing with your doctor?";
    }
    
    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! I'm here to support you with your health and wellness journey. Whether you want to discuss tracking your health metrics, talk about wellness goals, or just check in about how you're feeling, I'm here to listen and help. What's on your mind today?";
    }
    
    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you do')) {
      return "Thank you for asking! I'm here and ready to help you with any health and wellness questions or concerns you might have. More importantly, how are you doing today? I'd love to hear about how you're feeling or what's been on your mind regarding your health.";
    }
    
    // Default responses for unmatched queries
    const defaultResponses = [
      "That's an interesting question about your health and wellness. Could you tell me a bit more about what's prompting this? I'm here to listen and help you think through whatever health-related concerns or goals you might have.",
      
      "I appreciate you sharing that with me. Health and wellness can be complex topics with many interconnected factors. What specific aspect would you like to explore further? I'm here to support your health journey.",
      
      "Thank you for bringing this up. Everyone's health journey is unique, and I'm here to help you navigate yours. Could you share a bit more context about what you're experiencing or what you're hoping to understand better?",
      
      "That's a thoughtful question. When it comes to health and wellness, it's often helpful to consider the bigger picture - how you're feeling physically, mentally, and emotionally. What's been on your mind lately regarding your well-being?",
      
      "I'm glad you're taking an active interest in your health. Self-awareness and reflection are important parts of maintaining wellness. What would be most helpful for you to discuss right now?"
    ];
    
    // Return a random default response
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };
  // Send voice recording to STT and then to LLM
  const sendVoiceRecording = async (audioBlob: Blob) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      console.log('Voice recording: Starting STT process');
      console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      console.log('Voice recording: Created FormData with audio file');

      // Send to Eleven Labs STT (Scribe v1)
      const sttResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eleven-labs-stt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
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