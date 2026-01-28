import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  User, 
  Bell,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle
} from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [telegramProfilePhoto, setTelegramProfilePhoto] = useState<string | null>(null);

  // Load profile photo
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
          const photoUrl = 'photo_url' in user ? (user as { photo_url?: string }).photo_url : undefined;
          if (photoUrl) {
            setTelegramProfilePhoto(photoUrl);
          }
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [userData]);

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'داشبورد';
    if (path === '/levels') return 'مراحل آموزشی';
    if (path === '/ai-coach') return 'دستیار هوشمند';
    if (path === '/tools') return 'ابزارهای کاری';
    if (path === '/profile') return 'پروفایل من';
    return 'MonetizeAI';
  };

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-[280px] h-16 z-40 bg-gradient-to-r from-[#0a0118] via-[#0f0522] to-[#0a0118] border-b border-violet-500/20 backdrop-blur-xl">
      <div className="w-full h-full flex items-center justify-between px-6">
        {/* Left Section: Page Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">
            {getPageTitle()}
          </h1>
        </div>

        {/* Center Section: Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400" />
            <input
              type="text"
              placeholder="جستجو در پلتفرم..."
              className="w-full h-10 pr-11 pl-4 bg-white/5 border border-violet-500/30 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            className="relative p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
            title="اعلان‌ها"
          >
            <Bell size={20} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0118] shadow-lg shadow-red-500/50 animate-pulse"></span>
          </button>

          {/* Help */}
          <button
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
            title="راهنما"
            onClick={() => navigate('/guide-tutorial')}
          >
            <HelpCircle size={20} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-violet-500/20"></div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-2 pr-3 hover:bg-white/10 rounded-xl transition-all duration-200 border border-transparent hover:border-violet-500/30"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-white">
                  {userData.username || userData.firstName || 'کاربر'}
                </span>
                <span className="text-xs text-violet-400">
                  {userData.subscriptionType === 'paid' ? '⭐ اشتراک فعال' : 'نسخه رایگان'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/30">
                {telegramProfilePhoto ? (
                  <img 
                    src={telegramProfilePhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setTelegramProfilePhoto(null)}
                  />
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>
              <ChevronDown size={16} className={`text-violet-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                ></div>
                <div className="absolute left-0 top-full mt-2 w-56 bg-gradient-to-b from-[#0f0522] to-[#0a0118] rounded-xl shadow-2xl border border-violet-500/30 py-2 z-50 backdrop-blur-xl">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-violet-600/20 hover:text-white transition-all duration-200"
                  >
                    <User size={16} />
                    <span>پروفایل من</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/subscription-management');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-violet-600/20 hover:text-white transition-all duration-200"
                  >
                    <CreditCard size={16} />
                    <span>مدیریت اشتراک</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-violet-600/20 hover:text-white transition-all duration-200"
                  >
                    <Settings size={16} />
                    <span>تنظیمات</span>
                  </button>
                  <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent my-2"></div>
                  <button
                    onClick={() => {
                      if (window.Telegram?.WebApp) {
                        window.Telegram.WebApp.close();
                      }
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
                  >
                    <LogOut size={16} />
                    <span>خروج از حساب</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
