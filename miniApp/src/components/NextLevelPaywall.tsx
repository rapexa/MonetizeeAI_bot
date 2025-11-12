import React from 'react';
import ReactDOM from 'react-dom';

interface NextLevelPaywallProps {
  open: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const NextLevelPaywall: React.FC<NextLevelPaywallProps> = ({ open, onClose, onActivate }) => {
  if (!open) return null;

  const popup = (
    <div className="fixed inset-0 z-[2147483647] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-[92%] max-w-sm rounded-2xl border shadow-xl p-4"
        style={{ backgroundColor: '#11091C', borderColor: 'rgba(139,92,246,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">👑</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm mb-1">نیاز به اشتراک ویژه</h4>
            <p className="text-gray-300 text-xs leading-relaxed mb-3">
              برای دسترسی کامل به ادامه مراحل، اشتراک نسخه ویژه تهیه کنید
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg text-white text-xs font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-colors"
                onClick={onActivate}
              >
                تهیه نسخه ویژه
              </button>
              <button
                className="px-3 py-2 rounded-lg text-xs border border-gray-600 text-gray-300 hover:bg-gray-700/40"
                onClick={onClose}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(popup, document.body);
  }
  return popup;
};

export default NextLevelPaywall;
