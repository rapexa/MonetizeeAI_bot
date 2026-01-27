import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, User, Brain, Wrench, ChevronLeft, Heart } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', icon: Home, label: 'داشبورد' },
    { path: '/levels', icon: Trophy, label: 'مراحل' },
    { path: '/profile', icon: User, label: 'پروفایل' },
    { path: '/ai-coach', icon: Brain, label: 'AI کوچ' },
    { path: '/tools', icon: Wrench, label: 'ابزارها' },
  ];

  return (
    <aside className="hidden lg:flex fixed right-0 top-0 h-full w-64 z-40 flex-col sidebar-enter">
      {/* Sidebar Container - Minimal Design */}
      <div className="h-full bg-[#0e0817] border-l border-white/5 flex flex-col relative overflow-hidden">
        {/* Minimal Brand Section at Top */}
        <div className="relative z-10 p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-all duration-300"
            >
              <ChevronLeft size={18} className="text-white/60" />
            </button>
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <span className="text-sm font-semibold bg-gradient-to-r from-[#7222f2] to-[#5a189a] bg-clip-text text-transparent">
                MonetizeAI
              </span>
              <div className="w-6 h-6 rounded bg-gradient-to-br from-[#7222f2] to-[#5a189a] flex items-center justify-center">
                <Heart size={12} className="text-white fill-white" />
              </div>
            </div>
            <div className="w-8"></div>
          </div>
        </div>

        {/* Navigation Items - Minimal Design */}
        <nav className="relative z-10 flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-white/5 text-white' 
                    : 'text-white/60 hover:text-white hover:bg-white/3'
                  }`}
              >
                {/* Active indicator - Vertical line on right */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-[#7222f2] to-[#5a189a] rounded-l"></div>
                )}

                {/* Icon - Minimal */}
                <Icon 
                  size={20} 
                  className={`transition-all duration-200 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Label */}
                <span className={`text-sm font-medium transition-all duration-200 flex-1 text-right
                  ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/80'}
                `}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

      </div>
    </aside>
  );
};

export default Sidebar;
