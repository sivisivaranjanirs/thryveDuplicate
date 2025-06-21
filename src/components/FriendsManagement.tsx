import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Check, 
  X, 
  Trash2, 
  Send,
  Loader2,
  AlertCircle,
  FileText,
  Shield,
  Clock,
  Eye
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
          <p className="text-gray-600">Loading access...</p>
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">Access Management</h1>
            <p className="text-xs text-gray-600 hidden sm:block">Manage health data sharing</p>
          </div>
          <button
            onClick={() => setShowAddFriend(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Request</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <p className="text-xs text-red-700 truncate">{error}</p>
          </div>
        </div>
      )}

      {/* Compact Tabs */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <nav className="flex px-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'friends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>I Can View ({friends.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('my-access')}
            className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'my-access'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Can View Mine ({myViewers.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'requests'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Mail className="h-4 w-4" />
              <span>Requests ({receivedRequests.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4">
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg">
                  <Eye className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No access yet</h3>
                  <p className="text-xs text-gray-600 mb-3">Request access to view others' health data</p>
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="bg-blue-600 text-white px-3 py-2 text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Request Access
                  </button>
                </div>
              ) : (
                friends.map((permission) => (
                  <div key={permission.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => handleViewFriendReport(
                              permission.owner_id,
                              permission.owner_name || permission.owner_email?.split('@')[0] || 'User',
                              permission.owner_email || ''
                            )}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left truncate block w-full"
                          >
                            {permission.owner_name || permission.owner_email?.split('@')[0] || 'User'}
                          </button>
                          <p className="text-xs text-gray-500 truncate">{permission.owner_email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewFriendReport(
                            permission.owner_id,
                            permission.owner_name || permission.owner_email?.split('@')[0] || 'User',
                            permission.owner_email || ''
                          )}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View report"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'my-access' && (
            <div className="space-y-3">
              {myViewers.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg">
                  <Shield className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No viewers yet</h3>
                  <p className="text-xs text-gray-600">No one can view your health data</p>
                </div>
              ) : (
                myViewers.map((permission) => (
                  <div key={permission.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {permission.viewer_name || permission.viewer_email?.split('@')[0] || 'User'}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">{permission.viewer_email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Viewing
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
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {/* Received Requests */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Requests to View My Data</h3>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-lg">
                    <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <div key={request.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <div className="bg-orange-100 p-2 rounded-full">
                              <UserPlus className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {request.requester_name || request.requester_email?.split('@')[0] || 'User'}
                              </h4>
                              <p className="text-xs text-gray-500 truncate">{request.requester_email}</p>
                              {request.message && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">"{request.message}"</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                              title="Accept"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(request.id)}
                              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">My Requests</h3>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-lg">
                    <Send className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {request.owner_name || request.owner_email?.split('@')[0] || 'User'}
                              </h4>
                              <p className="text-xs text-gray-500 truncate">{request.owner_email}</p>
                            </div>
                          </div>
                          
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex-shrink-0">
                            Pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Request Access</h3>
            
            <form onSubmit={handleSendReadingRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={friendMessage}
                  onChange={(e) => setFriendMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Hi! I'd like to view your health readings..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !friendEmail.trim()}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    'Send Request'
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