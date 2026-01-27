import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  User, 
  Settings, 
  MessageCircle, 
  ChevronLeft, 
  Mic, 
  MicOff,
  Heart
} from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useApp();
  const [language, setLanguage] = useState<'FA' | 'EN'>('FA');
  const [audioControl, setAudioControl] = useState(false);
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

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-72 h-16 z-50 bg-[#1a1a1a] border-b border-white/10 backdrop-blur-xl">
      <div className="w-full h-full flex items-center justify-between px-6">
        {/* Left Section: User Avatar & Language Toggle */}
        <div className="flex items-center gap-4">
          {/* User Avatar */}
          <div 
            className="w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#7222f2]/50 transition-all duration-300"
            onClick={() => navigate('/profile')}
          >
            {telegramProfilePhoto ? (
              <img 
                src={telegramProfilePhoto} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={() => setTelegramProfilePhoto(null)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2c189a] to-[#7222f2] flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                language === 'EN' 
                  ? 'bg-gradient-to-r from-[#7222f2] to-[#5a189a] text-white shadow-lg' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('FA')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                language === 'FA' 
                  ? 'bg-gradient-to-r from-[#7222f2] to-[#5a189a] text-white shadow-lg' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              FA
            </button>
          </div>
        </div>

        {/* Center Section: Audio Control Status */}
        <div className="flex items-center gap-3">
          {/* Audio Control Icon */}
          <button
            onClick={() => setAudioControl(!audioControl)}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110"
            title={audioControl ? 'فعال کردن کنترل صوتی' : 'غیرفعال کردن کنترل صوتی'}
          >
            {audioControl ? (
              <Mic size={18} className="text-white/80" />
            ) : (
              <MicOff size={18} className="text-white/50" />
            )}
          </button>

          {/* Audio Control Status Text */}
          <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10">
            <p className="text-xs text-white/70">
              {audioControl ? 'کنترل صوتی فعال است' : 'کنترل صوتی خاموش است'}
            </p>
          </div>

          {/* Settings Icon */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110"
            title="تنظیمات"
          >
            <Settings size={18} className="text-white/80" />
          </button>
        </div>

        {/* Right Section: Navigation & Brand */}
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110"
            title="بازگشت"
          >
            <ChevronLeft size={20} className="text-white/80" />
          </button>

          {/* Chat Button */}
          <button
            onClick={() => navigate('/ai-coach')}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110 relative"
            title="چت"
          >
            <MessageCircle size={18} className="text-white/80" />
            {/* Optional: Notification badge */}
          </button>

          {/* Brand Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <span className="text-lg font-bold bg-gradient-to-r from-[#7222f2] to-[#5a189a] bg-clip-text text-transparent group-hover:from-[#5a189a] group-hover:to-[#7222f2] transition-all duration-300">
              MonetizeAI
            </span>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7222f2] to-[#5a189a] flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
              <Heart size={16} className="text-white fill-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
