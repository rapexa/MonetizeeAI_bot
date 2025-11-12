import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';

interface AIToolSubscriptionCardProps {
  show: boolean;
  onClose: () => void;
}

const AIToolSubscriptionCard: React.FC<AIToolSubscriptionCardProps> = ({ show, onClose }) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[92%] max-w-md p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Crown className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-red-400 font-bold text-sm">محدودیت اشتراک</h4>
              <button
                onClick={onClose}
                className="text-red-400/70 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-red-300 text-xs leading-relaxed mb-3">
              🔒 برای دیدن همه اطلاعات این ابزار باید اشتراک ویژه فعال باشه
              <br />
              🧠 الان فقط بخشی از دیتای این ابزار رو داری می‌بینی...
            </p>
            <button
              onClick={() => {
                onClose();
                navigate('/subscription-management');
              }}
              className="w-full py-2 rounded-lg text-white text-xs font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-colors"
            >
              🔓 فعـال‌سازی اشتراک ویـژه برای دسترسی کامل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIToolSubscriptionCard;

