import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Feedback from '../Feedback';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    userProfile: { full_name: 'Test User', email: 'test@example.com' }
  })
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful feedback fetch
    mockSupabase.from().single.mockResolvedValue({
      data: [],
      error: null
    });
  });

  it('renders feedback form', () => {
    render(<Feedback />);
    
    expect(screen.getByText('Help Us Improve Thryve')).toBeInTheDocument();
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Feedback Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('shows rating input for praise feedback type', async () => {
    const user = userEvent.setup();
    render(<Feedback />);
    
    // Change feedback type to praise
    await user.selectOptions(screen.getByLabelText('Feedback Type'), 'praise');
    
    expect(screen.getByText('How would you rate Thryve?')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '' })).toHaveLength(5); // 5 star buttons
  });

  it('submits feedback successfully', async () => {
    const user = userEvent.setup();
    
    // Mock successful feedback submission
    mockSupabase.from().single.mockResolvedValueOnce({
      data: {
        id: 'new-feedback-id',
        user_id: 'test-user-id',
        type: 'suggestion',
        title: 'Test Suggestion',
        description: 'This is a test suggestion',
        status: 'pending',
        created_at: new Date().toISOString()
      },
      error: null
    });
    
    render(<Feedback />);
    
    // Fill out form
    await user.type(screen.getByLabelText('Title'), 'Test Suggestion');
    await user.type(screen.getByLabelText('Description'), 'This is a test suggestion');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback! We appreciate your input.')).toBeInTheDocument();
    });
    
    // Verify Supabase was called correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('user_feedback');
    expect(mockSupabase.from().insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'test-user-id',
        user_name: 'Test User',
        user_email: 'test@example.com',
        type: 'suggestion',
        title: 'Test Suggestion',
        description: 'This is a test suggestion'
      })
    ]);
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();
    render(<Feedback />);
    
    // Try to submit without title
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    expect(screen.getByText('Please provide a title for your feedback')).toBeInTheDocument();
    
    // Add title but no description
    await user.type(screen.getByLabelText('Title'), 'Test Title');
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    expect(screen.getByText('Please provide a description for your feedback')).toBeInTheDocument();
  });

  it('requires rating for praise feedback', async () => {
    const user = userEvent.setup();
    render(<Feedback />);
    
    // Change to praise type
    await user.selectOptions(screen.getByLabelText('Feedback Type'), 'praise');
    
    // Add title and description but no rating
    await user.type(screen.getByLabelText('Title'), 'Great App');
    await user.type(screen.getByLabelText('Description'), 'I love this app!');
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    expect(screen.getByText('Please provide a rating for your praise')).toBeInTheDocument();
  });

  it('displays previous feedback', async () => {
    // Mock feedback data
    const mockFeedback = [
      {
        id: 'feedback-1',
        user_id: 'test-user-id',
        user_name: 'Test User',
        user_email: 'test@example.com',
        type: 'suggestion',
        title: 'Previous Suggestion',
        description: 'This is a previous suggestion',
        rating: null,
        status: 'pending',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ];
    
    mockSupabase.from().single.mockResolvedValueOnce({
      data: mockFeedback,
      error: null
    });
    
    render(<Feedback />);
    
    await waitFor(() => {
      expect(screen.getByText('Previous Suggestion')).toBeInTheDocument();
      expect(screen.getByText('This is a previous suggestion')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('handles feedback submission error', async () => {
    const user = userEvent.setup();
    
    // Mock error response
    mockSupabase.from().single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' }
    });
    
    render(<Feedback />);
    
    // Fill out form
    await user.type(screen.getByLabelText('Title'), 'Test Suggestion');
    await user.type(screen.getByLabelText('Description'), 'This is a test suggestion');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument();
    });
  });

  it('shows loading state for previous feedback', () => {
    // Mock loading state
    mockSupabase.from().single.mockImplementation(() => {
      // Don't resolve the promise to keep loading state
      return new Promise(() => {});
    });
    
    render(<Feedback />);
    
    expect(screen.getByText('Loading your feedback...')).toBeInTheDocument();
  });
});