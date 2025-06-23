import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Star, 
  AlertCircle, 
  Check, 
  Loader2,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

type FeedbackType = 'suggestion' | 'bug' | 'praise' | 'other';
type FeedbackRating = 1 | 2 | 3 | 4 | 5;

interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
  rating: FeedbackRating | null;
}

interface FeedbackSubmission extends FeedbackFormData {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  status: 'pending' | 'reviewed' | 'implemented' | 'declined';
}

export default function Feedback() {
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'suggestion',
    title: '',
    description: '',
    rating: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myFeedback, setMyFeedback] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyFeedback();
    }
  }, [user]);

  const fetchMyFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyFeedback(data || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating: FeedbackRating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit feedback');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please provide a title for your feedback');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please provide a description for your feedback');
      return;
    }

    if (formData.type === 'praise' && formData.rating === null) {
      setError('Please provide a rating for your praise');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: user.id,
          user_name: userProfile?.full_name || user.email?.split('@')[0] || 'Anonymous',
          user_email: userProfile?.email || user.email || '',
          type: formData.type,
          title: formData.title.trim(),
          description: formData.description.trim(),
          rating: formData.rating,
          status: 'pending'
        }]);

      if (error) throw error;

      // Reset form and show success message
      setFormData({
        type: 'suggestion',
        title: '',
        description: '',
        rating: null
      });
      setSubmitted(true);
      
      // Refresh feedback list
      fetchMyFeedback();

      // Hide success message after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const getFeedbackTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'suggestion': return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'bug': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'praise': return <ThumbsUp className="h-5 w-5 text-green-600" />;
      case 'other': return <MessageSquare className="h-5 w-5 text-purple-600" />;
    }
  };

  const getFeedbackTypeColor = (type: FeedbackType) => {
    switch (type) {
      case 'suggestion': return 'blue';
      case 'bug': return 'red';
      case 'praise': return 'green';
      case 'other': return 'purple';
    }
  };

  const getFeedbackStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>;
      case 'reviewed':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Reviewed</span>;
      case 'implemented':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Implemented</span>;
      case 'declined':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Declined</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Help Us Improve Thryve</h1>
          <p className="text-blue-100">Your feedback helps us make Thryve better for everyone</p>
        </div>

        {/* Success Message */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">Thank you for your feedback! We appreciate your input.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Submit Feedback</h2>
            <p className="text-gray-600 text-sm">Tell us what you think about Thryve</p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Feedback Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Feedback Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="suggestion">Suggestion</option>
                <option value="bug">Bug Report</option>
                <option value="praise">Praise</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief summary of your feedback"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Please provide details about your feedback..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Rating (only for praise) */}
            {formData.type === 'praise' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate Thryve?
                </label>
                <div className="flex space-x-4">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingChange(rating as FeedbackRating)}
                      className={`p-2 rounded-full transition-colors ${
                        formData.rating === rating
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Star className={`h-6 w-6 ${
                        formData.rating === rating ? 'fill-yellow-500 text-yellow-500' : ''
                      }`} />
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center"><Frown className="h-4 w-4 mr-1" /> Poor</span>
                  <span className="flex items-center"><Meh className="h-4 w-4 mr-1" /> Average</span>
                  <span className="flex items-center"><Smile className="h-4 w-4 mr-1" /> Excellent</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* My Previous Feedback */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Previous Feedback</h2>
            <p className="text-gray-600 text-sm">Track the status of your submitted feedback</p>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading your feedback...</p>
              </div>
            ) : myFeedback.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">You haven't submitted any feedback yet</p>
                <p className="text-sm text-gray-400">Your feedback helps us improve Thryve</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myFeedback.map((feedback) => (
                  <div 
                    key={feedback.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-${getFeedbackTypeColor(feedback.type)}-100 flex-shrink-0 mt-0.5`}>
                          {getFeedbackTypeIcon(feedback.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{feedback.title}</h3>
                            {getFeedbackStatusBadge(feedback.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{feedback.description}</p>
                          {feedback.rating && (
                            <div className="flex items-center mt-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${
                                    i < feedback.rating! 
                                      ? 'fill-yellow-500 text-yellow-500' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Submitted on {new Date(feedback.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* About Feedback */}
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <ThumbsUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Why Your Feedback Matters</h3>
              <p className="text-blue-800 text-sm mb-3">
                At Thryve, we're committed to creating the best health tracking experience possible. 
                Your feedback directly influences our development priorities and helps us improve the app for everyone.
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
                <li>Report bugs to help us fix issues quickly</li>
                <li>Suggest features you'd like to see</li>
                <li>Share what you love about Thryve</li>
                <li>Tell us how we can make your experience better</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}