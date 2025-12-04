import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';

interface TelegramWebAppGuardProps {
  children: React.ReactNode;
}

const TelegramWebAppGuard: React.FC<TelegramWebAppGuardProps> = ({ children }) => {
  const [isInTelegram, setIsInTelegram] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTelegramWebApp = () => {
      try {
        // WEB ACCESS RESTRICTION DISABLED - Allow all access
        console.log('✅ Web access restriction disabled - allowing all access');
        setIsInTelegram(true);
        setIsLoading(false);
        return;

        // Allow admin-login page without Telegram check
        const currentPath = window.location.pathname;
        if (currentPath === '/admin-login' || currentPath.startsWith('/admin-login')) {
          console.log('✅ Admin login page - allowing access without Telegram');
          setIsInTelegram(true);
          setIsLoading(false);
          return;
        }

        // Check if we're in development mode (localhost)
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('localhost');

        if (isDevelopment) {
          console.log('🔧 Development mode detected - allowing access');
          setIsInTelegram(true);
          setIsLoading(false);
          return;
        }

        // Check for Telegram WebApp environment
        const telegramWebApp = window.Telegram?.WebApp;
        
        // Method 1: Check if Telegram WebApp object exists
        if (telegramWebApp) {
          console.log('✅ Telegram WebApp object found');
          
          // Method 2: Check for initData or initDataUnsafe
          if (telegramWebApp.initData || 
              telegramWebApp.initDataUnsafe?.user?.id ||
              telegramWebApp.initDataUnsafe?.start_param) {
            console.log('✅ Telegram WebApp data found');
            setIsInTelegram(true);
            setIsLoading(false);
            return;
          }
        }

        // Method 3: Check User-Agent for Telegram indicators
        const userAgent = navigator.userAgent;
        const telegramPatterns = [
          'Telegram',
          'TelegramBot',
          'tdesktop',
          'Telegram Desktop',
          'Telegram Web'
        ];

        const hasTelegramUA = telegramPatterns.some(pattern => 
          userAgent.includes(pattern)
        );

        if (hasTelegramUA) {
          console.log('✅ Telegram detected in User-Agent');
          setIsInTelegram(true);
          setIsLoading(false);
          return;
        }

        // Method 4: Check if URL contains Telegram-specific parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasStartParam = urlParams.has('tgWebAppStartParam') || 
                             urlParams.has('start_param') ||
                             window.location.href.includes('t.me');

        if (hasStartParam) {
          console.log('✅ Telegram parameters found in URL');
          setIsInTelegram(true);
          setIsLoading(false);
          return;
        }

        // Method 5: Check referrer for Telegram domains
        const referrer = document.referrer;
        if (referrer && (referrer.includes('t.me') || 
                        referrer.includes('telegram.org') ||
                        referrer.includes('telegram.me'))) {
          console.log('✅ Telegram detected in referrer');
          setIsInTelegram(true);
          setIsLoading(false);
          return;
        }

        // If none of the checks pass, block access
        console.log('🚫 Not in Telegram WebApp environment');
        setIsInTelegram(false);
        setIsLoading(false);

      } catch (error) {
        console.error('❌ Error checking Telegram WebApp:', error);
        setIsInTelegram(false);
        setIsLoading(false);
      }
    };

    // Small delay to ensure Telegram WebApp is fully loaded
    const timer = setTimeout(checkTelegramWebApp, 100);
    
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

  // Access denied screen
  if (!isInTelegram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              دسترسی محدود شده
            </h1>
            <div className="flex items-center justify-center text-amber-600 mb-4">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">فقط از طریق تلگرام</span>
            </div>
          </div>
          
          <div className="space-y-4 text-right">
            <p className="text-gray-700 leading-relaxed">
              این سرویس فقط از طریق <strong>Mini App تلگرام</strong> قابل دسترسی است.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">نحوه دسترسی:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>۱. وارد ربات @MonetizeeAI_bot شوید</li>
                <li>۲. روی دکمه "🏠 داشبورد" کلیک کنید</li>
                <li>۳. از Mini App استفاده کنید</li>
              </ol>
            </div>
            
            <a 
              href="https://t.me/MonetizeeAI_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              ورود به ربات تلگرام
            </a>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              MonetizeeAI - محافظت شده توسط Telegram WebApp
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Allow access if in Telegram
  return <>{children}</>;
};

export default TelegramWebAppGuard;
