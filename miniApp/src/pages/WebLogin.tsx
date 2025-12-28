import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import apiService from '../services/api';

const WebLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem('web_session_token');
      const telegramId = localStorage.getItem('web_telegram_id');
      
      if (token && telegramId) {
        // Verify token is still valid by checking with API
        apiService.verifyWebSession(Number(telegramId))
          .then(response => {
            if (response.success) {
              setIsLoggedIn(true);
              // Redirect to dashboard or intended page
              const from = (location.state as any)?.from?.pathname || '/';
              navigate(from, { replace: true });
            } else {
              // Token invalid, clear it
              localStorage.removeItem('web_session_token');
              localStorage.removeItem('web_telegram_id');
            }
          })
          .catch(() => {
            // Error verifying, clear token
            localStorage.removeItem('web_session_token');
            localStorage.removeItem('web_telegram_id');
          });
      }
    };

    checkLogin();
  }, [navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate telegram_id is numeric
    const telegramIdNum = parseInt(telegramId);
    if (isNaN(telegramIdNum) || telegramIdNum <= 0) {
      setError('لطفاً یک ID عددی معتبر وارد کنید');
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.webLogin(telegramIdNum, password);
      
      if (response.success && response.data?.token) {
        // Save token and telegram_id to localStorage
        localStorage.setItem('web_session_token', response.data.token);
        localStorage.setItem('web_telegram_id', telegramId);
        
        // Update API service to use this telegram_id
        apiService.setWebTelegramId(telegramIdNum);
        
        // Redirect to dashboard or intended page
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        if (response.error?.includes('not registered')) {
          setError('این کاربر در ربات ثبت‌نام نکرده است. لطفاً ابتدا وارد ربات شوید و ثبت‌نام کنید.');
        } else if (response.error?.includes('password')) {
          setError('رمز عبور اشتباه است');
        } else {
          setError(response.error || 'خطا در ورود. لطفاً دوباره تلاش کنید.');
        }
      }
    } catch (err) {
      setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show success message briefly
  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0e0817' }}>
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-white text-lg">در حال انتقال...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0e0817' }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ورود به MonetizeAI</h1>
          <p className="text-gray-400">MonetizeAI Web Access</p>
        </div>

        {/* Login Form */}
        <div className="backdrop-blur-xl rounded-3xl p-8 border border-gray-700/60 shadow-2xl" style={{ backgroundColor: '#10091c' }}>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm block">{error}</span>
                  {error.includes('ثبت‌نام نکرده') && (
                    <a
                      href="https://t.me/MonetizeeAI_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      <ExternalLink size={16} />
                      ورود به ربات تلگرام
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Telegram ID Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ID کاربری (عدد تلگرام)
              </label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={telegramId}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setTelegramId(value);
                  }}
                  placeholder="ID عددی خود را وارد کنید"
                  required
                  className="w-full pr-12 pl-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 transition-all"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ID شما همان عدد تلگرام شماست (مثلاً: 12345678)
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                رمز عبور
              </label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور را وارد کنید"
                  required
                  className="w-full pr-12 pl-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 transition-all"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                رمز عبور شما همان ID عددی شماست
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !telegramId || !password}
              className="w-full py-3 bg-gradient-to-r from-[#2c189a] via-[#5a189a] to-[#7222F2] text-white font-semibold rounded-xl hover:from-[#3c28aa] hover:via-[#6a28aa] hover:to-[#8232ff] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  در حال ورود...
                </span>
              ) : (
                'ورود به MonetizeAI'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-700/40">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">نکات مهم:</h3>
              <ul className="text-xs text-gray-400 space-y-1 text-right">
                <li>• برای استفاده از وب، ابتدا باید در ربات ثبت‌نام کرده باشید</li>
                <li>• رمز عبور شما همان ID عددی شماست</li>
                <li>• اگر ثبت‌نام نکرده‌اید، ابتدا وارد ربات شوید</li>
              </ul>
            </div>
            
            <div className="mt-4 text-center">
              <a
                href="https://t.me/MonetizeeAI_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={16} />
                ورود به ربات تلگرام
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebLogin;

