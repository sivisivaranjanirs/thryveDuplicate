import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../hooks/useChat';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export default function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversation,
    messages: dbMessages,
    loading,
    error,
    sendMessageToLLM,
    switchConversation,
    startNewConversation,
    deleteConversation,
  } = useChat();

  // Convert database messages to component format
  const messages: Message[] = dbMessages.map(msg => ({
    id: msg.id,
    type: msg.message_type,
    content: msg.content,
    timestamp: new Date(msg.created_at),
    isVoice: msg.is_voice,
  }));

  // Debug logging to help identify issues
  useEffect(() => {
    console.log('VoiceChat - Current conversation:', currentConversation?.id);
    console.log('VoiceChat - Messages count:', messages.length);
    console.log('VoiceChat - Loading:', loading);
    console.log('VoiceChat - DB Messages count:', dbMessages.length);
    console.log('VoiceChat - Current conversation title:', currentConversation?.title);
  }, [currentConversation, messages, loading]);

  // Show loading state while conversation is being switched or messages are loading
  const isLoadingConversation = loading && currentConversation;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        handleVoiceRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your permissions and try again.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setIsListening(false);
    setMediaRecorder(null);
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    try {
      // Try to use Web Speech API for speech-to-text
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleSendMessage(transcript, true);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Fallback to simulated transcription
          const simulatedTranscription = "I've been having headaches lately and I'm concerned about my blood pressure.";
          handleSendMessage(simulatedTranscription, true);
        };
        
        // Convert audio blob to audio element and play it for recognition
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // For now, since we can't easily feed the recorded audio to speech recognition,
        // we'll use a simulated transcription but keep the real recording infrastructure
        const simulatedTranscription = "I've been having headaches lately and I'm concerned about my blood pressure.";
        handleSendMessage(simulatedTranscription, true);
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
      } else {
        // Fallback for browsers without speech recognition
        const simulatedTranscription = "I've been having headaches lately and I'm concerned about my blood pressure.";
        handleSendMessage(simulatedTranscription, true);
      }
    } catch (error) {
      console.error('Error processing voice recording:', error);
      // Fallback to simulated transcription
      const simulatedTranscription = "I've been having headaches lately and I'm concerned about my blood pressure.";
      handleSendMessage(simulatedTranscription, true);
    }
  };

  const handleSendMessage = async (content: string, isVoice = false) => {
    if (!content.trim()) return;

    setTextInput('');
    const result = await sendMessageToLLM(content, isVoice);
    
    if (result.error) {
      console.error('Send message error:', result.error);
      // Don't show alert for now, error will be displayed in the UI
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(textInput);
  };

  const toggleSpeech = () => {
    setIsSpeaking(!isSpeaking);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      const { error } = await deleteConversation(conversationId);
      if (error) {
        alert(`Error deleting conversation: ${error}`);
      }
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Conversations Sidebar */}
      <div className={`${showConversations ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Conversations</h3>
            <button
              onClick={startNewConversation}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-full">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => switchConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    currentConversation?.id === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentConversation ? currentConversation.title : 'New Conversation'}
                </h2>
                <p className="text-sm text-gray-600">AI Health Assistant</p>
              </div>
            </div>
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-full transition-colors ${
                isSpeaking ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingConversation ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="text-center py-8">
              <div className="bg-blue-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-600 mb-4">Ask me anything about your health and wellness</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleSendMessage("How can I track my blood pressure?")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Blood pressure tracking
                </button>
                <button
                  onClick={() => handleSendMessage("What are healthy sleep habits?")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Sleep habits
                </button>
                <button
                  onClick={() => handleSendMessage("How often should I exercise?")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Exercise routine
                </button>
              </div>
            </div>
          ) : null}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.isVoice && (
                      <Volume2 className={`h-3 w-3 ml-2 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Recording Indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mx-4 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-blue-700">Listening...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={true}
              className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 ${
                isRecording
                  ? 'bg-red-500 text-white shadow-lg scale-110'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              }`}
              title="Voice chat coming soon"
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            
            <form onSubmit={handleTextSubmit} className="flex-1 flex space-x-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your health question..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || loading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}