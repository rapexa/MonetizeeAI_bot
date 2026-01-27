import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, User, Brain, Wrench, Sparkles, TrendingUp, Plus } from 'lucide-react';

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
    <aside className="hidden lg:flex fixed right-0 top-0 h-full w-[280px] z-50 flex-col bg-gradient-to-b from-[#0a0118] via-[#0f0522] to-[#0a0118] border-l border-violet-500/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-center px-6 border-b border-violet-500/20">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/50 group-hover:shadow-xl group-hover:shadow-violet-500/70 group-hover:scale-105 transition-all duration-300">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white group-hover:text-violet-400 transition-colors">
              MonetizeAI
            </span>
            <span className="text-[10px] text-violet-300 font-medium">
              پلتفرم پولسازی هوشمند
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent">
        {/* Quick Action */}
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 hover:scale-105"
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
                    ? 'bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30' 
                    : 'border border-transparent hover:bg-white/5 hover:border-violet-500/10'
                }`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-400 via-purple-500 to-indigo-600 rounded-l-full shadow-lg shadow-violet-500/50"></div>
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-300'
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
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30' 
                      : 'bg-white/10 text-violet-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent my-4"></div>

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
                    ? 'bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30' 
                    : 'border border-transparent hover:bg-white/5 hover:border-violet-500/10'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-300'
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

      {/* Stats Card */}
      <div className="p-4 border-t border-violet-500/20">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/20 via-purple-600/15 to-indigo-600/20 rounded-2xl p-4 border border-violet-500/30 backdrop-blur-xl">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-500/20 rounded-lg">
                  <TrendingUp size={14} className="text-violet-400" />
                </div>
                <span className="text-xs font-bold text-white">پیشرفت شما</span>
              </div>
              <span className="text-xs font-bold text-violet-400 bg-violet-500/20 px-2 py-1 rounded-lg">65%</span>
            </div>
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-3 border border-violet-500/20">
              <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-full shadow-lg shadow-violet-500/50" style={{ width: '65%' }}></div>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              شما 19 مرحله از 29 مرحله آموزشی را تکمیل کرده‌اید 🎯
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
