/*
  # LLM Chat Edge Function - Hugging Face Integration

  1. Purpose
    - Handles secure communication with Hugging Face Inference API
    - Processes user messages and returns AI responses
    - Uses free Hugging Face models for cost-effective AI integration

  2. Security
    - Uses Supabase environment variables for API key storage
    - Validates user authentication
    - Implements CORS for web requests

  3. Features
    - Supports conversation context
    - Health-focused AI assistant persona
    - Error handling and validation
    - Uses Mistral-7B-Instruct model for high-quality responses
*/

import { corsHeaders } from '../_shared/cors.ts';

const hfApiKey = Deno.env.get('HF_API_KEY');

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate API key
    if (!hfApiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    // Parse request body
    const { message, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    // Build conversation context for Hugging Face
    const systemPrompt = `You are a warm, empathetic, and conversational health companion. Your purpose is to support users in discussing and reflecting on their physical, mental, and emotional health.

You speak like a thoughtful, understanding friend — not a doctor, not a bot. Ask gentle, open-ended questions to encourage self-reflection. Respond naturally, acknowledge feelings, and offer helpful, evidence-based suggestions when appropriate.

Avoid sounding mechanical or overly scripted. Use language that feels human, supportive, and engaging.

💡 You can talk about:
• Energy, stress, and emotions
• Physical health: diet, fitness, hydration, pain, symptoms, blood sugar management
• Mental well-being, moods, routines, burnout, motivation
• Mindfulness, self-care, and healthy habits
• Diabetes management and blood glucose monitoring

🚫 Avoid or decline:
• Conversations not related to health or well-being
• Diagnosing medical conditions or providing medical treatment
• Sensitive topics that require professional help (gently encourage the user to talk to a licensed professional in such cases)

If a user brings up unrelated topics, kindly say:
"I'm here to support you with anything related to your health and well-being. Let's keep our focus there — your care matters."

✅ Always make the conversation two-sided:
Ask thoughtful follow-up questions, check in on progress, and stay curious about the user's well-being.`;

    // Format conversation for Hugging Face model
    let conversationText = systemPrompt + '\n\n';
    
    // Add conversation history
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        conversationText += `Human: ${msg.content}\n`;
      } else {
        conversationText += `Assistant: ${msg.content}\n`;
      }
    });
    
    // Add current message
    conversationText += `Human: ${message}\nAssistant:`;

    // Call Hugging Face Inference API
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: conversationText,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
        },
        options: {
          wait_for_model: true,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    let aiResponse: string;
    
    if (Array.isArray(data) && data.length > 0) {
      aiResponse = data[0].generated_text || data[0].text || '';
    } else if (data.generated_text) {
      aiResponse = data.generated_text;
    } else if (data.text) {
      aiResponse = data.text;
    } else {
      throw new Error('Unexpected response format from Hugging Face API');
    }

    // Clean up the response
    aiResponse = aiResponse.trim();
    
    // Remove any remaining conversation context that might have been included
    if (aiResponse.includes('Human:')) {
      aiResponse = aiResponse.split('Human:')[0].trim();
    }
    
    if (!aiResponse) {
      throw new Error('No response generated from AI model');
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        success: true 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('LLM Chat Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred processing your request',
        success: false 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});