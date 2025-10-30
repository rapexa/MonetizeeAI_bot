import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onActivate }) => {
  if (!isOpen) return null;

  // Prevent background scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modal = (
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      {/* Card */}
      <div
        className="w-[92%] max-w-md rounded-2xl overflow-hidden border border-gray-700/60 shadow-2xl transform transition-all duration-200"
        style={{ background: 'linear-gradient(135deg, #0f0a19 0%, #130b22 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-700/50 bg-gray-800/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2c189a] to-[#5a189a] text-white flex items-center justify-center">🔒</div>
            <h3 className="text-base font-semibold text-white">دسترسی ویژه لازم است</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-700/50 hover:bg-gray-600/60 text-gray-200 flex items-center justify-center">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm leading-7 text-gray-200 whitespace-pre-line">
{`🔒 ادامه‌ی این مسیر فقط برای کاربران ویژه بازه

📌 با اشتراک ویژه، تمام مراحل ساخت بیزینس آنلاینت باز میشه`}
          </p>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-700/50">
          <button
            onClick={onActivate}
            className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-colors"
          >
            🔓 فعـال‌سازی اشتراک ویـژه
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to body to avoid stacking context issues
  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(modal, document.body);
  }
  return modal;
};

export default SubscriptionModal;


