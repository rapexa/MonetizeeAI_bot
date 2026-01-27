import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, User, Brain, Wrench } from 'lucide-react';

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
    <aside className="hidden lg:flex fixed right-0 top-0 h-full w-72 z-40 flex-col sidebar-enter">
      {/* Sidebar Container */}
      <div className="h-full bg-gradient-to-b from-[#0e0817] via-[#10091c] to-[#0e0817] backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/5 via-transparent to-[#7222f2]/5 pointer-events-none"></div>
        
        {/* Animated pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Logo/Brand Section */}
        <div className="relative z-10 p-6 border-b border-white/10">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222f2] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <span className="text-2xl relative z-10">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-[#7222f2] transition-colors duration-300">MonetizeAI</h2>
              <p className="text-xs text-white/60">پلتفرم پولسازی با AI</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="relative z-10 flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {tabs.map((tab, index) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-l from-[#2c189a]/60 to-[#5a189a]/40 text-white shadow-xl shadow-[#5a189a]/30 border border-[#5a189a]/40 transform scale-[1.02]' 
                    : 'text-white/70 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/15 hover:scale-[1.01]'
                  }`}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                {/* Active indicator gradient background */}
                {isActive && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-l from-[#7222f2]/30 via-[#5a189a]/15 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                  </>
                )}

                {/* Hover effect overlay */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}

                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-br from-[#7222f2] to-[#5a189a] shadow-lg shadow-[#7222f2]/40 ring-2 ring-[#7222f2]/30' 
                    : 'bg-white/5 group-hover:bg-white/12 group-hover:shadow-md'
                  }`}>
                  <Icon 
                    size={22} 
                    className={`transition-all duration-300 ${isActive ? 'text-white drop-shadow-lg' : 'text-white/80 group-hover:text-white'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {/* Icon glow effect for active */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                  )}
                </div>

                {/* Label */}
                <span className={`relative z-10 text-base font-medium transition-all duration-300 flex-1 text-right
                  ${isActive ? 'text-white font-bold drop-shadow-sm' : 'text-white/80 group-hover:text-white'}
                `}>
                  {tab.label}
                </span>

                {/* Active indicator - Right side dot */}
                {isActive && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#7222f2] shadow-lg shadow-[#7222f2]/60 animate-pulse"></div>
                )}

                {/* Hover glow effect */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-l from-[#5a189a]/8 to-transparent"></div>
                )}

                {/* Ripple effect on click */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-100 transition-opacity duration-200 bg-white/10"></div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section - Status indicator */}
        <div className="relative z-10 p-4 border-t border-white/10">
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-2xl p-4 border border-white/10 shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
              <span className="text-xs text-white/90 font-medium">سیستم آنلاین</span>
            </div>
            <p className="text-xs text-white/50 text-center">نسخه دسکتاپ</p>
          </div>
        </div>
      </div>

      {/* Sidebar backdrop blur effect */}
      <div className="absolute inset-0 bg-gradient-to-l from-[#0e0817]/90 via-[#0e0817]/50 to-transparent pointer-events-none -z-10"></div>
    </aside>
  );
};

export default Sidebar;
