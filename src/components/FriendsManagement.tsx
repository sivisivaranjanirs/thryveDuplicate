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
  Eye,
  ChevronDown,
  ChevronUp
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
  const [openAccordion, setOpenAccordion] = useState<'friends' | 'my-access' | 'requests' | null>('friends');
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

  const toggleAccordion = (section: 'friends' | 'my-access' | 'requests') => {
    setOpenAccordion(openAccordion === section ? null : section);
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Access Management</h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">Request access to view others' health readings</p>
          </div>
          <button
            onClick={() => setShowAddFriend(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 flex-shrink-0 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Request Access</span>
            <span className="sm:hidden">Request</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-red-700 text-xs truncate">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content Area with Fixed Height */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* I Can View Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => toggleAccordion('friends')}
                className="w-full px-3 sm:px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">I Can View</h3>
                    <p className="text-xs text-gray-600 truncate">Health data I have access to ({friends.length})</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {openAccordion === 'friends' ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openAccordion === 'friends' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-4 pb-3 border-t border-gray-200">
                      {friends.length === 0 ? (
                        <div className="text-center py-4">
                          <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No reading access yet</h3>
                          <p className="text-xs text-gray-600 mb-3">Request access to view others' health readings</p>
                          <button
                            onClick={() => setShowAddFriend(true)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                          >
                            Request Your First Access
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
                          {friends.map((permission) => (
                            <div key={permission.id} className="flex items-center p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className="bg-blue-100 p-1.5 rounded-full flex-shrink-0">
                                  <Eye className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <button
                                    onClick={() => handleViewFriendReport(
                                      permission.owner_id,
                                      permission.owner_name || permission.owner_email?.split('@')[0] || 'User',
                                      permission.owner_email || 'No email available'
                                    )}
                                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left text-xs sm:text-sm truncate block w-full"
                                  >
                                    {permission.owner_name || permission.owner_email?.split('@')[0] || 'User'}
                                  </button>
                                  <p className="text-xs text-gray-500 truncate">{permission.owner_email || 'No email available'}</p>
                                  <p className="text-xs text-gray-400">
                                    Access granted {new Date(permission.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                <button
                                  onClick={() => handleViewFriendReport(
                                    permission.owner_id,
                                    permission.owner_name || permission.owner_email?.split('@')[0] || 'User',
                                    permission.owner_email || ''
                                  )}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View health report"
                                >
                                  <FileText className="h-3 w-3" />
                                </button>
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                                  Active
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Who Can View Mine Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => toggleAccordion('my-access')}
                className="w-full px-3 sm:px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">Who Can View Mine</h3>
                    <p className="text-xs text-gray-600 truncate">People who can view my health data ({myViewers.length})</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {openAccordion === 'my-access' ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openAccordion === 'my-access' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-4 pb-3 border-t border-gray-200">
                      {myViewers.length === 0 ? (
                        <div className="text-center py-4">
                          <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No one has access yet</h3>
                          <p className="text-xs text-gray-600">No users currently have permission to view your health readings</p>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
                          {myViewers.map((permission) => (
                            <div key={permission.id} className="flex items-center p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className="bg-green-100 p-1.5 rounded-full flex-shrink-0">
                                  <Shield className="h-3 w-3 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                                    {permission.viewer_name || permission.viewer_email?.split('@')[0] || 'Unknown User'}
                                  </h3>
                                  <p className="text-xs text-gray-500 truncate">{permission.viewer_email || 'No email available'}</p>
                                  <p className="text-xs text-gray-400">
                                    Access granted {new Date(permission.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                                  Can View
                                </span>
                                <button
                                  onClick={() => handleRemoveAccess(
                                    permission.viewer_id,
                                    permission.viewer_name || permission.viewer_email?.split('@')[0] || 'User'
                                  )}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove access"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Requests Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => toggleAccordion('requests')}
                className="w-full px-3 sm:px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                    <Mail className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">Requests</h3>
                    <p className="text-xs text-gray-600 truncate">Pending access requests ({receivedRequests.length} received, {sentRequests.length} sent)</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {openAccordion === 'requests' ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openAccordion === 'requests' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-4 pb-3 border-t border-gray-200">
                      {/* Received Requests */}
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Requests to View My Readings</h4>
                        {receivedRequests.length === 0 ? (
                          <div className="text-center py-3">
                            <Mail className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">No pending reading requests</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {receivedRequests.map((request) => (
                              <div key={request.id} className="flex items-center p-2.5 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <div className="bg-yellow-100 p-1.5 rounded-full flex-shrink-0">
                                    <UserPlus className="h-3 w-3 text-yellow-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-gray-900 text-xs truncate">
                                      {request.requester_name || request.requester_email?.split('@')[0] || 'Unknown User'}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">{request.requester_email || 'No email available'}</p>
                                    {request.message && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">"{request.message}"</p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                      {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                  <button
                                    onClick={() => handleAcceptRequest(request.id)}
                                    className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                                    title="Accept request"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeclineRequest(request.id)}
                                    className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                    title="Decline request"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sent Requests */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">My Requests for Access</h4>
                        {sentRequests.length === 0 ? (
                          <div className="text-center py-3">
                            <Send className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">No pending access requests</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {sentRequests.map((request) => (
                              <div key={request.id} className="flex items-center p-2.5 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <div className="bg-blue-100 p-1.5 rounded-full flex-shrink-0">
                                    <Clock className="h-3 w-3 text-blue-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-gray-900 text-xs truncate">
                                      {request.owner_name || request.owner_email?.split('@')[0] || 'Unknown User'}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">{request.owner_email || 'No email available'}</p>
                                    <p className="text-xs text-gray-400">
                                      Sent {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex-shrink-0 ml-2">
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full whitespace-nowrap">
                                    Pending
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Request Reading Access</h3>
            
            <form onSubmit={handleSendReadingRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User's Email Address
                </label>
                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Hi! I'd like to view your health readings on Thryve..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !friendEmail.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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