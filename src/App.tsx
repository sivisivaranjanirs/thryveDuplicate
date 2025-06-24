import React, { useState, useEffect } from 'react';
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

  // Update the hash when tab changes
  const handleTabChange = (tab: string) => {
    // Update the hash which will trigger the hashchange event
    window.location.hash = tab;
    // No need to call setActiveTab directly as the hashchange event will handle it
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
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      <div className="flex-1 flex flex-col w-full">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;