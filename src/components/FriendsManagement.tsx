import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Check, 
  X, 
  Trash2, 
  Bell,
  BellOff,
  Send,
  Loader2,
  Heart,
  Clock,
  AlertCircle,
  FileText,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { motion, AnimatePresence } from 'framer-motion';
import FriendHealthReport from './FriendHealthReport';

export default function FriendsManagement() {
  const { user } = useAuth();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendMessage, setFriendMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'my-access' | 'requests'>('friends');
  const [selectedFriend, setSelectedFriend] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const {
    friends,
    myViewers,
    friendRequests: readingRequests,
    loading,
    error,
    sendReadingRequest,
    acceptReadingRequest,
    declineReadingRequest,
    revokeReadingPermission,
    removeAccess
  } = useFriends();

  // Debug logging to help identify the issue
  console.log('=== FriendsManagement Debug ===');
  console.log('friends:', friends);
  console.log('myViewers:', myViewers);
  console.log('readingRequests:', readingRequests);
  console.log('loading:', loading);
  console.log('error:', error);
  console.log('user:', user);
  console.log('================================');

  const handleSendReadingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;

    setSubmitting(true);
    const { error } = await sendReadingRequest(friendEmail.trim(), friendMessage.trim() || undefined);
    
    if (error) {
      alert(`Error sending reading request: ${error}`);
    } else {
      setShowAddFriend(false);
      setFriendEmail('');
      setFriendMessage('');
    }
    
    setSubmitting(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await acceptReadingRequest(requestId);
    if (error) {
      alert(`Error accepting reading request: ${error}`);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    const { error } = await declineReadingRequest(requestId);
    if (error) {
      alert(`Error declining reading request: ${error}`);
    }
  };

  const handleRevokePermission = async (viewerId: string, viewerName: string) => {
    if (confirm(`Are you sure you want to revoke ${viewerName}'s permission to view your readings?`)) {
      const { error } = await revokeReadingPermission(viewerId);
      if (error) {
        alert(`Error revoking permission: ${error}`);
      }
    }
  };

  const handleRemoveAccess = async (viewerId: string, viewerName: string) => {
    if (confirm(`Are you sure you want to remove ${viewerName}'s access to view your health readings?`)) {
      const { error } = await removeAccess(viewerId, viewerName);
      if (error) {
        alert(`Error removing access: ${error}`);
      }
    }
  };

  const handleViewFriendReport = (friendId: string, friendName: string, friendEmail: string) => {
    setSelectedFriend({
      id: friendId,
      name: friendName,
      email: friendEmail
    });
  };

  const handleBackFromReport = () => {
    setSelectedFriend(null);
  };

  const sentRequests = readingRequests.filter(req => req.requester_id === user?.id);
  const receivedRequests = readingRequests.filter(req => req.owner_id === user?.id);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading friends...</p>
        </div>
      </div>
    );
  }

  // Show friend health report if a friend is selected
  if (selectedFriend) {
    return (
      <FriendHealthReport
        friendId={selectedFriend.id}
        friendName={selectedFriend.name}
        friendEmail={selectedFriend.email}
        onBack={handleBackFromReport}
      />
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="h-full flex flex-col px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
        <div className="min-w-0 flex-1 pr-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Reading Access Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Request access to view others' health readings</p>
        </div>
        <button
          onClick={() => setShowAddFriend(true)}
          className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 flex-shrink-0"
        >
          <UserPlus className="h-5 w-5" />
          <span className="hidden sm:inline">Request Access</span>
          <span className="sm:hidden">Request</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex-shrink-0">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm sm:text-base text-red-700 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="w-full overflow-x-auto flex-shrink-0">
            <nav className="flex px-4 sm:px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-shrink-0 py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors mr-4 sm:mr-8 ${
                activeTab === 'friends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Users className="h-5 w-5" />
                <span className="whitespace-nowrap">My Access ({friends.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('my-access')}
              className={`flex-shrink-0 py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors mr-4 sm:mr-8 ${
                activeTab === 'my-access'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Shield className="h-5 w-5" />
                <span className="whitespace-nowrap">Who Can View Mine ({myViewers.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-shrink-0 py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Mail className="h-5 w-5" />
                <span className="whitespace-nowrap">Requests ({receivedRequests.length})</span>
              </div>
            </button>
          </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No reading access yet</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">Request access to view others' health readings</p>
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="bg-blue-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Request Your First Access
                  </button>
                </div>
              ) : (
                friends.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleViewFriendReport(
                            permission.owner_id,
                            permission.owner_name || permission.owner_email?.split('@')[0] || 'User',
                            permission.owner_email || 'No email available'
                          )}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {permission.owner_name || permission.owner_email?.split('@')[0] || 'User'}
                        </button>
                        <p className="text-xs sm:text-sm text-gray-500 break-words">{permission.owner_email || 'No email available'}</p>
                        <p className="text-xs text-gray-400">
                          Access granted {new Date(permission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewFriendReport(
                          permission.owner_id,
                         permission.owner_name || permission.owner_email?.split('@')[0] || 'User',
                          permission.owner_email || ''
                        )}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View health report"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                        Active
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'my-access' && (
            <div className="space-y-4">
              {myViewers.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No one has access yet</h3>
                  <p className="text-sm sm:text-base text-gray-600">No users currently have permission to view your health readings</p>
                </div>
              ) : (
                myViewers.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {permission.viewer_name || permission.viewer_email?.split('@')[0] || 'Unknown User'}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 break-words">{permission.viewer_email || 'No email available'}</p>
                        <p className="text-xs text-gray-400">
                          Access granted {new Date(permission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                        Can View
                      </span>
                      <button
                        onClick={() => handleRemoveAccess(
                          permission.viewer_id,
                          permission.viewer_name || permission.viewer_email?.split('@')[0] || 'User'
                        )}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Received Requests */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Requests to View My Readings</h3>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-6">
                    <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-gray-500">No pending reading requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-yellow-100 p-2 rounded-full">
                            <UserPlus className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {request.requester_name || request.requester_email?.split('@')[0] || 'Unknown User'}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-500 break-words">{request.requester_email || 'No email available'}</p>
                            {request.message && (
                              <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">"{request.message}"</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(request.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                            title="Accept request"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.id)}
                            className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                            title="Decline request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">My Requests for Access</h3>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-6">
                    <Send className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-gray-500">No pending access requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {request.owner_name || request.owner_email?.split('@')[0] || 'Unknown User'}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-500 break-words">{request.owner_email || 'No email available'}</p>
                            <p className="text-xs text-gray-400">
                              Sent {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full whitespace-nowrap">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Request Reading Access</h3>
            
            <form onSubmit={handleSendReadingRequest} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  User's Email Address
                </label>
                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={friendMessage}
                  onChange={(e) => setFriendMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Hi! I'd like to view your health readings on HealthVoice..."
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="w-full sm:flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !friendEmail.trim()}
                  className="w-full sm:flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    'Request Access'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}