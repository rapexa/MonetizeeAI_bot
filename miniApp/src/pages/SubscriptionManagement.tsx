import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, CreditCard } from 'lucide-react';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SubscriptionManagement: React.FC = () => {
  const navigate = useNavigate();
  const { userData, refreshUserData } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('online');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPrePaymentModal, setShowPrePaymentModal] = useState(false);

  // Countdown timer - محاسبه بر اساس subscriptionExpiry واقعی
  useEffect(() => {
    if (userData.subscriptionType === 'free_trial' && userData.subscriptionExpiry) {
      const calculateTimeLeft = () => {
        const expiryDate = new Date(userData.subscriptionExpiry!);
        const now = new Date();
        const diffInMs = Math.max(0, expiryDate.getTime() - now.getTime());
        
        const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffInMs % (1000 * 60)) / 1000);
        
        return { days, hours, minutes, seconds };
      };

      // تنظیم اولیه
      setTimeLeft(calculateTimeLeft());

      // آپدیت هر ثانیه
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [userData.subscriptionType, userData.subscriptionExpiry]);

  const planDetails = {
    starter: {
      name: 'Starter',
      price: '۹۹۰,۰۰۰',
      originalPrice: '۱,۹۸۰,۰۰۰',
      period: 'یک ماهه',
      description: 'اشتراک یک ماهه',
      icon: '🚀',
      gradient: 'from-gray-500 to-gray-700',
      badge: undefined,
      badgeColor: undefined
    },
    pro: {
      name: 'Pro',
      price: '۳,۳۰۰,۰۰۰',
      originalPrice: '۴,۷۴۰,۰۰۰',
      period: 'شش ماهه',
      description: 'اشتراک شش ماهه',
      badge: 'پیشنهاد ویژه',
      badgeColor: 'from-[#2c189a] to-[#5a189a]',
      icon: '⚡',
      gradient: 'from-[#2c189a] to-[#5a189a]'
    },
    ultimate: {
      name: 'Ultimate',
      price: '۷,۵۰۰,۰۰۰',
      originalPrice: '۹,۴۸۰,۰۰۰',
      period: 'بی‌نهایت',
      description: 'اشتراک مادام‌العمر',
      icon: '👑',
      gradient: 'from-green-500 to-green-600',
      badge: undefined,
      badgeColor: undefined
    }
  };

  const plans = [
    { id: 'starter', ...planDetails.starter },
    { id: 'pro', ...planDetails.pro },
    { id: 'ultimate', ...planDetails.ultimate }
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handlePurchase = () => {
    setSelectedPaymentMethod('online');
    setPaymentLoading(false);
    setShowCheckoutModal(true);
  };

  const handleGoBack = () => {
    // اگه history داشته باشیم یک صفحه برمی‌گردیم، وگرنه به profile می‌ریم
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  // Handle payment
  const handlePayment = async () => {
    if (!selectedPlan) {
      alert('لطفا یک پلن را انتخاب کنید');
      return;
    }

    const planTypeMap: { [key: string]: 'starter' | 'pro' | 'ultimate' } = {
      'starter': 'starter',
      'pro': 'pro',
      'ultimate': 'ultimate'
    };

    const planType = planTypeMap[selectedPlan];
    if (!planType) {
      alert('نوع پلن نامعتبر است');
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await apiService.createPaymentRequest(planType);

      if (response.success && response.data) {
        const { payment_url, authority } = response.data;
        
        try {
          if (typeof window !== 'undefined') {
            const paymentWindow = window.open(payment_url, '_blank');
            if (!paymentWindow || paymentWindow.closed || typeof paymentWindow.closed === 'undefined') {
              window.location.href = payment_url;
            }
          }
        } catch (error) {
          window.location.href = payment_url;
        }
        
        pollPaymentStatus(authority);
      } else {
        alert(response.error || 'خطا در ایجاد درخواست پرداخت. لطفا دوباره تلاش کنید.');
      }
    } catch (error) {
      alert('خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const pollPaymentStatus = async (authority: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;

      try {
        const response = await apiService.checkPaymentStatus(authority);

        if (response.success && response.data) {
          if (response.data.success) {
            alert('✅ پرداخت با موفقیت انجام شد! اشتراک شما فعال شد.');
            setShowCheckoutModal(false);
            
            if (refreshUserData) {
              refreshUserData();
            }
            
            navigate('/profile');
            return;
          } else if (response.data.failed) {
            alert('❌ پرداخت ناموفق بود. لطفا دوباره تلاش کنید.');
            return;
          }
        }

        if (response.data?.pending) {
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        setTimeout(checkStatus, 5000);
      }
    };

    setTimeout(checkStatus, 5000);
  };

  return (
    <>
      {/* Main Page */}
      <div 
        className="min-h-screen w-full overflow-y-auto pb-20"
        style={{ backgroundColor: '#0e0817' }}
      >
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Header - Clean & Minimal */}
          <div className="relative mb-8">
            {/* Back Button */}
            <button
              onClick={handleGoBack}
              className="absolute top-0 right-0 w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group border border-white/10 z-10"
            >
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform duration-300" />
            </button>

            {/* Simple & Elegant Header */}
            <div className="text-center pt-14 pb-6">
              {/* Crown */}
              <div className="flex justify-center mb-5">
                <span className="text-5xl">👑</span>
              </div>
              
              {/* Title with Subtle Animation */}
              <h1 className="text-3xl font-bold text-white mb-3 animate-fadeInUp">
                انتخاب اشتراک ویژه
              </h1>
              
              <style dangerouslySetInnerHTML={{
                __html: `
                  @keyframes fadeInUp {
                    from {
                      opacity: 0;
                      transform: translateY(10px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }
                  .animate-fadeInUp {
                    animation: fadeInUp 0.6s ease-out;
                  }
                `
              }} />
              
              {/* Subtitle */}
              <p className="text-gray-400 text-sm">
                مسیر موفقیت خود را شروع کنید
              </p>
            </div>

            {/* Countdown Timer - فقط برای کاربران free_trial */}
            {userData.subscriptionType === 'free_trial' && (
              <div className="relative overflow-hidden rounded-3xl p-6 mb-4" style={{ background: 'linear-gradient(135deg, rgba(15, 8, 23, 0.95) 0%, rgba(16, 9, 28, 0.95) 100%)' }}>
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/10 via-transparent to-[#5a189a]/10 animate-pulse"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <div className="w-2 h-2 rounded-full bg-[#5a189a] animate-pulse"></div>
                    <p className="text-white font-medium text-sm tracking-wide">تخفیف ویژه فقط تا</p>
                    <div className="w-2 h-2 rounded-full bg-[#5a189a] animate-pulse"></div>
                  </div>
                  
                  <div className="flex justify-center items-center gap-3">
                    {[
                      { label: 'روز', value: timeLeft.days },
                      { label: 'ساعت', value: timeLeft.hours },
                      { label: 'دقیقه', value: timeLeft.minutes },
                      { label: 'ثانیه', value: timeLeft.seconds }
                    ].map((item, index) => (
                      <div key={index} className="flex flex-col items-center group">
                        <div className="relative">
                          {/* Outer Glow */}
                          <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                          
                          {/* Main Box */}
                          <div className="relative bg-gradient-to-br from-[#0F0817] to-[#10091c] rounded-2xl w-16 h-16 flex items-center justify-center border border-[#5a189a]/40 shadow-2xl group-hover:scale-110 transition-all duration-300">
                            <span className="text-white font-black text-2xl tracking-tight">
                              {String(item.value).padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-xs mt-2 font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

      {showPrePaymentModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[10000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPrePaymentModal(false);
            }
          }}
        >
          <div
            className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] backdrop-blur-xl rounded-3xl w-full max-w-md border border-gray-700/60 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-6 border-b border-gray-700/60 bg-gradient-to-r from-[#2c189a]/20 to-[#5a189a]/20">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">⚠️ آماده‌سازی پرداخت</h3>
                  <p className="text-gray-300 text-sm">قبل از ورود به درگاه پرداخت</p>
                </div>
                <button
                  onClick={() => setShowPrePaymentModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110 border border-gray-700/60"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🛡️</div>
                <p className="text-gray-200 leading-7">
                  قبل از پرداخت، این صفحه رو نبند. فقط برو وی‌پی‌ا‌ن رو خاموش کن، بعد برگرد همینجا و روی دکمه زیر کلیک کن.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowPrePaymentModal(false);
                    handlePayment();
                  }}
                  disabled={paymentLoading}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                    paymentLoading
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'
                  } text-white shadow-xl shadow-green-500/25`}
                >
                  نهایی کردن خرید
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
          </div>

          {/* Plans Section */}
          <div className="px-2">
            {/* پیام برای کاربران مادام‌العمر */}
            {userData.planName === 'ultimate' ? (
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl p-6 border border-green-500/30">
                <div className="flex flex-col items-center text-center">
                  <div className="text-6xl mb-4">👑</div>
                  <h3 className="text-white text-xl font-bold mb-2">
                    شما اشتراک مادام‌العمر دارید!
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    به عنوان یک کاربر ویژه، به تمام امکانات پلتفرم به صورت نامحدود و برای همیشه دسترسی دارید. 🎉
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-white text-center mb-4 text-sm">
                  انتخاب اشتراک: مدت زمان را انتخاب کنید و از تخفیف ویژه بهره‌مند شوید
                </p>

                <div className="space-y-3">
                  {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`relative bg-gradient-to-br from-[#10091c] to-[#0F0817] backdrop-blur-md rounded-2xl p-4 cursor-pointer transition-all duration-300 border-2 ${
                    selectedPlan === plan.id
                      ? 'border-[#5a189a] shadow-lg shadow-[#5a189a]/20 scale-[1.02]'
                      : 'border-gray-700/60 hover:border-[#5a189a]/40'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r ${plan.badgeColor} text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Radio Button */}
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedPlan === plan.id
                          ? 'border-[#5a189a] bg-[#5a189a]'
                          : 'border-gray-500'
                      }`}>
                        {selectedPlan === plan.id && (
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                        )}
                      </div>

                      {/* Plan Info */}
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{plan.description}</p>
                        <p className="text-gray-400 text-xs line-through">{plan.originalPrice} تومان</p>
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
                    <button className="mt-3 w-full bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 text-sm">
                      ✓ انتخاب شده
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={!selectedPlan}
              className={`mt-6 w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                selectedPlan
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-green-500/25'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="text-lg">ادامه و خرید اشتراک {planDetails[selectedPlan as keyof typeof planDetails]?.name}</span>
              <span className="text-xl">←</span>
            </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCheckoutModal(false);
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] border border-gray-700/60 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-gray-700/60 bg-gradient-to-r from-[#2c189a]/20 to-[#5a189a]/20">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2c189a]/10 to-[#5a189a]/10 rounded-t-3xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">🛒 سبد خرید</h3>
                  <p className="text-gray-300 text-sm">تکمیل خرید اشتراک</p>
                </div>
                <button 
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110 border border-gray-700/60"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex flex-col" style={{ maxHeight: 'calc(90vh - 180px)', minHeight: '400px' }}>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Selected Plan */}
                <div className="backdrop-blur-xl rounded-2xl p-6 border border-gray-700/60 shadow-lg mb-6" style={{ backgroundColor: '#10091c' }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${planDetails[selectedPlan as keyof typeof planDetails]?.gradient} rounded-xl flex items-center justify-center`}>
                      <span className="text-white text-xl">{planDetails[selectedPlan as keyof typeof planDetails]?.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-lg">{planDetails[selectedPlan as keyof typeof planDetails]?.name}</h4>
                      <p className="text-gray-400 text-sm">{planDetails[selectedPlan as keyof typeof planDetails]?.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">قیمت:</span>
                    <span className="text-2xl font-black text-white">{planDetails[selectedPlan as keyof typeof planDetails]?.price} تومان</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-lg font-bold text-white mb-3">💳 روش پرداخت</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-700/60 cursor-pointer hover:bg-gray-800/30 transition-colors">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="online" 
                        checked={selectedPaymentMethod === 'online'}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-[#5a189a] bg-gray-800 border-gray-600 focus:ring-[#5a189a] focus:ring-2" 
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">پرداخت آنلاین</span>
                          <span className="text-xs text-green-400">(پیشنهادی)</span>
                        </div>
                        <p className="text-xs text-gray-400">پرداخت امن با درگاه‌های معتبر</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-700/60 cursor-pointer hover:bg-gray-800/30 transition-colors">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="card-to-card" 
                        checked={selectedPaymentMethod === 'card-to-card'}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-[#5a189a] bg-gray-800 border-gray-600 focus:ring-[#5a189a] focus:ring-2" 
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">کارت به کارت</span>
                        </div>
                        <p className="text-xs text-gray-400">انتقال مستقیم به شماره کارت</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Total or Card Info */}
                {selectedPaymentMethod === 'online' ? (
                  <div className="backdrop-blur-xl rounded-2xl p-4 border border-gray-700/60 shadow-lg mb-6" style={{ backgroundColor: '#10091c' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">قیمت پلن:</span>
                      <span className="text-white font-medium">{planDetails[selectedPlan as keyof typeof planDetails]?.price} تومان</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">کارمزد:</span>
                      <span className="text-white font-medium">رایگان</span>
                    </div>
                    <div className="border-t border-gray-700/60 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">مجموع:</span>
                        <span className="text-2xl font-black text-white">{planDetails[selectedPlan as keyof typeof planDetails]?.price} تومان</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="backdrop-blur-xl rounded-2xl p-4 border border-gray-700/60 shadow-lg mb-6" style={{ backgroundColor: '#10091c' }}>
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">اطلاعات کارت به کارت</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-sm">مبلغ قابل پرداخت:</span>
                          <span className="text-white font-bold">{planDetails[selectedPlan as keyof typeof planDetails]?.price} تومان</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-sm">شماره کارت:</span>
                          <span className="text-white font-mono font-bold">۵۰۲۲-۲۹۱۳-۲۵۴۷-۵۳۱۵</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-sm">به نام:</span>
                          <span className="text-white font-bold">حسین عباسیان</span>
                        </div>
                      </div>
                      
                      <div className="text-center text-sm text-gray-300 mt-4">
                        پس از واریز، رسید را به{' '}
                        <a 
                          href="https://t.me/sian_academy_support" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#5a189a] font-bold underline"
                        >
                          پشتیبانی
                        </a>
                        {' '}ارسال کنید
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Payment Button */}
              <div className="p-6 border-t border-gray-700/60 bg-gradient-to-r from-[#2c189a]/10 to-[#5a189a]/10">
                {selectedPaymentMethod === 'online' ? (
                  <button
                    onClick={() => setShowPrePaymentModal(true)}
                    disabled={paymentLoading}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                      paymentLoading
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'
                    } text-white shadow-xl shadow-green-500/25`}
                  >
                    {paymentLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        در حال انتقال...
                      </span>
                    ) : (
                      '💳 پرداخت آنلاین'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      window.open('https://t.me/sian_academy_support', '_blank');
                      setShowCheckoutModal(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl"
                  >
                    📤 ارسال رسید به پشتیبانی
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionManagement;
