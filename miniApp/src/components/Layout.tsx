import React from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { telegramIdError, isSubscriptionExpired, loadingUser } = useApp();
  
  // Only check subscription expiry after data has been loaded
  // This prevents showing the overlay during initial load when data is not yet available
  const hasExpiredFromError = telegramIdError && telegramIdError.includes('اشتراک شما به پایان رسید');
  const hasExpiredFromData = !loadingUser && isSubscriptionExpired && isSubscriptionExpired();
  const isSubscriptionExpiredState = hasExpiredFromError || hasExpiredFromData;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Desktop Sidebar - Only visible on large screens (lg: 1024px+) */}
      <Sidebar />

      {/* Desktop Header - Only visible on large screens */}
      <Header />

      {/* Main content area - Responsive layout */}
      <div className="flex-1 flex flex-col lg:mr-[280px] lg:pt-16 transition-all duration-300">
        {/* Main content with blur effect if subscription expired */}
        <div 
          className={`flex-1 pb-20 lg:pb-8 transition-all duration-300 ${isSubscriptionExpiredState ? 'blur-sm pointer-events-none' : ''}`}
          style={isSubscriptionExpiredState ? { filter: 'blur(8px)', userSelect: 'none' as const } : {}}
        >
          {/* Desktop: Content with proper spacing, Mobile: Full width */}
          <div className="w-full h-full lg:bg-[#0a0118]">
            <div className="w-full h-full lg:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom nav - Only visible on mobile (hidden on lg and above) */}
      <div 
        className={`lg:hidden ${isSubscriptionExpiredState ? 'blur-sm pointer-events-none' : ''}`}
        style={isSubscriptionExpiredState ? { filter: 'blur(8px)', userSelect: 'none' as const } : {}}
      >
        <BottomNav />
      </div>

      {/* Subscription expired overlay - covers entire screen */}
      {isSubscriptionExpiredState && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div 
            className="bg-gradient-to-br from-[#0F0817] via-[#1a0f2e] to-[#0F0817] rounded-3xl border border-red-500/30 shadow-2xl max-w-md w-full p-6 text-center"
            style={{
              boxShadow: '0 20px 60px rgba(239, 68, 68, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center shadow-lg">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              اشتراک شما به پایان رسید!
            </h2>

            {/* Message */}
            <div className="text-gray-300 text-sm mb-6 leading-relaxed space-y-2">
              {hasExpiredFromError && telegramIdError ? (
                telegramIdError.split('\n\n').map((line, idx) => (
                  <p key={idx} className={idx === 0 ? 'font-bold text-white' : ''}>
                    {line}
                  </p>
                ))
              ) : (
                <>
                  <p className="font-bold text-white">
                    ⚠️ اشتراک شما به پایان رسید!
                  </p>
                  <p>
                    🔒 برای ادامه استفاده از امکانات، لطفا به ربات برگردید و اشتراک خریداری کنید یا لایسنس خود را وارد کنید.
                  </p>
                </>
              )}
            </div>

            {/* Action button */}
            {((hasExpiredFromError && telegramIdError?.includes('برای بازگشت به ربات')) || hasExpiredFromData) && (
              <button
                onClick={() => {
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                  } else {
                    alert('لطفا از طریق تلگرام وارد شوید');
                  }
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#5a189a] to-[#2c189a] text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
                style={{
                  boxShadow: '0 8px 24px rgba(90, 24, 154, 0.4)',
                }}
              >
                🔙 بازگشت به ربات و خرید اشتراک
              </button>
            )}

            {/* Additional info */}
            <p className="text-xs text-gray-400 mt-4">
              برای استفاده مجدد از امکانات Mini App، لطفا اشتراک خود را تمدید کنید
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;