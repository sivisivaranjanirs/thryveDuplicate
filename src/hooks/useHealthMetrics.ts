import { useState, useEffect } from 'react';
import { supabase, HealthMetric } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useHealthMetrics(metricType?: string) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMetrics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addMetric = async (metric: Omit<HealthMetric, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('health_metrics')
        .insert([{ ...metric, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setMetrics(prev => [data, ...prev]);
      
      // Friend notifications are handled automatically by database triggers
      
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      return { data: null, error };
    }
  };

  const updateMetric = async (id: string, updates: Partial<HealthMetric>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('health_metrics')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setMetrics(prev => prev.map(m => m.id === id ? data : m));
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      return { data: null, error };
    }
  };

  const deleteMetric = async (id: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('health_metrics')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setMetrics(prev => prev.filter(m => m.id !== id));
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      return { error };
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, metricType]);

  return {
    metrics,
    loading,
    error,
    addMetric,
    updateMetric,
    deleteMetric,
    refetch: fetchMetrics,
  };
}