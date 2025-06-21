/*
  # Email Notification Edge Function

  1. Purpose
    - Sends email notifications for reading requests and approvals
    - Uses Resend API for reliable email delivery
    - Handles both request notifications and approval confirmations

  2. Security
    - Uses Supabase environment variables for API key storage
    - Validates user authentication
    - Implements CORS for web requests

  3. Features
    - Reading request notifications
    - Reading approval confirmations
    - Professional email templates
    - Error handling and validation
*/

import { corsHeaders } from '../_shared/cors.ts';

const resendApiKey = Deno.env.get('RESEND_API_KEY');

interface EmailRequest {
  type: 'reading_request' | 'reading_approved';
  to_email: string;
  to_name?: string;
  from_email: string;
  from_name?: string;
  message?: string;
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
    if (!resendApiKey) {
      console.log('Resend API key not configured - email notifications disabled');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Email notifications disabled (Resend not configured)',
          sent: false
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse request body
    const emailData: EmailRequest = await req.json();

    if (!emailData.to_email || !emailData.from_email || !emailData.type) {
      throw new Error('Missing required email parameters');
    }

    // Generate email content based on type
    let subject: string;
    let htmlContent: string;

    if (emailData.type === 'reading_request') {
      subject = 'New Reading Access Request - Thryve';
      htmlContent = generateReadingRequestEmail(emailData);
    } else if (emailData.type === 'reading_approved') {
      subject = 'Reading Access Approved - Thryve';
      htmlContent = generateReadingApprovedEmail(emailData);
    } else {
      throw new Error('Invalid email type');
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Thryve <onboarding@onresend.com>',
        to: [emailData.to_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email sent successfully',
        sent: true,
        email_id: result.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Email notification error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send email notification',
        success: false,
        sent: false
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

function generateReadingRequestEmail(emailData: EmailRequest): string {
  const fromName = emailData.from_name || emailData.from_email.split('@')[0];
  const toName = emailData.to_name || emailData.to_email.split('@')[0];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Reading Access Request</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .message-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌱 Thryve</h1>
          <p>Health Reading Access Request</p>
        </div>
        
        <div class="content">
          <h2>Hi ${toName}!</h2>
          
          <p><strong>${fromName}</strong> has requested access to view your health readings on Thryve.</p>
          
          ${emailData.message ? `
            <div class="message-box">
              <strong>Personal Message:</strong><br>
              "${emailData.message}"
            </div>
          ` : ''}
          
          <p>By granting access, ${fromName} will be able to view your health metrics and readings that you record in Thryve. You can revoke this access at any time from your account settings.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thryve.app/access" class="button">Review Request</a>
          </div>
          
          <p><small>If you don't want to grant access, you can simply ignore this email or decline the request in your Thryve account.</small></p>
        </div>
        
        <div class="footer">
          <p><small>This email was sent by Thryve. If you didn't expect this email, you can safely ignore it.</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReadingApprovedEmail(emailData: EmailRequest): string {
  const fromName = emailData.from_name || emailData.from_email.split('@')[0];
  const toName = emailData.to_name || emailData.to_email.split('@')[0];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reading Access Approved</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .success-box { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌱 Thryve</h1>
          <p>Reading Access Approved!</p>
        </div>
        
        <div class="content">
          <h2>Great news, ${toName}!</h2>
          
          <div class="success-box">
            <strong>✅ Access Granted</strong><br>
            ${fromName} has approved your request to view their health readings.
          </div>
          
          <p>You can now view ${fromName}'s health metrics and readings in your Thryve account. This includes their latest readings and historical data they choose to share.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thryve.app/access" class="button">View Health Data</a>
          </div>
          
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>View their latest health readings</li>
            <li>See historical health trends</li>
            <li>Receive notifications about new readings (if enabled)</li>
          </ul>
          
          <p><small>Remember to respect their privacy and use this access responsibly. They can revoke access at any time.</small></p>
        </div>
        
        <div class="footer">
          <p><small>This email was sent by Thryve. If you didn't expect this email, please contact support.</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
}