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
          const photoUrl = (user as any).photo_url;
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
    <header className="hidden lg:flex fixed top-0 left-0 right-[280px] h-16 z-40 bg-white border-b border-gray-200">
      <div className="w-full h-full flex items-center justify-between px-6">
        {/* Left Section: Page Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>

        {/* Center Section: Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در پلتفرم..."
              className="w-full h-10 pr-11 pl-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="اعلان‌ها"
          >
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* Help */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="راهنما"
            onClick={() => navigate('/guide-tutorial')}
          >
            <HelpCircle size={20} className="text-gray-600" />
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200"></div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-2 pr-3 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">
                  {userData.username || userData.firstName || 'کاربر'}
                </span>
                <span className="text-xs text-gray-500">
                  {userData.subscriptionType === 'paid' ? 'اشتراک فعال' : 'نسخه رایگان'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center ring-2 ring-gray-100">
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
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                ></div>
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User size={16} />
                    <span>پروفایل من</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/subscription-management');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CreditCard size={16} />
                    <span>مدیریت اشتراک</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={16} />
                    <span>تنظیمات</span>
                  </button>
                  <div className="h-px bg-gray-200 my-2"></div>
                  <button
                    onClick={() => {
                      if (window.Telegram?.WebApp) {
                        window.Telegram.WebApp.close();
                      }
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
