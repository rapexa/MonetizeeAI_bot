import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, User, Brain, Wrench, Sparkles, Plus } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const mainTabs = [
    { path: '/', icon: Home, label: 'داشبورد', badge: null },
    { path: '/levels', icon: Trophy, label: 'مراحل آموزشی', badge: '29' },
    { path: '/ai-coach', icon: Brain, label: 'دستیار هوشمند', badge: 'AI' },
    { path: '/tools', icon: Wrench, label: 'ابزارهای کاری', badge: null },
  ];

  const bottomTabs = [
    { path: '/profile', icon: User, label: 'پروفایل من', badge: null },
  ];

  return (
    <aside className="hidden lg:flex fixed right-0 top-0 h-full w-[280px] z-50 flex-col bg-gradient-to-b from-[#0e0817] via-[#0a0118] to-[#0e0817] border-l border-[#5a189a]/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-center px-6 border-b border-[#5a189a]/20">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] flex items-center justify-center shadow-lg shadow-[#5a189a]/50 group-hover:shadow-xl group-hover:shadow-[#5a189a]/70 group-hover:scale-105 transition-all duration-300">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white group-hover:text-[#7222F2] transition-colors">
              MonetizeAI
            </span>
            <span className="text-[10px] text-[#7222F2]/80 font-medium">
              پلتفرم پولسازی هوشمند
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent">
        {/* Quick Action */}
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl bg-gradient-to-r from-[#2c189a] via-[#5a189a] to-[#7222F2] text-white font-bold text-sm hover:from-[#2c189a]/90 hover:via-[#5a189a]/90 hover:to-[#7222F2]/90 transition-all duration-300 shadow-lg shadow-[#5a189a]/40 hover:shadow-xl hover:shadow-[#5a189a]/60 hover:scale-105"
          onClick={() => navigate('/ai-coach')}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>شروع گفتگوی جدید</span>
        </button>

        {/* Main Navigation */}
        <div className="space-y-0.5">
          {mainTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#5a189a]/20 to-[#7222F2]/20 border border-[#5a189a]/30' 
                    : 'border border-transparent hover:bg-white/5 hover:border-[#5a189a]/10'
                }`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#5a189a] via-[#7222F2] to-[#7222F2] rounded-l-full shadow-lg shadow-[#5a189a]/50"></div>
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-[#7222F2]' : 'text-gray-400 group-hover:text-[#7222F2]/80'
                }`}>
                  <Icon size={20} strokeWidth={2} />
                </div>

                {/* Label */}
                <span className={`text-sm font-semibold flex-1 text-right ${
                  isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                }`}>
                  {tab.label}
                </span>

                {/* Badge */}
                {tab.badge && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#5a189a] to-[#7222F2] text-white shadow-lg shadow-[#5a189a]/30' 
                      : 'bg-white/10 text-[#7222F2]/80'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#5a189a]/30 to-transparent my-4"></div>

        {/* Bottom Navigation */}
        <div className="space-y-0.5">
          {bottomTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#5a189a]/20 to-[#7222F2]/20 border border-[#5a189a]/30' 
                    : 'border border-transparent hover:bg-white/5 hover:border-[#5a189a]/10'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-[#7222F2]' : 'text-gray-400 group-hover:text-[#7222F2]/80'
                }`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <span className={`text-sm font-semibold flex-1 text-right ${
                  isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
