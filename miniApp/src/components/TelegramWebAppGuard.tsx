import React, { useEffect, useState } from 'react';
import { getConfiguredApiBaseURL } from '../services/baseUrl';

interface TelegramWebAppGuardProps {
  children: React.ReactNode;
}

const TelegramWebAppGuard: React.FC<TelegramWebAppGuardProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTelegramWebApp = () => {
      try {
        // Check if user has a valid web session (optional check for better UX)
        const webToken = localStorage.getItem('web_session_token');
        const webTelegramId = localStorage.getItem('web_telegram_id');
        if (webToken && webTelegramId) {
          const apiBase = getConfiguredApiBaseURL();
          // Try to verify session (non-blocking - don't wait for response)
          fetch(`${apiBase}/web/verify?telegram_id=${webTelegramId}`, {
            headers: {
              'Authorization': `Bearer ${webToken}`
            }
          })
          .then(response => response.json())
          .then(data => {
            if (!data.success || !data.data?.valid) {
              // Session invalid, clear it
              localStorage.removeItem('web_session_token');
              localStorage.removeItem('web_telegram_id');
            }
          })
          .catch(() => {
            // Error verifying - ignore, backend will handle
          });
        }

        // Always allow access - backend middleware will handle authentication
        // No need to check Telegram or block access here
        setIsLoading(false);

      } catch (error) {
        // On error, still allow access - backend will handle authentication
        console.error('❌ Error in TelegramWebAppGuard:', error);
        setIsLoading(false);
      }
    };

    // ⚡ PERFORMANCE: Reduced delay for faster initial load (50ms instead of 100ms)
    const timer = setTimeout(checkTelegramWebApp, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بررسی دسترسی...</p>
        </div>
      </div>
    );
  }

  // Always allow access - backend middleware will handle authentication
  // If user is not authenticated, backend will return appropriate error
  // Frontend can then redirect to /web-login if needed
  return <>{children}</>;
};

export default TelegramWebAppGuard;
