import { useState, useEffect } from 'react';
import { supabase, UserFeedback } from '../lib/supabase';
import { useAuth } from './useAuth';

export type FeedbackType = 'suggestion' | 'bug' | 'praise' | 'other';
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
  rating: FeedbackRating | null;
}

export function useFeedback() {
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();

  const fetchFeedback = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (feedbackData: FeedbackFormData) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: user.id,
          user_name: userProfile?.full_name || user.email?.split('@')[0] || 'Anonymous',
          user_email: userProfile?.email || user.email || '',
          type: feedbackData.type,
          title: feedbackData.title.trim(),
          description: feedbackData.description.trim(),
          rating: feedbackData.rating,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setFeedback(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      return { data: null, error };
    }
  };

  const refreshFeedback = async () => {
    await fetchFeedback();
  };

  useEffect(() => {
    fetchFeedback();
  }, [user]);

  return {
    feedback,
    loading,
    error,
    submitFeedback,
    refreshFeedback
  };
}