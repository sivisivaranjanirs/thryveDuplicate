import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthTracking from '../HealthTracking';

// Mock useHealthMetrics hook
const mockAddMetric = vi.fn();
const mockDeleteMetric = vi.fn();
const mockMetrics = [
  {
    id: '1',
    user_id: 'test-user',
    metric_type: 'blood_pressure',
    value: '120/80',
    unit: 'mmHg',
    recorded_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z'
  }
];

vi.mock('../../hooks/useHealthMetrics', () => ({
  useHealthMetrics: () => ({
    metrics: mockMetrics,
    loading: false,
    addMetric: mockAddMetric,
    deleteMetric: mockDeleteMetric
  })
}));

describe('HealthTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders health tracking interface', () => {
    render(<HealthTracking />);
    
    expect(screen.getByText('Health Tracking')).toBeInTheDocument();
    expect(screen.getByText('Monitor and track your health metrics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add reading/i })).toBeInTheDocument();
  });

  it('displays metric tabs', () => {
    render(<HealthTracking />);
    
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
    expect(screen.getByText('Blood Glucose')).toBeInTheDocument();
    expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });

  it('shows latest reading when available', () => {
    render(<HealthTracking />);
    
    expect(screen.getByText('Latest Reading')).toBeInTheDocument();
    expect(screen.getByText('120/80 mmHg')).toBeInTheDocument();
  });

  it('opens add reading modal when button clicked', async () => {
    const user = userEvent.setup();
    render(<HealthTracking />);
    
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    
    expect(screen.getByText('Add Health Readings')).toBeInTheDocument();
    expect(screen.getByText('Enter values for any or all health metrics')).toBeInTheDocument();
  });

  it('allows adding multiple metrics at once', async () => {
    const user = userEvent.setup();
    mockAddMetric.mockResolvedValue({ data: { id: 'new-id' }, error: null });
    
    render(<HealthTracking />);
    
    // Open modal
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    
    // Fill in blood pressure
    const bpInput = screen.getByPlaceholderText(/120\/80 mmHg/i);
    await user.type(bpInput, '130/85');
    
    // Fill in heart rate
    const hrInput = screen.getByPlaceholderText(/72 bpm/i);
    await user.type(hrInput, '75');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save readings/i }));
    
    await waitFor(() => {
      expect(mockAddMetric).toHaveBeenCalledTimes(2);
    });
  });

  it('validates that at least one metric is entered', async () => {
    const user = userEvent.setup();
    render(<HealthTracking />);
    
    // Open modal
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    
    // Try to submit without entering any values
    await user.click(screen.getByRole('button', { name: /save readings/i }));
    
    // Should show validation message (mocked alert)
    expect(mockAddMetric).not.toHaveBeenCalled();
  });

  it('allows deleting a metric', async () => {
    const user = userEvent.setup();
    mockDeleteMetric.mockResolvedValue({ error: null });
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true);
    
    render(<HealthTracking />);
    
    const deleteButton = screen.getByTitle('Delete reading');
    await user.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this reading?');
    expect(mockDeleteMetric).toHaveBeenCalledWith('1');
  });

  it('switches between metric types', async () => {
    const user = userEvent.setup();
    render(<HealthTracking />);
    
    // Click on Heart Rate tab
    await user.click(screen.getByText('Heart Rate'));
    
    // Should show heart rate specific content
    expect(screen.getByText('Heart Rate')).toHaveClass('text-blue-600');
  });

  it('handles loading state', () => {
    vi.mocked(require('../../hooks/useHealthMetrics').useHealthMetrics).mockReturnValue({
      metrics: [],
      loading: true,
      addMetric: mockAddMetric,
      deleteMetric: mockDeleteMetric
    });
    
    render(<HealthTracking />);
    
    expect(screen.getByText('Loading health metrics...')).toBeInTheDocument();
  });
});