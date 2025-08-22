import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { userData, isAPIConnected, refreshUserData } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    username: userData.username || userData.firstName || "کاربر MonetizeAI",
    phone: "+98 912 345 6789",
    email: "user@monetizeai.com",
    income: userData.incomeMonth || 0
  });



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

  const userProfile = {
    name: userData.username || userData.firstName || "کاربر MonetizeAI",
    subscription: {
      plan: "پرو",
      status: "فعال",
      startDate: "۲۵ دی ۱۴۰۲",
      endDate: "۲۶ دی ۱۴۰۳",
      autoRenew: "فعال"
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSubscriptionManagement = () => {
    setShowSubscriptionModal(true);
  };

  const handleSupportClick = () => {
    setShowSubscriptionModal(false);
    // هدایت به صفحه پشتیبانی یا باز کردن چت
    navigate('/ai-coach');
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
              <div className="pt-24 pb-12 p-4 space-y-6 max-w-md mx-auto">
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
        <div className="backdrop-blur-xl rounded-2xl p-7 border border-gray-800/60 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] shadow-xl border border-white/20">
              <div className="scale-125 text-white">
                <User size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-400">پروفایل</span>
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
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
            className="w-full mt-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white py-3 px-4 rounded-xl font-medium hover:from-[#1a0f5a] hover:to-[#4a0f7a] transition-all duration-300 shadow-lg hover:scale-105"
          >
            ویرایش پروفایل
              </button>
              </div>

        {/* Subscription Card */}
        <div className="backdrop-blur-xl rounded-2xl p-7 border border-gray-800/60 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 via-emerald-600 to-green-700 shadow-xl border border-white/20">
              <div className="scale-125 text-white">
                <CreditCard size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-400">اشتراک</span>
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight mb-1">اشتراک {userProfile.subscription.plan}</h3>
              <p className="text-sm text-green-400 font-medium">وضعیت: {userProfile.subscription.status}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">تاریخ شروع:</span>
              <span className="text-white font-medium">{userProfile.subscription.startDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">تاریخ انقضا:</span>
              <span className="text-white font-medium">{userProfile.subscription.endDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">تمدید خودکار:</span>
              <span className="font-medium text-green-400">{userProfile.subscription.autoRenew}</span>
            </div>
          </div>
          
          <button 
            onClick={handleSubscriptionManagement}
            className="w-full mt-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white py-3 px-4 rounded-xl font-medium hover:from-[#1a0f5a] hover:to-[#4a0f7a] transition-all duration-300 shadow-lg hover:scale-105"
          >
            مدیریت اشتراک
          </button>
          </div>
          
        {/* Team Message Card */}
        <div 
          className="backdrop-blur-xl rounded-3xl p-7 border border-gray-700/60 shadow-lg mb-8 cursor-pointer hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]" 
          style={{ backgroundColor: '#10091c' }}
          onClick={() => window.open('https://t.me/sian_academy_support', '_blank')}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] shadow-xl border border-white/20">
              <div className="scale-125 text-white">
                <MessageSquare size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-400">پیام تیم</span>
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight mb-1">پیام تیم ما</h3>
              <p className="text-sm font-medium" style={{ color: '#8B5CF6' }}>با عشق از تیم MonetizeAI</p>
            </div>
          </div>
          <p className="text-sm text-gray-300 mb-4 line-clamp-2">
            سلام! ما در MonetizeAI متعهد به موفقیت شما هستیم. اگر سوالی دارید یا به کمک نیاز دارید، تیم پشتیبانی ما آماده خدمت‌رسانی است.
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">پشتیبانی 24/7</span>
            <span className="font-medium" style={{ color: '#8B5CF6' }}>ارتباط با تیم →</span>
          </div>
          </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-800/60 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800/60">
              <h3 className="text-xl font-bold text-white">ویرایش پروفایل</h3>
              <button 
                onClick={handleCancelEdit}
                className="p-2 hover:bg-gray-800/60 rounded-xl transition-colors duration-300"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">نام کاربری</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="نام کاربری خود را وارد کنید"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Phone size={16} />
                  شماره تلفن
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="+98 912 345 6789"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Mail size={16} />
                  ایمیل
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="user@monetizeai.com"
                />
              </div>

              {/* Income */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">درآمد ماهانه (تومان)</label>
                <input
                  type="number"
                  value={editForm.income}
                  onChange={(e) => setEditForm({...editForm, income: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="2450000"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-800/60 flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 px-4 bg-gray-800/60 text-gray-300 rounded-xl font-medium hover:bg-gray-700/60 transition-all duration-300"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl font-medium hover:from-[#1a0f5a] hover:to-[#4a0f7a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
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

      {/* Subscription Modal - simplified for brevity */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <div className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] backdrop-blur-xl rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-700/60 shadow-2xl">
            <div className="p-6 border-b border-gray-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">📦 پلن‌های اشتراک</h3>
                <button onClick={() => setShowSubscriptionModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-300 mb-4">اطلاعات اشتراک‌ها</p>
              <button onClick={handleSupportClick} className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white px-6 py-3 rounded-xl">
                مشاوره رایگان
                  </button>
            </div>
          </div>
                  </div>
      )}

      {/* Checkout Modal - simplified for brevity */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <div className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] rounded-3xl w-full max-w-md p-6 border border-gray-700/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">سبد خرید</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X size={20} className="text-gray-400" />
                </button>
            </div>
            <p className="text-gray-300 text-center">عملیات پرداخت</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;