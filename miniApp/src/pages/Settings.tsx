import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/themeContextDef';
import { useApp } from '../context/appContextDef';
import Card from '../components/Card';
import { 
  ArrowRight, 
  User, 
  Shield, 
  HelpCircle, 
  LogOut, 
  Edit3,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Zap,
  Crown,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
  X,
  Star,
  MessageSquare,
  ChevronLeft,
  Search
} from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userData } = useApp();
  
  // State management
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    marketing: true,
    achievements: true,
    reminders: true,
    social: false,
    sound: true,
    vibration: true
  });
  
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    incomeVisible: false,
    onlineStatus: true,
    activityVisible: true,
    contactInfo: false,
    searchable: true,
    analytics: true
  });
  
  const [preferences, setPreferences] = useState({
    language: 'fa',
    timezone: 'Asia/Tehran',
    currency: 'IRR',
    dateFormat: 'persian',
    autoSave: true,
    offlineMode: false
  });

  const [showModal, setShowModal] = useState<string | null>(null);

  // Enhanced settings sections with professional design
  const settingSections = [
    {
      id: 'account',
      title: 'حساب کاربری',
      icon: User,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20',
      borderColor: 'border-blue-200/50 dark:border-blue-800/50',
      items: [
        {
          id: 'profile',
          icon: User,
          title: 'اطلاعات شخصی',
          subtitle: 'نام، ایمیل و اطلاعات پروفایل',
          action: () => navigate('/profile/edit'),
          hasArrow: true,
          status: 'تکمیل شده'
        },
        {
          id: 'avatar',
          icon: Camera,
          title: 'تصویر پروفایل',
          subtitle: 'تغییر آواتار و عکس نمایه',
          action: () => setShowModal('avatar'),
          hasArrow: true
        },
        {
          id: 'contact',
          icon: Mail,
          title: 'اطلاعات تماس',
          subtitle: 'user@example.com • ۰۹۱۲۳۴۵۶۷۸۹',
          action: () => setShowModal('contact'),
          hasArrow: true,
          verified: true
        },
        {
          id: 'password',
          icon: Key,
          title: 'امنیت حساب',
          subtitle: 'رمز عبور و تأیید دو مرحله‌ای',
          action: () => setShowModal('password'),
          hasArrow: true,
          badge: 'مهم'
        }
      ]
    },
    {
      id: 'appearance',
      title: 'ظاهر و تجربه کاربری',
      icon: Palette,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20',
      borderColor: 'border-purple-200/50 dark:border-purple-800/50',
      items: [
        {
          id: 'theme',
          icon: theme === 'light' ? Sun : Moon,
          title: 'تم رنگی',
          subtitle: theme === 'light' ? 'حالت روشن فعال است' : 'حالت تاریک فعال است',
          action: toggleTheme,
          toggle: true,
          enabled: theme === 'dark'
        },
        {
          id: 'language',
          icon: Languages,
          title: 'زبان و منطقه',
          subtitle: preferences.language === 'fa' ? 'فارسی (ایران)' : 'English (US)',
          action: () => setShowModal('language'),
          hasArrow: true
        },
        {
          id: 'display',
          icon: Monitor,
          title: 'تنظیمات نمایش',
          subtitle: 'اندازه فونت، کنتراست و رنگ‌ها',
          action: () => setShowModal('display'),
          hasArrow: true
        },
        {
          id: 'animations',
          icon: Zap,
          title: 'انیمیشن‌ها',
          subtitle: 'تنظیم سرعت و نوع انیمیشن‌ها',
          action: () => setShowModal('animations'),
          hasArrow: true
        }
      ]
    },
    {
      id: 'notifications',
      title: 'اعلان‌ها و هشدارها',
      icon: Bell,
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-50/80 to-red-50/80 dark:from-orange-900/20 dark:to-red-900/20',
      borderColor: 'border-orange-200/50 dark:border-orange-800/50',
      items: [
        {
          id: 'push',
          icon: Bell,
          title: 'اعلان‌های فوری',
          subtitle: notifications.push ? 'دریافت اعلان‌های Push' : 'اعلان‌های فوری غیرفعال',
          action: () => setNotifications(prev => ({ ...prev, push: !prev.push })),
          toggle: true,
          enabled: notifications.push
        },
        {
          id: 'email',
          icon: Mail,
          title: 'اعلان‌های ایمیل',
          subtitle: notifications.email ? 'دریافت ایمیل‌های اطلاع‌رسانی' : 'ایمیل‌ها غیرفعال',
          action: () => setNotifications(prev => ({ ...prev, email: !prev.email })),
          toggle: true,
          enabled: notifications.email
        },
        {
          id: 'sound',
          icon: Volume2,
          title: 'صدای اعلان‌ها',
          subtitle: notifications.sound ? 'پخش صدا برای اعلان‌ها' : 'حالت بی‌صدا',
          action: () => setNotifications(prev => ({ ...prev, sound: !prev.sound })),
          toggle: true,
          enabled: notifications.sound
        },
        {
          id: 'achievements',
          icon: Award,
          title: 'اعلان دستاوردها',
          subtitle: notifications.achievements ? 'اطلاع از دستاوردهای جدید' : 'اعلان دستاوردها غیرفعال',
          action: () => setNotifications(prev => ({ ...prev, achievements: !prev.achievements })),
          toggle: true,
          enabled: notifications.achievements
        }
      ]
    },
    {
      id: 'privacy',
      title: 'حریم خصوصی و امنیت',
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20',
      borderColor: 'border-green-200/50 dark:border-green-800/50',
      items: [
        {
          id: 'profile-visibility',
          icon: Eye,
          title: 'نمایش پروفایل',
          subtitle: privacy.profileVisible ? 'پروفایل عمومی' : 'پروفایل خصوصی',
          action: () => setPrivacy(prev => ({ ...prev, profileVisible: !prev.profileVisible })),
          toggle: true,
          enabled: privacy.profileVisible
        },
        {
          id: 'income-visibility',
          icon: DollarSign,
          title: 'نمایش درآمد',
          subtitle: privacy.incomeVisible ? 'درآمد قابل مشاهده' : 'درآمد مخفی',
          action: () => setPrivacy(prev => ({ ...prev, incomeVisible: !prev.incomeVisible })),
          toggle: true,
          enabled: privacy.incomeVisible
        },
        {
          id: 'two-factor',
          icon: Shield,
          title: 'تأیید دو مرحله‌ای',
          subtitle: 'امنیت بیشتر با 2FA',
          action: () => setShowModal('2fa'),
          hasArrow: true,
          badge: 'توصیه می‌شود',
          badgeColor: 'bg-green-500'
        },
        {
          id: 'login-history',
          icon: Activity,
          title: 'تاریخچه ورود',
          subtitle: 'مشاهده ورودهای اخیر',
          action: () => setShowModal('login-history'),
          hasArrow: true
        }
      ]
    },
    {
      id: 'subscription',
      title: 'اشتراک و پرداخت',
      icon: Crown,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'from-yellow-50/80 to-amber-50/80 dark:from-yellow-900/20 dark:to-amber-900/20',
      borderColor: 'border-yellow-200/50 dark:border-yellow-800/50',
      items: [
        {
          id: 'current-plan',
          icon: Crown,
          title: 'پلن فعلی',
          subtitle: 'Premium • تا ۱۵ اسفند ۱۴۰۲',
          action: () => navigate('/subscription'),
          hasArrow: true,
          badge: 'فعال',
          badgeColor: 'bg-green-500'
        },
        {
          id: 'payment-methods',
          icon: CreditCard,
          title: 'روش‌های پرداخت',
          subtitle: 'مدیریت کارت‌ها و حساب‌ها',
          action: () => setShowModal('payment'),
          hasArrow: true
        },
        {
          id: 'billing',
          icon: Receipt,
          title: 'صورتحساب‌ها',
          subtitle: 'فاکتورها و تاریخچه پرداخت',
          action: () => setShowModal('billing'),
          hasArrow: true
        },
        {
          id: 'referral',
          icon: Gift,
          title: 'دعوت از دوستان',
          subtitle: 'کسب درآمد از معرفی',
          action: () => setShowModal('referral'),
          hasArrow: true,
          badge: 'جدید',
          badgeColor: 'bg-blue-500'
        }
      ]
    },
    {
      id: 'data',
      title: 'داده‌ها و ذخیره‌سازی',
      icon: Database,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20',
      borderColor: 'border-indigo-200/50 dark:border-indigo-800/50',
      items: [
        {
          id: 'backup',
          icon: Upload,
          title: 'پشتیبان‌گیری',
          subtitle: preferences.autoSave ? 'ذخیره خودکار فعال' : 'ذخیره دستی',
          action: () => setPreferences(prev => ({ ...prev, autoSave: !prev.autoSave })),
          toggle: true,
          enabled: preferences.autoSave
        },
        {
          id: 'export',
          icon: Download,
          title: 'دانلود داده‌ها',
          subtitle: 'دریافت کپی از اطلاعات شما',
          action: () => setShowModal('export'),
          hasArrow: true
        },
        {
          id: 'sync',
          icon: RefreshCw,
          title: 'همگام‌سازی',
          subtitle: 'همگام‌سازی بین دستگاه‌ها',
          action: () => setShowModal('sync'),
          hasArrow: true
        },
        {
          id: 'storage',
          icon: Database,
          title: 'فضای ذخیره‌سازی',
          subtitle: '۲.۳ گیگابایت از ۵ گیگابایت',
          action: () => setShowModal('storage'),
          hasArrow: true,
          progress: 46
        }
      ]
    }
  ];

  const handleSectionToggle = (sectionId: string) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleModalClose = () => {
    setShowModal(null);
  };

  const renderModal = () => {
    if (!showModal) return null;

    const modalContent = {
      'avatar': {
        title: 'تغییر تصویر پروفایل',
        content: (
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-2xl">
              <User size={32} className="text-white" />
            </div>
            <label className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 font-medium">
              <Upload size={16} />
              انتخاب عکس جدید
              <input type="file" accept="image/*" className="hidden" />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              فرمت‌های مجاز: JPG, PNG (حداکثر ۵ مگابایت)
            </p>
          </div>
        )
      },
      'export': {
        title: 'دانلود داده‌های شما',
        content: (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              فایل شامل تمام اطلاعات، پیشرفت و تنظیمات شما خواهد بود.
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300">
              شروع دانلود
            </button>
          </div>
        )
      }
    };

    const modal = modalContent[showModal as keyof typeof modalContent];
    if (!modal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{modal.title}</h3>
            <button 
              onClick={handleModalClose}
              className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          {modal.content}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-50 transition-colors duration-300 page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
          html.dark .page-container {
            background: #0F0F0F !important;
          }
          @media (prefers-color-scheme: dark) {
            .page-container {
              background: #0F0F0F !important;
            }
          }
        `
      }} />
              {/* Enhanced Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl border-b border-white/20 dark:border-gray-700/20 px-4 py-4 sticky top-0 z-10 shadow-[0_10px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgb(0,0,0,0.25)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/profile')}
              className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">تنظیمات</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">مدیریت حساب و تنظیمات اپلیکیشن</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-r from-purple-100/70 to-blue-100/70 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl backdrop-blur-sm">
              <SettingsIcon size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <button className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm">
              <Search size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Enhanced Profile Summary */}
        <Card className={`bg-gradient-to-r from-purple-50/80 via-blue-50/80 to-indigo-50/80 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-xl shadow-xl hover:scale-[1.02] transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl ring-2 ring-white/30 dark:ring-gray-700/30">
                <User size={24} className="text-white" />
              </div>
              <div className="absolute -top-1 -left-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                <Crown size={12} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">کاربر MonetizeAI</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-purple-100/70 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm">
                  سطح {userData.currentLevel}
                </span>
                <div className="flex items-center gap-1">
                  <Crown size={12} className="text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400 text-xs font-medium">Premium</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className="text-green-600 dark:text-green-400 text-xs font-medium">تأیید شده</span>
                </div>
              </div>
            </div>
            <button className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-300">
              <Edit3 size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </Card>

        {/* Enhanced Settings Sections */}
        {settingSections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => handleSectionToggle(section.id)}
              className={`w-full flex items-center gap-3 mb-4 p-4 hover:scale-[1.02] rounded-2xl transition-all duration-300 bg-gradient-to-r ${section.bgColor} border ${section.borderColor} backdrop-blur-xl shadow-xl`}
            >
              <div className={`p-3 rounded-xl bg-gradient-to-r ${section.color} text-white shadow-lg`}>
                <section.icon size={20} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {section.items.length} تنظیمات
                </p>
              </div>
              <ChevronLeft 
                size={20} 
                className={`text-gray-400 transition-transform duration-300 ${
                  activeSection === section.id ? 'rotate-90' : ''
                }`} 
              />
            </button>
            
            {activeSection === section.id && (
              <div className="space-y-3 mb-6 animate-fade-in">
                {section.items.map((item) => (
                  <Card key={item.id} className="hover:shadow-xl transition-all duration-300 group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 hover:scale-[1.02]">
                    <div 
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={item.action}
                    >
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${section.color} text-white transition-all duration-300 group-hover:scale-110 shadow-lg`}>
                        <item.icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          {item.badge && (
                            <span className={`text-xs ${item.badgeColor || 'bg-red-500'} text-white px-2 py-0.5 rounded-full font-bold animate-pulse`}>
                              {item.badge}
                            </span>
                          )}
                          {item.verified && (
                            <CheckCircle size={14} className="text-green-500" />
                          )}
                          {item.status && (
                            <span className="text-xs bg-green-100/70 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                              {item.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {item.subtitle}
                        </p>
                        {item.progress && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-2">
                              <div 
                                className={`bg-gradient-to-r ${section.color} h-2 rounded-full transition-all duration-1000`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.toggle ? (
                          <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                            item.enabled 
                              ? `bg-gradient-to-r ${section.color}` 
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${
                              item.enabled ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                          </div>
                        ) : item.hasArrow ? (
                          <ChevronLeft size={18} className="text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Enhanced Quick Actions */}
        <Card className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-xl shadow-xl">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap size={18} className="text-indigo-600 dark:text-indigo-400" />
            اقدامات سریع
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group">
              <RefreshCw size={20} className="text-blue-600 dark:text-blue-400 mx-auto mb-2 group-hover:rotate-180 transition-transform duration-500" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">همگام‌سازی</div>
            </button>
            <button className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group">
              <Download size={20} className="text-green-600 dark:text-green-400 mx-auto mb-2 group-hover:translate-y-1 transition-transform duration-300" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">پشتیبان‌گیری</div>
            </button>
            <button className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group">
              <HelpCircle size={20} className="text-purple-600 dark:text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">راهنمایی</div>
            </button>
            <button className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group">
              <MessageSquare size={20} className="text-orange-600 dark:text-orange-400 mx-auto mb-2 group-hover:rotate-12 transition-transform duration-300" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">پشتیبانی</div>
            </button>
          </div>
        </Card>

        {/* Enhanced Danger Zone */}
        <Card className="border-red-200/50 dark:border-red-800/50 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl shadow-xl">
          <h3 className="font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            منطقه خطر
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-xl hover:scale-[1.02] transition-all duration-300 text-red-600 dark:text-red-400">
              <div className="p-2 rounded-lg bg-red-100/70 dark:bg-red-900/30">
                <Trash2 size={16} />
              </div>
              <div className="flex-1 text-right">
                <h4 className="font-bold">حذف حساب کاربری</h4>
                <p className="text-sm opacity-80">حذف دائمی حساب و تمام اطلاعات</p>
              </div>
              <ChevronLeft size={16} />
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-xl hover:scale-[1.02] transition-all duration-300 text-red-600 dark:text-red-400">
              <div className="p-2 rounded-lg bg-red-100/70 dark:bg-red-900/30">
                <LogOut size={16} />
              </div>
              <div className="flex-1 text-right">
                <h4 className="font-bold">خروج از همه دستگاه‌ها</h4>
                <p className="text-sm opacity-80">خروج امن از تمام جلسات فعال</p>
              </div>
              <ChevronLeft size={16} />
            </button>
          </div>
        </Card>

        {/* Enhanced App Info */}
        <Card className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-blue-900/20 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Zap size={28} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">MonetizeAI</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              نسخه ۲.۱.۰ • آخرین بروزرسانی: ۲۰ دی ۱۴۰۲
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              ساخته شده با ❤️ برای موفقیت شما
            </p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle size={12} />
                آپدیت خودکار
              </span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Shield size={12} />
                امن و محفوظ
              </span>
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <Star size={12} />
                ۴.۹ امتیاز
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default Settings;