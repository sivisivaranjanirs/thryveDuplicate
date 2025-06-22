import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  Calendar, 
  Search, 
  Loader2, 
  Plus,
  Send,
  Volume2,
  ArrowLeft
} from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export default function ChatHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    conversations, 
    messages: dbMessages,
    loading, 
    deleteConversation,
    switchConversation,
    startNewConversation,
    sendMessageToLLM,
    currentConversation
  } = useChat();

  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Convert database messages to component format
  const messages: Message[] = dbMessages.map(msg => ({
    id: msg.id,
    type: msg.message_type,
    content: msg.content,
    timestamp: new Date(msg.created_at),
    isVoice: msg.is_voice,
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    await switchConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      const { error } = await deleteConversation(conversationId);
      if (error) {
        alert(`Error deleting conversation: ${error}`);
      } else {
        // If the deleted conversation was selected, go back to list
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
        }
      }
    }
  };

  const handleStartNewConversation = () => {
    startNewConversation();
    setSelectedConversation(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setTextInput('');
    const result = await sendMessageToLLM(content, false);
    
    if (result.error) {
      console.error('Send message error:', result.error);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(textInput);
  };

  // Show conversation view if one is selected
  if (selectedConversation) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {/* Conversation Header with Back Button */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToList}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                {selectedConversation.title}
              </h2>
              <p className="text-sm text-gray-600">
                Created: {new Date(selectedConversation.created_at).toLocaleDateString()} • 
                Updated: {new Date(selectedConversation.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 sm:p-6 space-y-4">
          {loading && currentConversation?.id === selectedConversation.id ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No messages in this conversation</p>
            </div>
          ) : (
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
                    <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">{message.content}</p>
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
          )}

          {loading && currentConversation?.id === selectedConversation.id && messages.length > 0 && (
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

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 sm:p-6">
          <form onSubmit={handleTextSubmit} className="flex space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Continue the conversation..."
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
    );
  }

  // Show conversations list
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Chat History</h1>
            <p className="text-gray-600">Your conversations</p>
          </div>
          <button
            onClick={handleStartNewConversation}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="New conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1">
        {loading && conversations.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start a conversation to see your chat history here'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleStartNewConversation}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
              >
                Start First Conversation
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className="p-4 rounded-lg cursor-pointer transition-colors group mb-4 bg-white border border-gray-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <h3 className="text-sm font-medium text-gray-900 break-words">
                        {conversation.title}
                      </h3>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Created: {new Date(conversation.created_at).toLocaleDateString()}</div>
                      <div>Updated: {new Date(conversation.updated_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {conversations.length > 0 && (
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-900">
                Total: {conversations.length} conversations
              </p>
              <p className="text-xs text-blue-700">
                Track your health discussions
              </p>
            </div>
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}