import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onActivate }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 2, hours: 23, minutes: 45, seconds: 30 });

  // Countdown timer - only run when modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'starter',
      name: 'استارتر (۱ماهه) + ۱۰۰ اعتباریک',
      originalPrice: '۱,۵۸۰,۰۰۰',
      price: '۷۹۰,۰۰۰',
      badge: null,
      icon: '🚀',
      gradient: 'from-gray-600 to-gray-800'
    },
    {
      id: 'pro',
      name: 'استارتر (۶ماهه) + ۶۰۰ اعتبار یک',
      originalPrice: '۴,۷۴۰,۰۰۰',
      price: '۳,۳۰۰,۰۰۰',
      badge: 'پیشنهاد ویژه',
      badgeColor: 'bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-sm',
      icon: '⚡',
      gradient: 'from-[#2c189a] to-[#5a189a]',
      popular: true
    },
    {
      id: 'ultimate',
      name: 'استارتر (یکسال) + ۱۲۰۰ اعتبار یک',
      originalPrice: '۹,۴۸۰,۰۰۰',
      price: '۷,۵۰۰,۰۰۰',
      badge: null,
      icon: '👑',
      gradient: 'from-green-500 to-green-600'
    }
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handlePurchase = () => {
    onActivate();
  };

  const modal = (
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      {/* Main Container */}
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 max-h-[95vh] overflow-y-auto"
        style={{ 
          background: 'linear-gradient(135deg, rgba(139, 34, 139, 0.95) 0%, rgba(138, 43, 226, 0.95) 50%, rgba(186, 85, 211, 0.95) 100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Timer */}
        <div className="relative p-6 text-center">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group"
          >
            <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Title with Crown */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl">👑</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">۳ سایزمان بیشتر</h2>
          </div>
          <p className="text-white/90 text-sm mb-6">به پرداخت درب کسا</p>

          {/* Countdown Timer */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-2">
            <p className="text-white/80 text-xs mb-3">⏰ وقت تخفیف</p>
            <div className="flex justify-center gap-2">
              {[
                { label: 'روز', value: timeLeft.days },
                { label: 'ساعت', value: timeLeft.hours },
                { label: 'دقیقه', value: timeLeft.minutes },
                { label: 'ثانیه', value: timeLeft.seconds }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="bg-gradient-to-br from-purple-900/80 to-purple-800/80 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center border border-white/20">
                    <span className="text-white font-bold text-lg">
                      {String(item.value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-white/70 text-xs mt-1">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plans Section */}
        <div className="px-6 pb-6">
          <p className="text-white text-center mb-4 text-sm">
            انتخاب اشتراک: مدت زمان انتخاب کنید و تخفیف خود را انتخاب کنید
          </p>

          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative bg-gradient-to-br from-purple-900/50 to-purple-800/50 backdrop-blur-md rounded-2xl p-4 cursor-pointer transition-all duration-300 border-2 ${
                  selectedPlan === plan.id
                    ? 'border-white shadow-lg shadow-white/20 scale-[1.02]'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 ${plan.badgeColor || 'bg-yellow-500 text-white'} text-xs font-bold px-4 py-1 rounded-full`}>
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Radio Button */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlan === plan.id
                        ? 'border-white bg-white'
                        : 'border-white/50'
                    }`}>
                      {selectedPlan === plan.id && (
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-800"></div>
                      )}
                    </div>

                    {/* Plan Info */}
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{plan.name}</p>
                      <p className="text-white/60 text-xs line-through">{plan.originalPrice} تومان</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                      <span className="text-white/80 text-sm">تومان</span>
                    </div>
                  </div>
                </div>

                {/* Make Default Button - Only show for selected plan */}
                {selectedPlan === plan.id && (
                  <button className="mt-3 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 text-sm">
                    پیش فرض من بشه
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            className="mt-6 w-full bg-white hover:bg-gray-100 text-purple-900 font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span className="text-lg">شارژستاری اشتراک ۱ماهه + ۱۰۰ اعتبار یک</span>
            <span className="text-xl">←</span>
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


