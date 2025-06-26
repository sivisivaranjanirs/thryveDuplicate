import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Plus, MessageSquare, Trash2, Loader2, X, AudioWaveform as Waveform } from 'lucide-react';
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
  const [showConversations, setShowConversations] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [visualizationData, setVisualizationData] = useState<Uint8Array | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const visualizationRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversation,
    messages: dbMessages,
    loading,
    error,
    sendMessageToLLM,
    sendVoiceRecording,
    convertToWav,
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

  // Clean up audio visualization on unmount
  useEffect(() => {
    return () => {
      if (visualizationRef.current) {
        cancelAnimationFrame(visualizationRef.current);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  const handleStartRecording = async () => {
    try {
      console.log('VoiceChat: Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Optimize for speech recognition
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create audio context for visualization
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = context.createMediaStreamSource(stream);
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      setAudioContext(context);
      setAnalyser(analyserNode);
      
      // Start visualization
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      
      const updateVisualization = () => {
        analyserNode.getByteFrequencyData(dataArray);
        setVisualizationData(new Uint8Array(dataArray));
        visualizationRef.current = requestAnimationFrame(updateVisualization);
      };
      
      visualizationRef.current = requestAnimationFrame(updateVisualization);
      
      // Set up media recorder with optimal settings for speech
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' // Opus codec is good for speech
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('VoiceChat: Audio chunk received, size:', event.data.size);
        }
      };

      recorder.onstop = () => {
        console.log('VoiceChat: Recording stopped, processing audio...');
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('VoiceChat: Created audio blob, size:', audioBlob.size);
        handleVoiceRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      console.log('VoiceChat: Recording started successfully');
    } catch (error) {
      console.error('VoiceChat: Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your permissions and try again.');
    }
  };

  const handleStopRecording = () => {
    try {
      console.log('VoiceChat: Stopping recording...');
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      // Stop visualization
      if (visualizationRef.current) {
        cancelAnimationFrame(visualizationRef.current);
        visualizationRef.current = null;
      }
      
      // Close audio context
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
      
      setIsRecording(false);
      setAudioContext(null);
      setAnalyser(null);
      setVisualizationData(null);
      console.log('VoiceChat: Recording stopped successfully');
    } catch (error) {
      console.error('VoiceChat: Error stopping recording:', error);
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    console.log('VoiceChat: Processing voice recording...');
    setIsProcessingVoice(true);
    
    try {
      // Convert webm audio to WAV format for better compatibility
      const wavBlob = await convertWebmToWav(audioBlob);
      console.log('VoiceChat: Converted to WAV, size:', wavBlob.size);
      
      // Check if the audio recording is too short or empty
      if (wavBlob.size < 1000) {
        throw new Error('Recording is too short or empty. Please try recording again with more speech.');
      }
      
      // Send to STT service
      const result = await sendVoiceRecording(wavBlob);
      
      if (result?.error) {
        console.error('VoiceChat: Voice processing failed:', result.error);
        // Show error to user but don't use fallback
        alert(`Voice processing failed: ${result.error}`);
      }
    } catch (error) {
      console.error('VoiceChat: Voice recording processing error:', error);
      alert(`Voice processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Convert webm audio blob to WAV format
  const convertWebmToWav = async (webmBlob: Blob): Promise<Blob> => {
    try {
      console.log('VoiceChat: Converting WebM to WAV...');
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await webmBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get audio data as Float32Array
      const audioData = audioBuffer.getChannelData(0); // Get first channel (mono)
      const sampleRate = audioBuffer.sampleRate;
      
      console.log('VoiceChat: Audio data length:', audioData.length, 'Sample rate:', sampleRate);
      
      // Use the convertToWav utility from useChat hook
      const wavBlob = convertToWav(audioData, sampleRate);
      
      // Clean up audio context
      await audioContext.close();
      
      console.log('VoiceChat: Successfully converted to WAV');
      return wavBlob;
    } catch (error) {
      console.error('VoiceChat: Error converting webm to wav:', error);
      throw new Error('Failed to convert audio format');
    }
  };

  const handleSendMessage = async (content: string, isVoice = false) => {
    if (!content.trim()) return;

    setTextInput('');
    const result = await sendMessageToLLM(content, isVoice);
    
    if (result?.error) {
      console.error('VoiceChat: Send message error:', result.error);
      // Don't show alert for now, error will be displayed in the UI
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(textInput);
  };

  const handleToggleSpeech = () => {
    setIsSpeaking(!isSpeaking);
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

  // Render audio visualization bars
  const renderVisualization = () => {
    if (!visualizationData) return null;
    
    // Only show a subset of bars for better visualization
    const barCount = 20;
    const step = Math.floor(visualizationData.length / barCount);
    
    return (
      <div className="flex items-end justify-center space-x-1 h-12">
        {Array.from({ length: barCount }).map((_, i) => {
          const value = visualizationData[i * step] || 0;
          const height = Math.max(4, (value / 255) * 48); // Min height 4px, max 48px
          return (
            <div key={i} className="w-1 bg-blue-500 rounded-full" style={{ height: `${height}px` }}></div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Conversations Sidebar */}
      <div className={`${showConversations ? 'w-64 sm:w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 fixed sm:relative h-full z-20`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
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
          <button 
            onClick={() => setShowConversations(false)}
            className="sm:hidden p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-57px)]">
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
                      ? 'bg-blue-50'
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
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" 
                title="Conversations"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
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
        <div className="flex-1 p-4 sm:p-6 space-y-4">
          {isLoadingConversation ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="text-center py-10">
              <div className="bg-blue-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-600 mb-4">Ask me anything about your health and wellness</p>
              <div className="flex flex-wrap gap-2 justify-center px-4">
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

        {/* Voice Recording Visualization */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mx-4 sm:mx-6 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-2">
                  <Waveform className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span className="text-sm text-blue-700">Recording...</span>
                </div>
                
                {renderVisualization()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Voice Message */}
        <AnimatePresence>
          {isProcessingVoice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mx-4 sm:mx-6 mb-2 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                <span className="text-sm text-green-700">Processing your voice message...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <div className="mx-4 sm:mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 sm:p-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={isProcessingVoice ? undefined : isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessingVoice}
              className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 ${
                isRecording
                  ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            
            <form onSubmit={handleTextSubmit} className="flex-1 flex space-x-2">
              <input
                type="text"
                value={isProcessingVoice ? "Processing your voice message..." : textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your health question..."
                disabled={loading || isProcessingVoice}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || loading || isProcessingVoice}
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