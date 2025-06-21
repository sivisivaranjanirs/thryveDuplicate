import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  Shield, 
  Save, 
  Loader2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import PushNotificationSettings from './PushNotificationSettings';

interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export default function ProfileSettings() {
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications'>('profile');

  // Load user data on component mount
  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || user?.email || '',
        phone: userProfile.phone || '',
        date_of_birth: userProfile.date_of_birth || '',
        gender: userProfile.gender || '',
        emergency_contact_name: userProfile.emergency_contact_name || '',
        emergency_contact_phone: userProfile.emergency_contact_phone || ''
      });
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user, userProfile]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Update user profile
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditingField(null);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    } finally {
      setSaving(false);
    }
  };

  const formatFieldLabel = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'full_name': return User;
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'date_of_birth': return Calendar;
      case 'gender': return Users;
      case 'emergency_contact_name': return Shield;
      case 'emergency_contact_phone': return Shield;
      default: return User;
    }
  };

  const renderField = (field: keyof ProfileFormData, type: string = 'text', options?: string[]) => {
    const Icon = getFieldIcon(field);
    const isEditing = editingField === field;
    const value = formData[field];

    return (
      <div key={field} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{formatFieldLabel(field)}</h3>
              <p className="text-sm text-gray-500">
                {field === 'email' && 'Your account email address'}
                {field === 'full_name' && 'Your display name'}
                {field === 'phone' && 'Your contact number'}
                {field === 'date_of_birth' && 'Your birth date'}
                {field === 'gender' && 'Your gender identity'}
                {field === 'emergency_contact_name' && 'Emergency contact person'}
                {field === 'emergency_contact_phone' && 'Emergency contact number'}
              </p>
            </div>
          </div>
          
          {!isEditing && (
            <button
              onClick={() => setEditingField(field)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            {type === 'select' && options ? (
              <select
                value={value}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select {formatFieldLabel(field)}</option>
                {options.map(option => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={value}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Enter your ${formatFieldLabel(field).toLowerCase()}`}
              />
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  setEditingField(null);
                  // Reset field to original value
                  if (userProfile) {
                    setFormData(prev => ({
                      ...prev,
                      [field]: (userProfile as any)[field] || ''
                    }));
                  }
                }}
                className="flex items-center space-x-2 px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {value ? (
              <p className="text-gray-900 font-medium">
                {field === 'date_of_birth' && value 
                  ? new Date(value).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : value
                }
              </p>
            ) : (
              <p className="text-gray-400 italic">Not set</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 p-3 rounded-full">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-blue-100">Manage your personal information and preferences</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeSection === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeSection === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </button>
        </div>
      </div>
      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Content based on active section */}
      {activeSection === 'profile' ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              <p className="text-gray-600">Update your basic profile details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderField('full_name')}
            {renderField('email', 'email')}
            {renderField('phone', 'tel')}
            {renderField('date_of_birth', 'date')}
            {renderField('gender', 'select', ['male', 'female', 'other', 'prefer_not_to_say'])}
          </div>

          {/* Emergency Contact */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
                <p className="text-gray-600">Person to contact in case of emergency</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('emergency_contact_name')}
              {renderField('emergency_contact_phone', 'tel')}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Shield className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                <p className="text-gray-600">Your account details and security information</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Account ID:</span>
                <p className="text-gray-600 font-mono text-xs mt-1">{user?.id}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Account Created:</span>
                <p className="text-gray-600 mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Save All Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>Save All Changes</span>
            </button>
          </div>
        </div>
      ) : (
        <PushNotificationSettings />
      )}
    </div>
  );
}