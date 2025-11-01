import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Home, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUserData } = useApp();

  const status = searchParams.get('status') || 'success';
  const refId = searchParams.get('ref_id') || '';
  const amount = searchParams.get('amount') || '';
  const planType = searchParams.get('plan_type') || '';
  
  const isSuccess = status === 'success';

  // Format price with thousand separators
  const formatPrice = (price: string): string => {
    const num = parseInt(price);
    if (isNaN(num)) return price;
    return num.toLocaleString('fa-IR');
  };

  // Get plan name in Persian
  const getPlanName = (type: string): string => {
    switch (type) {
      case 'starter':
        return 'Starter (یک ماهه)';
      case 'pro':
        return 'Pro (شش‌ماهه)';
      case 'ultimate':
        return 'Ultimate (مادام‌العمر)';
      default:
        return type;
    }
  };

  // Refresh user data on mount if success
  React.useEffect(() => {
    if (isSuccess && refreshUserData) {
      refreshUserData();
    }
  }, [isSuccess, refreshUserData]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300"
      style={{ backgroundColor: '#0e0817' }}
    >
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-700/60">
          {/* Gradient Border Glow */}
          <div 
            className={`absolute inset-0 rounded-3xl ${
              isSuccess 
                ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20' 
                : 'bg-gradient-to-r from-red-500/20 via-pink-500/20 to-rose-500/20'
            } blur-xl -z-10`}
          />

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div 
              className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
                isSuccess
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-red-500 to-rose-600'
              } shadow-lg`}
            >
              {isSuccess ? (
                <CheckCircle size={48} className="text-white" />
              ) : (
                <XCircle size={48} className="text-white" />
              )}
              {/* Glow Effect */}
              <div 
                className={`absolute inset-0 rounded-full ${
                  isSuccess ? 'bg-green-500' : 'bg-red-500'
                } opacity-30 blur-xl animate-pulse`}
              />
            </div>
          </div>

          {/* Title */}
          <h1 
            className={`text-3xl font-bold text-center mb-4 ${
              isSuccess ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isSuccess ? 'پرداخت موفق!' : 'پرداخت ناموفق'}
          </h1>

          {/* Message */}
          <p className="text-gray-300 text-center mb-8 text-lg">
            {isSuccess
              ? 'اشتراک شما با موفقیت فعال شد. از خدمات ما لذت ببرید! 🎉'
              : 'متأسفانه پرداخت شما با خطا مواجه شد. لطفاً دوباره تلاش کنید.'}
          </p>

          {/* Details (only for success) */}
          {isSuccess && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-700/50">
              <div className="space-y-4">
                {refId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">شماره تراکنش:</span>
                    <span className="text-white font-mono text-sm font-bold">{refId}</span>
                  </div>
                )}
                {amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">مبلغ:</span>
                    <span className="text-green-400 font-bold">{formatPrice(amount)} تومان</span>
                  </div>
                )}
                {planType && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">نوع اشتراک:</span>
                    <span className="text-white font-medium">{getPlanName(planType)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            {isSuccess ? (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 shadow-[#5A189A]/25"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Home size={20} />
                    <span>بازگشت به داشبورد</span>
                  </div>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 shadow-[#5A189A]/25"
                >
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={20} />
                    <span>تلاش مجدد</span>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 px-6 rounded-2xl font-medium transition-all duration-300 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white border border-gray-700/50"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Home size={18} />
                    <span>بازگشت به داشبورد</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;

