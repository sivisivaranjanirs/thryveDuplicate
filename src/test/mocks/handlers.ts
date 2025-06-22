import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Supabase API endpoints
  http.get('https://test.supabase.co/rest/v1/*', () => {
    return HttpResponse.json([]);
  }),

  http.post('https://test.supabase.co/rest/v1/*', () => {
    return HttpResponse.json({ id: 'test-id' });
  }),

  http.patch('https://test.supabase.co/rest/v1/*', () => {
    return HttpResponse.json({ id: 'test-id' });
  }),

  http.delete('https://test.supabase.co/rest/v1/*', () => {
    return HttpResponse.json({});
  }),

  // Mock Edge Functions
  http.post('https://test.supabase.co/functions/v1/llm-chat', () => {
    return HttpResponse.json({
      success: true,
      response: 'This is a test AI response'
    });
  }),

  http.post('https://test.supabase.co/functions/v1/send-push-notification', () => {
    return HttpResponse.json({
      success: true,
      sent: true
    });
  }),

  http.post('https://test.supabase.co/functions/v1/process-notification-queue', () => {
    return HttpResponse.json({
      success: true,
      processed: 0
    });
  })
];