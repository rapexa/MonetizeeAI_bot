import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle } from 'lucide-react';
import adminApiService from '../services/adminApi';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminApiService.login(username, password);
      
      if (response.success && response.data?.token) {
        // Save token to localStorage
        localStorage.setItem('admin_session_token', response.data.token);
        
        // Redirect to admin panel
        navigate('/admin-panel', { replace: true });
      } else {
        setError(response.error || 'نام کاربری یا رمز عبور اشتباه است');
      }
    } catch (err) {
      setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0e0817' }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">پنل مدیریت</h1>
          <p className="text-gray-400">MonetizeAI Admin Panel</p>
        </div>

        {/* Login Form */}
        <div className="backdrop-blur-xl rounded-3xl p-8 border border-gray-700/60 shadow-2xl" style={{ backgroundColor: '#10091c' }}>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                نام کاربری
              </label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری را وارد کنید"
                  required
                  className="w-full pr-12 pl-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 transition-all"
                  dir="ltr"
                />
              </div>
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#2c189a] via-[#5a189a] to-[#7222F2] text-white font-semibold rounded-xl hover:from-[#3c28aa] hover:via-[#6a28aa] hover:to-[#8232ff] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  در حال ورود...
                </span>
              ) : (
                'ورود به پنل مدیریت'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-700/40">
            <p className="text-xs text-gray-500 text-center">
              ⚠️ این پنل فقط برای مدیران سیستم است
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

