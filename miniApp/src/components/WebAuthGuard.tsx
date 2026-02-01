import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

interface WebAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Check if we're in Telegram Mini App
 * Returns true if any Telegram indicator is present
 * Priority: Check URL startapp parameter FIRST (most reliable for initial load)
 */
function isInTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // PRIORITY 1: Check URL for startapp parameter FIRST (works even before Telegram script loads)
  const urlParams = new URLSearchParams(window.location.search);
  const hashIndex = window.location.hash.indexOf('?');
  const urlHashParams = hashIndex >= 0 
    ? new URLSearchParams(window.location.hash.substring(hashIndex + 1))
    : new URLSearchParams();
  if (urlParams.get('startapp') || urlHashParams.get('startapp')) {
    return true;
  }
  
  // PRIORITY 2: Check Telegram WebApp object (may not be loaded yet)
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
  
  // PRIORITY 3: Check User-Agent
  const userAgent = navigator.userAgent;
  if (/Telegram|TelegramBot|tdesktop/i.test(userAgent)) {
    return true;
  }
  
  // PRIORITY 4: Check referrer
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
      const tryGetTelegramUserId = (): number | null => {
        if (typeof window === 'undefined') return null;
        // Priority 1: user.id from initDataUnsafe - the actual user opening the app (most reliable for Telegram)
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (userId) return userId;
        // Priority 2: start_param (when bot passes user ID via deep link)
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        if (startParam) {
          const parsed = parseInt(startParam);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        // Priority 3: startapp from URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashIndex = window.location.hash.indexOf('?');
        const urlHashParams = hashIndex >= 0 
          ? new URLSearchParams(window.location.hash.substring(hashIndex + 1))
          : new URLSearchParams();
        const startapp = urlParams.get('startapp') || urlHashParams.get('startapp');
        if (startapp) {
          const parsed = parseInt(startapp);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return null;
      };

      if (isInTelegramMiniApp()) {
        let telegramId = tryGetTelegramUserId();
        
        // If Telegram script might not be loaded yet, wait and retry once
        if (!telegramId && typeof window !== 'undefined' && !window.Telegram?.WebApp?.initDataUnsafe) {
          await new Promise((r) => setTimeout(r, 400));
          telegramId = tryGetTelegramUserId();
        }
        
        // Store telegram_id for API calls (if found)
        if (telegramId) {
          localStorage.setItem('web_telegram_id', telegramId.toString());
          apiService.setWebTelegramId(telegramId);
        }
        
        // From Telegram - seamless access, no login needed
        // Subscription type, profile, etc. come from API/backend as before
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

