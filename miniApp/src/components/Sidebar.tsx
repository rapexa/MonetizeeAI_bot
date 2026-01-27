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
    <aside className="hidden lg:flex fixed right-0 top-0 h-full w-[280px] z-50 flex-col bg-white border-l border-gray-200">
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-center px-6 border-b border-gray-100">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-xl group-hover:shadow-violet-500/40 transition-all duration-300">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
              MonetizeAI
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              پلتفرم پولسازی هوشمند
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {/* Quick Action */}
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
          onClick={() => navigate('/ai-coach')}
        >
          <Plus size={16} />
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-violet-50 text-violet-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-600 to-purple-600 rounded-l-full"></div>
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-violet-600' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  <Icon size={20} strokeWidth={2} />
                </div>

                {/* Label */}
                <span className={`text-sm font-medium flex-1 text-right ${
                  isActive ? 'text-violet-700' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {tab.label}
                </span>

                {/* Badge */}
                {tab.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isActive 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 my-4"></div>

        {/* Bottom Navigation */}
        <div className="space-y-0.5">
          {bottomTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-violet-50 text-violet-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-violet-600' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <span className={`text-sm font-medium flex-1 text-right ${
                  isActive ? 'text-violet-700' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Stats Card */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-600" />
              <span className="text-xs font-bold text-violet-900">پیشرفت شما</span>
            </div>
            <span className="text-xs font-bold text-violet-600">65%</span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full" style={{ width: '65%' }}></div>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            شما 19 مرحله از 29 مرحله آموزشی را تکمیل کرده‌اید
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
