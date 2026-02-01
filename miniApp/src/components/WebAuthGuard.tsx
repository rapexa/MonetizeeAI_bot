import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

interface WebAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Parse initData/tgWebAppData from URL hash to extract user id (works before Telegram script processes it)
 */
function parseUserIdFromHash(): number | null {
  if (typeof window === 'undefined' || !window.location.hash) return null;
  try {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const tgWebAppData = hashParams.get('tgWebAppData');
    if (tgWebAppData) {
      const initData = decodeURIComponent(tgWebAppData);
      const userMatch = initData.match(/user=([^&]+)/);
      if (userMatch) {
        const userData = JSON.parse(decodeURIComponent(userMatch[1]));
        if (userData?.id) return userData.id;
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/**
 * Check if we're in Telegram Mini App
 */
function isInTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // PRIORITY 1: tgWebAppData/tgWebAppVersion in hash (Telegram always injects this)
  if (window.location.hash && (window.location.hash.includes('tgWebAppData') || window.location.hash.includes('tgWebAppVersion'))) {
    return true;
  }
  
  // PRIORITY 2: tgWebAppStartParam (GET param Telegram adds when opening from link)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tgWebAppStartParam')) return true;
  
  // PRIORITY 3: startapp in URL (from t.me link)
  const hashIndex = window.location.hash.indexOf('?');
  const urlHashParams = hashIndex >= 0 
    ? new URLSearchParams(window.location.hash.substring(hashIndex + 1))
    : new URLSearchParams();
  if (urlParams.get('startapp') || urlHashParams.get('startapp')) return true;
  
  // PRIORITY 4: Telegram WebApp object
  const telegramWebApp = window.Telegram?.WebApp;
  if (telegramWebApp?.initData?.length || telegramWebApp?.initDataUnsafe?.user?.id || telegramWebApp?.initDataUnsafe?.start_param) {
    return true;
  }
  
  // PRIORITY 5: User-Agent
  if (/Telegram|TelegramBot|tdesktop/i.test(navigator.userAgent)) return true;
  
  // PRIORITY 6: Referrer
  const referrer = document.referrer;
  if (referrer && /t\.me|telegram\.org|telegram\.me/i.test(referrer)) return true;
  
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
        // Priority 1: user.id from initDataUnsafe (Telegram script populates this)
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (userId) return userId;
        // Priority 2: Parse from URL hash tgWebAppData (works immediately, before script)
        const fromHash = parseUserIdFromHash();
        if (fromHash) return fromHash;
        // Priority 3: start_param from initDataUnsafe
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        if (startParam) {
          const parsed = parseInt(startParam);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        // Priority 4: tgWebAppStartParam GET param (Telegram adds this)
        const tgStartParam = new URLSearchParams(window.location.search).get('tgWebAppStartParam');
        if (tgStartParam) {
          const parsed = parseInt(tgStartParam);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        // Priority 5: startapp from URL
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
        
        // Brief wait for Telegram script if we got nothing yet (script loads sync in head now, but just in case)
        if (!telegramId) {
          await new Promise((r) => setTimeout(r, 300));
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

