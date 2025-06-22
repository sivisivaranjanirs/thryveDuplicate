import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHealthMetrics } from '../useHealthMetrics';

// Mock useAuth
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('useHealthMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch health metrics on mount', async () => {
    const mockMetrics = [
      {
        id: '1',
        user_id: 'test-user-id',
        metric_type: 'blood_pressure',
        value: '120/80',
        unit: 'mmHg',
        recorded_at: '2023-01-01T00:00:00Z'
      }
    ];

    mockSupabase.from().single.mockResolvedValue({
      data: mockMetrics,
      error: null
    });

    const { result } = renderHook(() => useHealthMetrics());

    expect(result.current.loading).toBe(true);
    
    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('health_metrics');
  });

  it('should add a new health metric', async () => {
    const newMetric = {
      metric_type: 'heart_rate',
      value: '72',
      unit: 'bpm',
      recorded_at: '2023-01-01T00:00:00Z'
    };

    const mockResponse = {
      id: 'new-metric-id',
      user_id: 'test-user-id',
      ...newMetric
    };

    mockSupabase.from().single.mockResolvedValue({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => useHealthMetrics());

    await act(async () => {
      const response = await result.current.addMetric(newMetric as any);
      expect(response.error).toBe(null);
      expect(response.data).toEqual(mockResponse);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('health_metrics');
  });

  it('should handle add metric error', async () => {
    const newMetric = {
      metric_type: 'heart_rate',
      value: '72',
      unit: 'bpm',
      recorded_at: '2023-01-01T00:00:00Z'
    };

    const mockError = { message: 'Database error' };
    mockSupabase.from().single.mockResolvedValue({
      data: null,
      error: mockError
    });

    const { result } = renderHook(() => useHealthMetrics());

    await act(async () => {
      const response = await result.current.addMetric(newMetric as any);
      expect(response.error).toBe('Database error');
    });
  });

  it('should delete a health metric', async () => {
    mockSupabase.from().single.mockResolvedValue({
      data: null,
      error: null
    });

    const { result } = renderHook(() => useHealthMetrics());

    await act(async () => {
      const response = await result.current.deleteMetric('metric-id');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('health_metrics');
  });

  it('should filter metrics by type', async () => {
    const { result } = renderHook(() => useHealthMetrics('blood_pressure'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSupabase.from().eq).toHaveBeenCalledWith('metric_type', 'blood_pressure');
  });
});