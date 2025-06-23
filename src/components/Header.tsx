import React, { useState, useRef, useEffect } from 'react';
import { Leaf, Menu, User, LogOut, Bell, Heart, UserPlus, Check, Camera, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, userProfile, signOut } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useFriends();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setShowProfileDropdown(false);
    await signOut();
  };

  const handleEditProfileClick = () => {
    setShowProfileDropdown(false);
    window.location.hash = 'settings';
  };

  const handlePhotoClick = () => {
    setShowPhotoUpload(true);
    // For now, we'll show a coming soon message
    // In the future, this would trigger file upload
    setTimeout(() => {
      setShowPhotoUpload(false);
      alert('Profile photo upload feature coming soon! 📸');
    }, 100);
  };
  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    setShowNotifications(false); // Close notifications when opening profile
  };

  const toggleNotifications = async () => {
    const wasOpen = showNotifications;
    setShowNotifications(!showNotifications);
    setShowProfileDropdown(false); // Close profile when opening notifications
    
    // Auto-mark all notifications as read when opening the dropdown
    if (!wasOpen && unreadNotificationsCount > 0) {
      await markAllNotificationsAsRead();
    }
  };

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markNotificationAsRead(notificationId);
    }
  };

  // Get display name and email
  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = userProfile?.email || user?.email || '';

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center ml-2 md:ml-0">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Thryve</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={toggleNotifications}
                className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors relative"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown Menu */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        {notifications.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {notifications.length} total
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="py-1">
                          {notifications.slice(0, 10).map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                                notification.is_read 
                                  ? 'border-transparent' 
                                  : 'border-blue-500 bg-blue-50'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`p-1.5 rounded-full flex-shrink-0 ${
                                  notification.notification_type === 'health_metric'
                                    ? 'bg-green-100'
                                    : notification.notification_type === 'friend_request'
                                    ? 'bg-yellow-100'
                                    : 'bg-blue-100'
                                }`}>
                                  {notification.notification_type === 'health_metric' && (
                                    <Heart className="h-3 w-3 text-green-600" />
                                  )}
                                  {notification.notification_type === 'friend_request' && (
                                    <UserPlus className="h-3 w-3 text-yellow-600" />
                                  )}
                                  {(notification.notification_type === 'friend_accepted' || notification.notification_type === 'reading_accepted') && (
                                    <Check className="h-3 w-3 text-blue-600" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {notification.title}
                                    </p>
                                    {!notification.is_read && (
                                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.created_at).toLocaleDateString()} at{' '}
                                    {new Date(notification.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {notifications.length > 10 && (
                            <div className="px-4 py-2 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setShowNotifications(false);
                                  // Navigate to friends page with notifications tab
                                  window.location.hash = 'friends';
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View all notifications
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={toggleProfileDropdown}
                className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                title="User Profile"
              >
                <User className="h-6 w-6" />
              </button>
              
              {/* Dropdown Menu */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={handlePhotoClick}
                          className="bg-blue-100 p-2 rounded-full hover:bg-blue-200 transition-colors group relative"
                          title="Add Profile Photo"
                        >
                          <User className="h-5 w-5 text-blue-600" />
                          <Camera className="h-3 w-3 text-blue-500 absolute translate-x-1 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">
                            {displayName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {displayEmail}
                          </p>
                          <button
                            onClick={handleEditProfileClick}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                          >
                            Edit Profile →
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}