import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

interface WebAuthGuardProps {
  children: React.ReactNode;
}

/**
 * WebAuthGuard: Checks web session before rendering children
 * Prevents showing MonetizeAI page before redirecting to login
 */
const WebAuthGuard: React.FC<WebAuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip check if already on web-login or admin pages
      if (location.pathname.startsWith('/web-login') || 
          location.pathname.startsWith('/admin-login') || 
          location.pathname.startsWith('/admin-panel')) {
        setIsChecking(false);
        setIsAuthorized(true);
        return;
      }

      // Check if we're in Telegram (has startapp parameter)
      const urlParams = new URLSearchParams(window.location.search);
      const startapp = urlParams.get('startapp');
      if (startapp) {
        // From Telegram - allow access
        setIsChecking(false);
        setIsAuthorized(true);
        return;
      }

      // Check if we have a web session token
      const webToken = localStorage.getItem('web_session_token');
      const webTelegramId = localStorage.getItem('web_telegram_id');

      if (!webToken || !webTelegramId) {
        // No session - redirect immediately
        setIsChecking(false);
        navigate('/web-login', { 
          replace: true,
          state: { from: location }
        });
        return;
      }

      // Verify session with backend
      try {
        const telegramId = parseInt(webTelegramId);
        if (isNaN(telegramId) || telegramId <= 0) {
          // Invalid telegram ID
          localStorage.removeItem('web_session_token');
          localStorage.removeItem('web_telegram_id');
          setIsChecking(false);
          navigate('/web-login', { 
            replace: true,
            state: { from: location }
          });
          return;
        }

        const response = await apiService.verifyWebSession(telegramId);
        
        if (response.success && response.data?.valid) {
          // Valid session - allow access
          setIsChecking(false);
          setIsAuthorized(true);
        } else {
          // Invalid session - clear and redirect
          localStorage.removeItem('web_session_token');
          localStorage.removeItem('web_telegram_id');
          setIsChecking(false);
          navigate('/web-login', { 
            replace: true,
            state: { from: location }
          });
        }
      } catch (error) {
        // Error verifying - clear and redirect
        console.error('Auth check error:', error);
        localStorage.removeItem('web_session_token');
        localStorage.removeItem('web_telegram_id');
        setIsChecking(false);
        navigate('/web-login', { 
          replace: true,
          state: { from: location }
        });
      }
    };

    checkAuth();
  }, [navigate, location]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0e0817' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-sm">در حال بررسی دسترسی...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default WebAuthGuard;

