import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VoiceChat from './components/VoiceChat';
import HealthTracking from './components/HealthTracking';
import ChatHistory from './components/ChatHistory';
import FriendsManagement from './components/FriendsManagement';
import Feedback from './components/Feedback';
import ProfileSettings from './components/ProfileSettings';

function App() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Handle hash-based navigation for quick actions
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      console.log('App - Hash changed to:', hash);
      if (hash && ['dashboard', 'voice-chat', 'health-tracking', 'history', 'friends', 'reports', 'settings', 'feedback', 'help'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen for new version available event
  useEffect(() => {
    const handleNewVersionAvailable = () => {
      setShowUpdateBanner(true);
    };

    window.addEventListener('new-version-available', handleNewVersionAvailable);
    return () => window.removeEventListener('new-version-available', handleNewVersionAvailable);
  }, []);

  // Update the hash when tab changes
  const handleTabChange = (tab: string) => {
    // Update the hash which will trigger the hashchange event
    window.location.hash = tab;
    // No need to call setActiveTab directly as the hashchange event will handle it
  };

  const handleRefreshApp = () => {
    // Clear all caches and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Tell the service worker to skip waiting and take control
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Clear all caches
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log('Cache cleared successfully, reloading...');
            window.location.reload();
          }
        };
        
        navigator.serviceWorker.controller?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
        
        // Fallback: reload after a short delay if cache clearing doesn't respond
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }).catch(() => {
        // Fallback if service worker is not available
        window.location.reload();
      });
    } else {
      // Fallback for browsers without service worker support
      window.location.reload();
    }
  };

  const handleDismissUpdate = () => {
    setShowUpdateBanner(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'voice-chat':
        return <VoiceChat />;
      case 'health-tracking':
        return <HealthTracking />;
      case 'history':
        return <ChatHistory />;
      case 'friends':
        return (
          <ErrorBoundary>
            <FriendsManagement />
          </ErrorBoundary>
        );
      case 'feedback':
        return (
          <ErrorBoundary>
            <Feedback />
          </ErrorBoundary>
        );
      case 'reports':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Health Reports</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Health reports feature coming soon</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-0">
            <ProfileSettings />
          </div>
        );
      case 'help':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Help & Support</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Help & support section coming soon</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Update Banner */}
      {showUpdateBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 text-blue-100" />
                <div>
                  <p className="font-medium text-sm">New version available!</p>
                  <p className="text-xs text-blue-100">Refresh to get the latest features and improvements.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefreshApp}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  Refresh Now
                </button>
                <button
                  onClick={handleDismissUpdate}
                  className="p-2 text-blue-100 hover:text-white hover:bg-blue-700 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      <div className={`flex-1 flex flex-col w-full ${showUpdateBanner ? 'pt-16' : ''}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;