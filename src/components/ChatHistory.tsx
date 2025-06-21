import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  Calendar, 
  Search, 
  Loader2, 
  Plus,
  Send,
  Volume2
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

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      const { error } = await deleteConversation(conversationId);
      if (error) {
        alert(`Error deleting conversation: ${error}`);
      } else {
        // If the deleted conversation was selected, clear selection
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

  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Conversations List */}
      <div className="w-full sm:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Chat History</h1>
              <p className="text-xs sm:text-sm text-gray-600">Your conversations</p>
            </div>
            <button
              onClick={handleStartNewConversation}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
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
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="p-4 sm:p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-gray-600">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 sm:p-6 text-center">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1">
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
                  className="text-xs bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start First Conversation
                </button>
              )}
            </div>
          ) : (
            <div className="p-2 sm:p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors group mb-1 ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {conversation.title}
                        </h3>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <div>Created: {new Date(conversation.created_at).toLocaleDateString()}</div>
                        <div>Updated: {new Date(conversation.updated_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
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

        {/* Stats */}
        {conversations.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-blue-50 flex-shrink-0">
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

      {/* Right Side - Selected Conversation */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {selectedConversation.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Created: {new Date(selectedConversation.created_at).toLocaleDateString()} • 
                    Updated: {new Date(selectedConversation.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
              {loading && currentConversation?.id === selectedConversation.id ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-gray-600">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-xs sm:text-sm text-gray-600">No messages in this conversation</p>
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
                      <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      }`}>
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
                  <div className="bg-white border border-gray-200 rounded-lg px-3 sm:px-4 py-2 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-xs sm:text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <form onSubmit={handleTextSubmit} className="flex space-x-2 items-end">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Continue the conversation..."
                  disabled={loading}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || loading}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-sm">
              <div className="bg-blue-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">Choose a conversation from the left to view its messages</p>
              <button
                onClick={handleStartNewConversation}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}