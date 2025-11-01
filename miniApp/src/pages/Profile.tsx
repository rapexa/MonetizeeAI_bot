import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import apiService from '../services/api';
import { 
  User, 
  CreditCard,
  MessageSquare,
  X,
  Save,
  Phone,
  Mail
} from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, isAPIConnected, refreshUserData } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    username: userData.username || userData.firstName || "کاربر MonetizeAI",
    phone: "+98 912 345 6789",
    email: "user@monetizeai.com",
    income: userData.incomeMonth || 0
  });

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('online');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentAuthority, setPaymentAuthority] = useState<string | null>(null);

  const planDetails = {
    starter: {
      name: 'Starter',
      price: '۷۹۰,۰۰۰',
      period: 'ماهانه',
      icon: '🚀',
      gradient: 'from-gray-500 to-gray-700'
    },
    pro: {
      name: 'Pro',
      price: '۳,۳۰۰,۰۰۰',
      period: 'شش‌ماهه',
      icon: '⚡',
      gradient: 'from-[#2c189a] to-[#5a189a]'
    },
    ultimate: {
      name: 'Ultimate',
      price: '۷,۵۰۰,۰۰۰',
      period: 'مادام‌العمر',
      icon: '👑',
      gradient: 'from-yellow-500 to-orange-500'
    }
  };

  const subscriptionPlans = [
    {
      id: 'basic',
      name: 'پایه',
      price: 'رایگان',
      originalPrice: null,
      features: [
        'دسترسی به ابزارهای پایه',
        '۵ پرامپت آماده',
        'پشتیبانی ایمیلی',
        'محدودیت ۱۰۰ درخواست ماهانه'
      ],
      popular: false,
      gradient: 'from-gray-500 to-gray-700',
      current: false
    },
    {
      id: 'pro',
      name: 'پرو',
      price: '۲۹۹,۰۰۰',
      originalPrice: '۴۹۹,۰۰۰',
      features: [
        'تمام امکانات پایه',
        'دسترسی نامحدود به ابزارهای AI',
        'پرامپت‌های نامحدود',
        'پشتیبانی ۲۴/۷',
        'دوره‌های آموزشی اختصاصی',
        'گزارش‌های پیشرفته'
      ],
      popular: true,
      gradient: 'from-blue-500 to-indigo-600',
      current: true
    },
    {
      id: 'premium',
      name: 'پریمیوم',
      price: '۵۹۹,۰۰۰',
      originalPrice: '۸۹۹,۰۰۰',
      features: [
        'تمام امکانات پرو',
        'مشاوره شخصی',
        'ابزارهای اختصاصی',
        'دوره‌های خصوصی',
        'گزارش‌های سفارشی',
        'اولویت در پشتیبانی'
      ],
      popular: false,
              gradient: 'from-[#5A189A] to-pink-600',
      current: false
    }
  ];

  // Get subscription info from userData
  const getSubscriptionInfo = () => {
    // اول PlanName رو چک کنیم (دقیق‌تره)
    if (userData.planName && userData.planName !== "") {
      const expiryDate = userData.subscriptionExpiry ? new Date(userData.subscriptionExpiry) : null;
      const isExpired = expiryDate && new Date() > expiryDate;
      
      switch (userData.planName) {
        case "ultimate":
          return {
            plan: "Ultimate (مادام‌العمر)",
            status: "فعال",
            endDate: "نامحدود"
          };
        case "starter":
          return {
            plan: "Starter (ماهانه)",
            status: isExpired ? "منقضی شده" : "فعال",
            endDate: expiryDate ? expiryDate.toLocaleDateString('fa-IR') : "-"
          };
        case "pro":
          return {
            plan: "Pro (شش‌ماهه)",
            status: isExpired ? "منقضی شده" : "فعال",
            endDate: expiryDate ? expiryDate.toLocaleDateString('fa-IR') : "-"
          };
        case "free_trial":
          return {
            plan: "اشتراک رایگان (3 روزه)",
            status: isExpired ? "منقضی شده" : "فعال",
            endDate: expiryDate ? expiryDate.toLocaleDateString('fa-IR') : "-"
          };
      }
    }
    
    // اگر PlanName نداشت، از SubscriptionType استفاده کنیم (legacy users)
    if (userData.subscriptionType === 'paid') {
      if (!userData.subscriptionExpiry) {
        return {
          plan: "Ultimate (مادام‌العمر)",
          status: "فعال",
          endDate: "نامحدود"
        };
      } else {
        const expiryDate = new Date(userData.subscriptionExpiry);
        const isExpired = new Date() > expiryDate;
        return {
          plan: "اشتراک پولی",
          status: isExpired ? "منقضی شده" : "فعال",
          endDate: expiryDate.toLocaleDateString('fa-IR')
        };
      }
    } else if (userData.subscriptionType === 'free_trial') {
      const expiryDate = userData.subscriptionExpiry ? new Date(userData.subscriptionExpiry) : null;
      const isExpired = expiryDate && new Date() > expiryDate;
      return {
        plan: "اشتراک رایگان (3 روزه)",
        status: isExpired ? "منقضی شده" : "فعال",
        endDate: expiryDate ? expiryDate.toLocaleDateString('fa-IR') : "-"
      };
    } else {
      return {
        plan: "بدون اشتراک",
        status: "غیرفعال",
        endDate: "-"
      };
    }
  };

  const userProfile = {
    name: userData.username || userData.firstName || "کاربر MonetizeAI",
    subscription: getSubscriptionInfo()
  };

  const handleSubscriptionManagement = () => {
    setShowSubscriptionModal(true);
  };

  const handleSelectPlan = (planId: string) => {
    // اینجا منطق انتخاب پلن را اضافه کنید
    console.log('Selected plan:', planId);
    setShowSubscriptionModal(false);
  };

  const handleSupportClick = () => {
    setShowSubscriptionModal(false);
    // Open Telegram support
    window.open('https://t.me/sian_academy_support', '_blank');
  };

  const handlePlanSelection = (planId: string) => {
    // Close subscription modal and open checkout modal
    setShowSubscriptionModal(false);
    setSelectedPlan(planId);
    setSelectedPaymentMethod('online'); // Set default payment method
    setPaymentAuthority(null); // Reset payment authority
    setPaymentLoading(false); // Reset loading state
    // Small delay to ensure state updates before showing modal
    setTimeout(() => {
      setShowCheckoutModal(true);
    }, 100);
  };

  // Handle payment button click
  const handlePayment = async () => {
    console.log('handlePayment called', { selectedPlan, selectedPaymentMethod });
    
    if (!selectedPlan) {
      console.error('No plan selected');
      alert('لطفا یک پلن را انتخاب کنید');
      return;
    }

    // Map plan IDs to backend plan types
    const planTypeMap: { [key: string]: 'starter' | 'pro' | 'ultimate' } = {
      'starter': 'starter',
      'pro': 'pro',
      'ultimate': 'ultimate'
    };

    const planType = planTypeMap[selectedPlan];
    if (!planType) {
      console.error('Invalid plan type', selectedPlan);
      alert('نوع پلن نامعتبر است');
      return;
    }

    console.log('Creating payment request for plan:', planType);
    setPaymentLoading(true);

    try {
      // Create payment request
      const response = await apiService.createPaymentRequest(planType);

      if (response.success && response.data) {
        const { payment_url, authority } = response.data;
        
        console.log('Payment created:', { payment_url, authority });
        
        // Save authority to check payment status later
        setPaymentAuthority(authority);
        
        // Open payment page - in Telegram Mini App, use window.location.href or window.open
        // Note: window.open might be blocked in some Telegram Mini App contexts
        // Using window.location.href as primary method
        try {
          if (typeof window !== 'undefined') {
            // Try to open in new tab first (works on mobile browsers)
            const paymentWindow = window.open(payment_url, '_blank');
            // If popup blocked, fallback to same window
            if (!paymentWindow || paymentWindow.closed || typeof paymentWindow.closed === 'undefined') {
              window.location.href = payment_url;
            }
          }
        } catch (error) {
          console.error('Error opening payment URL:', error);
          // Fallback to direct navigation
          window.location.href = payment_url;
        }
        
        // Start polling for payment status
        pollPaymentStatus(authority);
      } else {
        console.error('Payment creation failed:', response.error);
        alert(response.error || 'خطا در ایجاد درخواست پرداخت. لطفا دوباره تلاش کنید.');
      }
    } catch (error) {
      console.error('Payment request error:', error);
      alert('خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Poll payment status after redirect
  const pollPaymentStatus = async (authority: string) => {
    const maxAttempts = 60; // Check for 5 minutes (60 * 5 seconds)
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        console.log('Payment status check timeout');
        return;
      }

      attempts++;

      try {
        const response = await apiService.checkPaymentStatus(authority);

        if (response.success && response.data) {
          if (response.data.success) {
            // Payment successful
            alert('✅ پرداخت با موفقیت انجام شد! اشتراک شما فعال شد.');
            setShowCheckoutModal(false);
            setPaymentAuthority(null);
            
            // Refresh user data
            if (refreshUserData) {
              refreshUserData();
            }
            return;
          } else if (response.data.failed) {
            // Payment failed
            alert('❌ پرداخت ناموفق بود. لطفا دوباره تلاش کنید.');
            setPaymentAuthority(null);
            return;
          }
        }

        // If still pending, check again after 5 seconds
        if (response.data?.pending) {
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // Retry after 5 seconds
        setTimeout(checkStatus, 5000);
      }
    };

    // Start checking after 5 seconds
    setTimeout(checkStatus, 5000);
  };

  // Check payment status on component mount if we have an authority
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authority = urlParams.get('Authority');
    const status = urlParams.get('Status');

    if (authority && status === 'OK') {
      // User returned from ZarinPal
      setPaymentAuthority(authority);
      pollPaymentStatus(authority);
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check if user came from "buy subscription" button - open subscription modal automatically
  useEffect(() => {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const startapp = urlParams.get('startapp');
    
    // Also check Telegram WebApp start_param
    let startParam: string | null = null;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
    }
    
    // Check if startapp parameter or start_param starts with "subscription"
    if ((startapp && startapp.startsWith('subscription')) || (startParam && startParam.startsWith('subscription'))) {
      // Open subscription modal automatically
      setShowSubscriptionModal(true);
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location]);

  // Load profile data on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (isAPIConnected) {
        try {
          const response = await apiService.getUserProfile();
          if (response.success && response.data) {
            // Update editForm with real data
            setEditForm(prev => ({
              ...prev,
              username: response.data?.username || "کاربر MonetizeAI",
              phone: response.data?.phone || "+98 912 345 6789",
              email: response.data?.email || "user@monetizeai.com",
              income: response.data?.monthly_income || userData.incomeMonth || 0
            }));
          }
        } catch (error) {
          console.error('Error loading profile data:', error);
        }
      }
    };

    loadProfileData();
  }, [isAPIConnected, userData.incomeMonth, userData.username, userData.firstName]);

  // Update editForm when userData changes
  useEffect(() => {
    setEditForm(prev => ({
      ...prev,
      username: userData.username || userData.firstName || "کاربر MonetizeAI",
      income: userData.incomeMonth || 0
    }));
  }, [userData.username, userData.firstName, userData.incomeMonth]);

  const handleEditProfile = () => {
    setShowEditModal(true);
  };


  // Handle save profile
  const handleSaveProfile = async () => {
    if (!isAPIConnected) {
      alert('اتصال به سرور برقرار نیست');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        username: editForm.username,
        phone: editForm.phone,
        email: editForm.email,
        monthly_income: editForm.income
      };

      const response = await apiService.updateUserProfile(updateData);
      
      if (response.success) {
        setShowEditModal(false);
        alert('پروفایل با موفقیت بروزرسانی شد!');
        
        // Auto refresh user data to update dashboard
        console.log('🔄 Auto refreshing user data after profile update...');
        await refreshUserData();
      } else {
        alert('خطا در بروزرسانی پروفایل: ' + response.error);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('خطا در بروزرسانی پروفایل');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    // Reset form to original values
    setEditForm({
      username: editForm.username,
      phone: editForm.phone,
      email: editForm.email,
      income: editForm.income
    });
  };

  return (
    <div className="min-h-screen transition-colors duration-300 profile-container" style={{ backgroundColor: '#0e0817' }}>
              <div className="pt-24 pb-12 p-4 space-y-8 max-w-md mx-auto">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
          <div className="flex items-center justify-between p-4 max-w-md mx-auto">
            {/* Icon Container */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-xl flex items-center justify-center shadow-lg">
                <User size={24} className="text-white" />
              </div>
              {/* Icon Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/30 via-[#5a189a]/30 to-[#7222F2]/30 rounded-xl blur-md animate-pulse"></div>
            </div>
            
            {/* Title Section */}
            <div className="text-right flex-1 mr-4">
              <h1 className="text-xl font-bold text-white mb-1">پروفایل من</h1>
              <p className="text-xs text-gray-300">مدیریت حساب کاربری و تنظیمات</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="backdrop-blur-xl rounded-3xl p-8 border border-gray-700/60 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 group" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] shadow-xl border border-white/20 group-hover:scale-110 transition-transform duration-300">
              <div className="scale-125 text-white">
                <User size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-400">پروفایل</span>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight mb-1">{userProfile.name}</h3>
              <p className="text-sm text-[#5a189a] font-medium">سطح {userData.currentLevel}</p>
            </div>
            </div>
            
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">اشتراک:</span>
              <span className="text-white font-medium">{userProfile.subscription.plan}</span>
              </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">وضعیت:</span>
              <span className="font-medium text-green-400">{userProfile.subscription.status}</span>
            </div>
          </div>
            
              <button 
                onClick={handleEditProfile}
            className="w-full mt-6 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white py-3 px-4 rounded-xl font-medium hover:from-[#1a0f5a] hover:to-[#4a0f7a] transition-all duration-300 shadow-lg hover:scale-105 hover:shadow-xl"
          >
            ویرایش پروفایل
              </button>
              </div>

        {/* Subscription Card */}
        <div className="backdrop-blur-xl rounded-3xl p-8 border border-gray-700/60 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 group" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] shadow-xl border border-white/20 group-hover:scale-110 transition-transform duration-300">
              <div className="scale-125 text-white">
                <CreditCard size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-400">اشتراک</span>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight mb-1">اشتراک {userProfile.subscription.plan}</h3>
              <p className={`text-sm font-medium ${
                userProfile.subscription.status === "فعال" ? "text-green-400" : 
                userProfile.subscription.status === "غیرفعال" ? "text-red-400" : 
                "text-yellow-400"
              }`}>
                وضعیت: {userProfile.subscription.status}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">تاریخ انقضا:</span>
              <span className="text-white font-medium">{userProfile.subscription.endDate}</span>
            </div>
          </div>
          
          <button 
            onClick={handleSubscriptionManagement}
            className="w-full mt-6 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white py-3 px-4 rounded-xl font-medium hover:from-[#1a0f5a] hover:to-[#4a0f7a] transition-all duration-300 shadow-lg hover:scale-105 hover:shadow-xl"
          >
            مدیریت اشتراک
          </button>
          </div>
          
        {/* Team Message Card */}
        <div 
          className="backdrop-blur-xl rounded-3xl p-8 border border-gray-700/60 shadow-lg mb-8 cursor-pointer hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group" 
          style={{ backgroundColor: '#10091c' }}
          onClick={() => window.open('https://t.me/sian_academy_support', '_blank')}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] shadow-xl border border-white/20 group-hover:scale-110 transition-transform duration-300">
              <div className="scale-125 text-white">
                <MessageSquare size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-400">پشتیبانی</span>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight mb-1">پشتیبانی</h3>
              <p className="text-sm font-medium" style={{ color: '#8B5CF6' }}>با عشق از تیم MonetizeAI</p>
            </div>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            سلام! ما در MonetizeAI متعهد به موفقیت شما هستیم. اگر سوالی دارید یا به کمک نیاز دارید، تیم پشتیبانی ما آماده خدمت‌رسانی است. ما اینجا هستیم تا در هر مرحله از مسیر رشد کسب‌وکارتان همراه شما باشیم.
          </p>
          <div className="flex items-center justify-end text-sm">
            <span className="font-medium" style={{ color: '#8B5CF6' }}>ارتباط با پشتیبانی →</span>
          </div>
          </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-700/50 shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">ویرایش پروفایل</h3>
                    <p className="text-sm text-white/70">اطلاعات شخصی خود را به‌روزرسانی کنید</p>
                  </div>
                </div>
                <button 
                  onClick={handleCancelEdit}
                  className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">نام کاربری</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 text-base"
                  placeholder="نام کاربری خود را وارد کنید"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Phone size={16} className="text-purple-400" />
                  شماره تلفن
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 text-base"
                  placeholder="+98 912 345 6789"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Mail size={16} className="text-purple-400" />
                  ایمیل
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 text-base"
                  placeholder="user@monetizeai.com"
                />
              </div>

              {/* Income */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">درآمد ماهانه (تومان)</label>
                <input
                  type="number"
                  value={editForm.income}
                  onChange={(e) => setEditForm({...editForm, income: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 text-base"
                  placeholder="2450000"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700/50 flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 px-4 bg-gray-800/40 text-gray-300 rounded-xl font-medium hover:bg-gray-700/50 transition-all duration-300 border border-gray-700/40"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                <Save size={16} />
                )}
                {loading ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <div className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] backdrop-blur-xl rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-700/60 shadow-2xl">
            {/* Header */}
            <div className="relative p-8 border-b border-gray-700/60 bg-gradient-to-r from-[#2c189a]/20 to-[#5a189a]/20">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2c189a]/10 to-[#5a189a]/10 rounded-t-3xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">📦 پلن‌های اشتراک MonetizeAI</h3>
                  <p className="text-gray-300">انتخاب کنید و مسیر موفقیت را شروع کنید</p>
                </div>
                <button 
                  onClick={() => setShowSubscriptionModal(false)}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-110 border border-gray-700/60"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Plans Section */}
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Starter Plan */}
                <div className="relative rounded-3xl p-8 border border-gray-700/60 transition-all duration-500 hover:scale-105 cursor-pointer group backdrop-blur-xl shadow-lg" style={{ backgroundColor: '#10091c' }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl">🚀</span>
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-3">Starter</h4>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <span className="text-4xl font-black text-white">۷۹۰,۰۰۰</span>
                      <span className="text-lg text-gray-400">تومان</span>
                    </div>
                    <div className="text-sm text-gray-400 mb-4">ماهانه</div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">دسترسی کامل به مسیر آموزشی ۹ سطح</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">ابزارهای AI داخلی (با محدودیت ماهانه)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">کوچ هوشمند (پاسخ‌گویی محدود روزانه)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
                        <div className="w-1.5 h-5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">ذخیره‌سازی و پیگیری پیشرفت</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">پشتیبانی پایه (تیکتی)</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePlanSelection('starter')}
                    className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600"
                  >
                    انتخاب پلن
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="relative rounded-3xl p-8 border-2 border-[#5a189a]/50 transition-all duration-500 hover:scale-105 cursor-pointer group backdrop-blur-xl shadow-lg" style={{ backgroundColor: '#10091c' }}>
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    ⭐ پرفروش‌ترین
              </div>

                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl">⚡</span>
                        </div>
                    <h4 className="text-2xl font-bold text-white mb-3">Pro</h4>
                        <div className="flex items-center justify-center gap-3 mb-3">
                      <span className="text-4xl font-black text-white">۳,۳۰۰,۰۰۰</span>
                          <span className="text-lg text-gray-400">تومان</span>
                        </div>
                    <div className="text-sm text-gray-400 mb-2">شش‌ماهه</div>
                    <div className="text-sm text-[#5a189a] font-bold">۵۵۰ هزار تومان ماهانه</div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#5a189a] to-[#7222F2] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">همه امکانات Starter بدون محدودیت</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#5a189a] to-[#7222F2] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">ابزارهای AI نامحدود</span>
                          </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#5a189a] to-[#7222F2] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">کوچ هوشمند نامحدود</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#5a189a] to-[#7222F2] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                      <span className="text-gray-200 font-medium text-sm">پشتیبانی VIP (تلگرام)</span>
                          </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#5a189a] to-[#7222F2] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">آپدیت رایگان تمام مسیرها</span>
                    </div>
                      </div>

                      <button
                    onClick={() => handlePlanSelection('pro')}
                    className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 shadow-[#5A189A]/25"
                  >
                    انتخاب پلن
                      </button>
                </div>

                {/* Ultimate Plan */}
                <div className="relative rounded-3xl p-8 border border-gray-700/60 transition-all duration-500 hover:scale-105 cursor-pointer group backdrop-blur-xl shadow-lg" style={{ backgroundColor: '#10091c' }}>
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    👑 لایف‌تایم
                  </div>
                  
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl">👑</span>
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-3">Ultimate</h4>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <span className="text-4xl font-black text-white">۷,۵۰۰,۰۰۰</span>
                      <span className="text-lg text-gray-400">تومان</span>
                    </div>
                    <div className="text-sm text-yellow-400 font-bold">مادام‌العمر</div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">همه امکانات Pro مادام‌العمر</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">دسترسی دائمی به آپدیت‌ها</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">پشتیبانی اولویت‌دار لایف‌تایم</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">دسترسی به ابزارهای بتا</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-200 font-medium text-sm">عضویت در گروه خصوصی</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePlanSelection('ultimate')}
                    className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 shadow-yellow-500/25"
                  >
                    انتخاب پلن
                  </button>
                </div>
              </div>

              {/* Support Section */}
              <div className="backdrop-blur-xl rounded-3xl p-8 border border-gray-700/60 shadow-lg mb-8" style={{ backgroundColor: '#10091c' }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">💬</span>
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">نیاز به راهنمایی دارید؟</h4>
                  <p className="text-gray-300 text-lg">تیم پشتیبانی ما آماده پاسخگویی به سوالات شما در مورد اشتراک‌هاست</p>
                </div>
                
                <div className="text-center">
                  <button 
                    onClick={handleSupportClick}
                    className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl shadow-[#5A189A]/25"
                  >
                    شروع مشاوره رایگان
                  </button>
                </div>
              </div>
            </div>
          </div>
                  </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={(e) => {
            // Close modal if clicking on backdrop
            if (e.target === e.currentTarget) {
              setShowCheckoutModal(false);
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] border border-gray-700/60 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              zIndex: 10000,
              maxWidth: '90vw',
              margin: 'auto'
            }}
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

              {/* Total */}
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
                      <span className="text-white text-xl">💳</span>
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
                        <span className="text-gray-400 text-sm">بنام:</span>
                        <span className="text-white font-bold">حسین عباسیان</span>
                      </div>
                    </div>
                    
                    <div className="text-center text-sm text-gray-300">
                      پس از واریز، رسید را به{' '}
                      <a 
                        href="http://t.me/sian_academy_support" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        پشتیبانی تلگرام
                      </a>
                      {' '}ارسال کنید
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message */}
              {selectedPaymentMethod === 'online' && (
                <div className="backdrop-blur-xl rounded-2xl p-4 border border-blue-500/30 shadow-lg mb-4" style={{ backgroundColor: '#10091c' }}>
                  <p className="text-blue-400 text-sm text-center mb-2">
                    💡 پس از تکمیل پرداخت در صفحه جدید، می‌توانید به این صفحه برگردید
                  </p>
                  <p className="text-gray-400 text-xs text-center">
                    پس از پرداخت، رسید را به{' '}
                    <a 
                      href="https://t.me/sian_academy_support" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      پشتیبانی تلگرام
                    </a>
                    {' '}ارسال کنید
                  </p>
                </div>
              )}
              </div>
              
              {/* Action Buttons - Fixed at bottom */}
              <div className="p-6 pt-0 space-y-3 border-t border-gray-700/50" style={{ 
                backgroundColor: '#10091c',
                flexShrink: 0,
                paddingBottom: '24px'
              }}>
                {selectedPaymentMethod === 'online' ? (
                  <>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Payment button clicked', { selectedPlan, selectedPaymentMethod, paymentLoading });
                        if (!paymentLoading && selectedPlan) {
                          handlePayment();
                        }
                      }}
                      disabled={paymentLoading || !selectedPlan}
                      className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 shadow-[#5A189A]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{ 
                        minHeight: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        backgroundColor: paymentLoading || !selectedPlan ? 'rgba(44, 24, 154, 0.5)' : undefined,
                        border: 'none',
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}
                      type="button"
                    >
                      {paymentLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          در حال ایجاد درخواست پرداخت...
                        </span>
                      ) : (
                        <span>💳 پرداخت و فعال‌سازی</span>
                      )}
                    </button>
                    {paymentAuthority && (
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
                        <p className="text-blue-400 text-xs text-center">
                          ⏳ در حال بررسی وضعیت پرداخت... لطفا صفحه پرداخت را ببندید و منتظر بمانید.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-3">
                      <p className="text-green-400 text-sm font-medium">
                        ✅ اطلاعات کارت به کارت در بالا نمایش داده شده است
                      </p>
                    </div>
                    <p className="text-gray-400 text-xs">
                      پس از واریز و ارسال رسید، اشتراک شما فعال خواهد شد
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-full py-3 px-6 rounded-2xl font-medium transition-all duration-300 border border-gray-700/60 text-gray-300 hover:bg-gray-800/30"
                  type="button"
                >
                  بازگشت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;