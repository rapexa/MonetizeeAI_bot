import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, User, Brain, Wrench } from 'lucide-react';

const BottomNav: React.FC = () => {
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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0e0817]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1 shadow-[0_-10px_40px_rgb(0,0,0,0.6)] transition-all duration-300 z-50">
      {/* Dark glass overlay to avoid white tint */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="flex justify-around items-center relative">
        {tabs.map((tab, index) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-3 px-4 rounded-2xl relative group transition-colors duration-200
                ${isActive ? 'text-[#7222f2]' : 'text-gray-300 hover:text-gray-200'}`}
            >
              {/* Active minimal underline */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  <Icon 
                    size={26} 
                    className="" 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {/* Minimal purple underline for active tab */}
                  {isActive && (
                    <div className="w-6 h-1 rounded-full bg-[#7222f2] mt-1" />
                  )}
                  {/* Badge (no animation) */}
                  {tab.badge && tab.badge > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-[#7222f2] to-pink-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/50 dark:ring-gray-900/50">
                      <span className="text-white text-xs font-bold">{tab.badge}</span>
                    </div>
                  )}
                </div>
                <span className={`text-sm mt-1.5 font-medium ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Bottom safe area */}
      <div className="h-safe-area-inset-bottom"></div>
    </nav>
  );
};

export default BottomNav;