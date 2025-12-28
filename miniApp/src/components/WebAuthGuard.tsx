import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

interface WebAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Check if we're in Telegram Mini App
 * Returns true if any Telegram indicator is present
 */
function isInTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check Telegram WebApp object
  const telegramWebApp = window.Telegram?.WebApp;
  if (telegramWebApp) {
    // Has initData (most reliable indicator)
    if (telegramWebApp.initData && telegramWebApp.initData.length > 0) {
      return true;
    }
    // Has user in initDataUnsafe
    if (telegramWebApp.initDataUnsafe?.user?.id) {
      return true;
    }
    // Has start_param (from Telegram link)
    if (telegramWebApp.initDataUnsafe?.start_param) {
      return true;
    }
  }
  
  // Check URL for startapp parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlHashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
  if (urlParams.get('startapp') || urlHashParams.get('startapp')) {
    return true;
  }
  
  // Check User-Agent
  const userAgent = navigator.userAgent;
  if (/Telegram|TelegramBot|tdesktop/i.test(userAgent)) {
    return true;
  }
  
  // Check referrer
  const referrer = document.referrer;
  if (referrer && (/t\.me|telegram\.org|telegram\.me/i.test(referrer))) {
    return true;
  }
  
  return false;
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

      // First check if we're in Telegram Mini App
      if (isInTelegramMiniApp()) {
        // We're in Telegram - get telegram_id from various sources
        const hasTelegramUser = typeof window !== 'undefined' && 
                               window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        const telegramStartParam = typeof window !== 'undefined' && 
                                   window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        // Check URL parameters (both query and hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashIndex = window.location.hash.indexOf('?');
        const urlHashParams = hashIndex >= 0 
          ? new URLSearchParams(window.location.hash.substring(hashIndex + 1))
          : new URLSearchParams();
        const startappFromQuery = urlParams.get('startapp');
        const startappFromHash = urlHashParams.get('startapp');
        const startapp = startappFromQuery || startappFromHash;
        
        // Get telegram_id with priority:
        // 1. start_param from Telegram WebApp (most reliable)
        // 2. startapp from URL
        // 3. user.id from Telegram WebApp
        let telegramId: number | null = null;
        
        // Priority 1: Use start_param from Telegram WebApp (most reliable)
        if (telegramStartParam) {
          const parsedId = parseInt(telegramStartParam);
          if (!isNaN(parsedId) && parsedId > 0) {
            telegramId = parsedId;
          }
        }
        
        // Priority 2: Use startapp from URL
        if (!telegramId && startapp) {
          const parsedId = parseInt(startapp);
          if (!isNaN(parsedId) && parsedId > 0) {
            telegramId = parsedId;
          }
        }
        
        // Priority 3: Use Telegram user ID from initData
        if (!telegramId && hasTelegramUser && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
          telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        
        // Store telegram_id for API calls
        if (telegramId) {
          localStorage.setItem('web_telegram_id', telegramId.toString());
          apiService.setWebTelegramId(telegramId);
        }
        
        // From Telegram - allow access without web session
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

