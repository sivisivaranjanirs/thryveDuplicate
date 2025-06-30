interface LoginAttempt {
  email: string;
  success: boolean;
  timestamp: number;
  userAgent: string;
  error?: string;
}

class LoginLogger {
  private attempts: LoginAttempt[] = [];
  private maxLogs = 1000;

  log(email: string, success: boolean, error?: string) {
    const attempt: LoginAttempt = {
      email: email.toLowerCase(),
      success,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      error
    };

    this.attempts.unshift(attempt);
    
    // Keep only the last maxLogs attempts
    if (this.attempts.length > this.maxLogs) {
      this.attempts = this.attempts.slice(0, this.maxLogs);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('login_attempts', JSON.stringify(this.attempts.slice(0, 100)));
    } catch (e) {
      console.warn('Could not save login attempts to localStorage');
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('Login attempt:', attempt);
    }

    // In production, you might want to send this to your analytics service
    if (import.meta.env.PROD && !success) {
      this.reportFailedLogin(attempt);
    }
  }

  private reportFailedLogin(attempt: LoginAttempt) {
    // Send to your monitoring service
    // Example: Sentry, LogRocket, or custom analytics
    console.warn('Failed login attempt:', {
      email: attempt.email,
      timestamp: new Date(attempt.timestamp).toISOString(),
      error: attempt.error
    });
  }

  getRecentAttempts(limit = 10): LoginAttempt[] {
    return this.attempts.slice(0, limit);
  }

  getFailedAttempts(email: string, timeWindow = 24 * 60 * 60 * 1000): LoginAttempt[] {
    const cutoff = Date.now() - timeWindow;
    return this.attempts.filter(
      attempt => 
        attempt.email === email.toLowerCase() && 
        !attempt.success && 
        attempt.timestamp > cutoff
    );
  }
}

export const loginLogger = new LoginLogger();