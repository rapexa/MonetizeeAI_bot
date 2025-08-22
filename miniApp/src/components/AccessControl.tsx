import React from 'react';
import { useApp } from '../context/AppContext';
import { Lock, AlertTriangle, ArrowRight } from 'lucide-react';

interface AccessControlProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AccessControl: React.FC<AccessControlProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLicensed, loadingUser } = useApp();

  // Show loading while checking authentication
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">در حال بررسی دسترسی...</p>
        </div>
      </div>
    );
  }

  // Check if user has access
  if (!isAuthenticated || !isLicensed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">دسترسی محدود</h1>
          
          <div className="space-y-4 text-gray-300 mb-8">
            {!isAuthenticated && (
              <div className="flex items-center gap-3 bg-red-500/20 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm">شما در ربات تلگرام ثبت نام نکرده‌اید</p>
              </div>
            )}
            
            {!isLicensed && (
              <div className="flex items-center gap-3 bg-yellow-500/20 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <p className="text-sm">لایسنس شما تایید نشده است</p>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400 mb-3">برای دسترسی به مینی اپ:</p>
            <ol className="text-sm text-gray-300 space-y-2 text-right">
              <li className="flex items-center gap-2 justify-end">
                <span>1. ابتدا در ربات تلگرام ثبت نام کنید</span>
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </li>
              <li className="flex items-center gap-2 justify-end">
                <span>2. لایسنس خود را تایید کنید</span>
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </li>
              <li className="flex items-center gap-2 justify-end">
                <span>3. سپس از طریق ربات وارد مینی اپ شوید</span>
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="https://t.me/MonetizeeAI_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>ورود به ربات تلگرام</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 py-3 px-6 rounded-xl font-medium transition-all duration-300"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User has access, show children
  return <>{children}</>;
};

export default AccessControl;
