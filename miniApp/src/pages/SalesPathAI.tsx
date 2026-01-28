import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';
import AIToolSubscriptionCard from '../components/AIToolSubscriptionCard';
import { 
  Map, 
  Copy, 
  Download, 
  RefreshCw, 
  ArrowLeft,
  Calendar,
  Star,
  Heart,
  BarChart,
  Lightbulb,
  Instagram,
  MessageSquare,
  Trophy,
  BookOpen,
  Gift,
  Users,
  Video,
  Clock,
  BarChart3,
  Presentation
} from 'lucide-react';

const SalesPathAI: React.FC = () => {
  const navigate = useNavigate();
  const { isAPIConnected, userData } = useApp();
  const [showSubscriptionCard, setShowSubscriptionCard] = React.useState(false);
  const [hasUsedBefore, setHasUsedBefore] = React.useState(false);
  const [formData, setFormData] = React.useState({
    productName: '',
    targetAudience: '',
    salesChannel: '',
    goal: ''
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = React.useState<'custom' | 'templates'>('custom');
  const [, setSelectedTemplate] = React.useState<unknown>(null);

  // Sales Path Templates Database
  const salesTemplates = [
    {
      id: 1,
      title: 'مسیر فروش ۷ روزه در اینستاگرام',
      channel: 'شبکه‌های اجتماعی',
      description: 'فروش سریع از طریق پست معرفی، استوری آموزشی و تعامل دایرکت',
      targetSales: '10-20 فروش',
      investment: 'کم (زیر 1 میلیون)',
      difficulty: 'آسان',
      timeline: '7 روز',
      icon: Instagram,
      color: 'from-pink-500 to-purple-600',
      dailyTasks: [
        'روز 1: ساخت پست معرفی سرویس',
        'روز 2: تعامل با فالوئرها',
        'روز 3-7: استوری اعتمادساز + CTA فروش'
      ]
    },
    {
      id: 2,
      title: 'مسیر فروش با پیام شخصی (Smart DM Funnel)',
      channel: 'واتساپ + اینستاگرام',
      description: 'ارسال پیام‌های شخصی‌سازی‌شده به لیدهای هدف',
      targetSales: '5-15 فروش',
      investment: 'صفر',
      difficulty: 'آسان',
      timeline: '5-7 روز',
      icon: MessageSquare,
      color: 'from-green-500 to-emerald-600',
      dailyTasks: [
        'روز 1: جمع‌کردن 30 لید از کامنت‌ها',
        'روز 2: ارسال پیام معرفی',
        'روز 3-5: پاسخ و بستن فروش'
      ]
    },
    {
      id: 3,
      title: 'مسیر فروش با چالش ۳ روزه (Challenge Funnel)',
      channel: 'تلگرام + اینستاگرام',
      description: 'جذب لید با چالش آموزشی کوتاه و تبدیل به خریدار',
      targetSales: '15-30 فروش',
      investment: 'کم (زیر 1 میلیون)',
      difficulty: 'متوسط',
      timeline: '7-10 روز',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-600',
      dailyTasks: [
        'روز 1-3: اجرای چالش',
        'روز 4-6: ارسال تمرین‌ها و محتوای آموزشی',
        'روز 7: پیشنهاد ویژه خرید'
      ]
    },
    {
      id: 4,
      title: 'مسیر فروش با محتوای آموزشی رایگان (Free Value Funnel)',
      channel: 'بلاگ + اینستاگرام',
      description: 'ارائه آموزش رایگان برای جذب اعتماد و فروش محصول اصلی',
      targetSales: '10-25 فروش',
      investment: 'کم',
      difficulty: 'متوسط',
      timeline: '10 روز',
      icon: BookOpen,
      color: 'from-blue-500 to-cyan-600',
      dailyTasks: [
        'روز 1-3: ساخت پست آموزشی',
        'روز 4-7: جمع‌کردن لیدها',
        'روز 8-10: ارائه پیشنهاد خرید'
      ]
    },
    {
      id: 5,
      title: 'مسیر فروش از طریق لندینگ و هدیه (Gift Landing Funnel)',
      channel: 'وب + واتساپ',
      description: 'فروش با ارائه یک فایل یا ابزار رایگان',
      targetSales: '20 فروش',
      investment: 'کم (زیر 500 هزار تومان)',
      difficulty: 'آسان',
      timeline: '7-10 روز',
      icon: Gift,
      color: 'from-purple-500 to-pink-600',
      dailyTasks: [
        'روز 1-2: ساخت فایل یا PDF هدیه',
        'روز 3-5: تبلیغ لینک هدیه',
        'روز 6-7: ارسال پیشنهاد محصول اصلی'
      ]
    },
    {
      id: 6,
      title: 'مسیر فروش از طریق گروه‌سازی در تلگرام (Micro Community)',
      channel: 'تلگرام',
      description: 'ایجاد گروه کوچک آموزشی و فروش در پایان',
      targetSales: '15-30 فروش',
      investment: 'رایگان',
      difficulty: 'متوسط',
      timeline: '10-14 روز',
      icon: Users,
      color: 'from-teal-500 to-green-600',
      dailyTasks: [
        'روز 1-5: جذب اعضا',
        'روز 6-10: آموزش روزانه',
        'روز 11-14: معرفی سرویس اصلی'
      ]
    },
    {
      id: 7,
      title: 'مسیر فروش با ویدیو معرفی محصول (Promo Video Funnel)',
      channel: 'Reels + WhatsApp',
      description: 'ساخت ویدیو معرفی جذاب و پخش در چند پلتفرم',
      targetSales: '10-20 فروش',
      investment: 'کم (500 هزار تومان)',
      difficulty: 'آسان',
      timeline: '7 روز',
      icon: Video,
      color: 'from-red-500 to-pink-600',
      dailyTasks: [
        'روز 1: ضبط ویدیو معرفی',
        'روز 2-4: انتشار در 3 پلتفرم',
        'روز 5-7: تعامل با کامنت‌ها و دایرکت‌ها'
      ]
    },
    {
      id: 8,
      title: 'مسیر فروش از طریق تخفیف محدود زمانی (Limited Offer)',
      channel: 'واتساپ + پیج فروش',
      description: 'ایجاد حس فوریت با تخفیف 3 روزه',
      targetSales: '20-40 فروش',
      investment: 'رایگان',
      difficulty: 'آسان',
      timeline: '5-7 روز',
      icon: Clock,
      color: 'from-orange-500 to-red-600',
      dailyTasks: [
        'روز 1-2: ساخت پست "تخفیف ویژه"',
        'روز 3-5: یادآوری و پیگیری',
        'روز 6-7: اعلام "آخرین فرصت"'
      ]
    },
    {
      id: 9,
      title: 'مسیر فروش با نظرسنجی و تعامل (Poll Funnel)',
      channel: 'استوری + دایرکت',
      description: 'جذب خریدار از طریق پرسش و پاسخ تعاملی',
      targetSales: '5-10 فروش',
      investment: 'صفر',
      difficulty: 'آسان',
      timeline: '5 روز',
      icon: BarChart3,
      color: 'from-indigo-500 to-purple-600',
      dailyTasks: [
        'روز 1: طراحی استوری نظرسنجی',
        'روز 2-3: دایرکت به شرکت‌کنندگان',
        'روز 4-5: ارائه پیشنهاد شخصی'
      ]
    },
    {
      id: 10,
      title: 'مسیر فروش با وبینار کوچک (Mini Webinar Funnel)',
      channel: 'تلگرام + لندینگ ساده',
      description: 'برگزاری وبینار آموزشی 30 دقیقه‌ای و فروش در پایان',
      targetSales: '30-50 فروش',
      investment: 'کم (1 میلیون)',
      difficulty: 'متوسط',
      timeline: '10-14 روز',
      icon: Presentation,
      color: 'from-emerald-500 to-teal-600',
      dailyTasks: [
        'روز 1-5: جذب ثبت‌نامی',
        'روز 6-7: اجرای وبینار',
        'روز 8-10: ارسال پیشنهاد ویژه'
      ]
    }
  ];

  const selectTemplate = (template: { targetSales?: string; channel?: string }) => {
    setSelectedTemplate(template);
    setFormData({
      productName: formData.productName,
      targetAudience: template.targetSales,
      salesChannel: template.channel,
      goal: template.targetSales
    });
    setActiveTab('custom');
  };

  const generateSalesPath = async () => {
    // Validate required fields
    if (!formData.productName.trim() || !formData.targetAudience.trim() || !formData.salesChannel.trim()) {
      alert('لطفاً نام محصول، مخاطب هدف و کانال فروش را وارد کنید');
      return;
    }

    if (!isAPIConnected) {
      alert('اتصال به سرور برقرار نیست. لطفاً دوباره تلاش کنید.');
      return;
    }

    // Check if free_trial user has already used this tool
    if (isFreeTrial) {
      const toolKey = 'sales_path_used';
      const hasUsed = localStorage.getItem(toolKey) === 'true';
      if (hasUsed) {
        setShowSubscriptionCard(true);
        return;
      }
    }

    setIsGenerating(true);
    try {
      console.log('🚀 Generating sales path with ChatGPT...');
      const response = await apiService.generateSalesPath({
        product_name: formData.productName,
        target_audience: formData.targetAudience,
        sales_channel: formData.salesChannel,
        goal: formData.goal || ''
      });

      if (response.success && response.data) {
        console.log('✅ Sales path generated successfully:', response.data);
        setResult(response.data);
        
        // Check if user has used this tool before (only for free_trial)
        if (isFreeTrial) {
          const toolKey = 'sales_path_used';
          const hasUsed = localStorage.getItem(toolKey) === 'true';
          setHasUsedBefore(hasUsed);
          
          // Mark as used
          if (!hasUsed) {
            localStorage.setItem(toolKey, 'true');
          }
        } else {
          setHasUsedBefore(false); // Paid users always have access
        }
      } else {
        console.error('❌ Failed to generate sales path:', response.error);
        
        // Check if it's a rate limit error
        let errorMessage = 'خطا در تولید مسیر فروش: ' + (response.error || 'خطای نامشخص');
        if (response.error && response.error.includes('محدودیت سه تا سوال')) {
          errorMessage = '⚠️ ' + response.error;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error generating sales path:', error);
      
      // Check if it's a rate limit error
      let errorMessage = 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.';
      if (error instanceof Error && error.message.includes('محدودیت سه تا سوال')) {
        errorMessage = '⚠️ ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadAsText = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Check if user is free_trial
  const isFreeTrial = userData.subscriptionType === 'free_trial' || !userData.subscriptionType || userData.subscriptionType === 'none';
  
  // Note: Removed automatic redirect - now handled via subscription modal instead
  
  // Check if user has used this tool before (on mount) - only for free_trial
  React.useEffect(() => {
    if (result && isFreeTrial) {
      const toolKey = 'sales_path_used';
      const hasUsed = localStorage.getItem(toolKey) === 'true';
      setHasUsedBefore(hasUsed);
    } else if (result && !isFreeTrial) {
      setHasUsedBefore(false); // Paid users always have access
    }
  }, [result, isFreeTrial]);

  return (
    <>
      <AIToolSubscriptionCard show={showSubscriptionCard} onClose={() => setShowSubscriptionCard(false)} />
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/30 via-black to-gray-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800/10 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-gray-800/10 via-transparent to-transparent"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* API Status Indicator */}
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          isAPIConnected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isAPIConnected ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`}></div>
          {isAPIConnected ? 'ChatGPT متصل' : 'حالت آفلاین'}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-700 via-violet-800 to-purple-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Map size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مسیر فروش سریع</h1>
              <p className="text-gray-400">برنامه ۷ روزه برای اولین فروش</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center mb-8">
          <div className="backdrop-blur-xl rounded-2xl p-1 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'custom'
                  ? 'bg-purple-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              مسیر سفارشی
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'templates'
                  ? 'bg-purple-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              قالب‌های آماده
            </button>
          </div>
        </div>

        {activeTab === 'templates' ? (
          /* Templates Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {salesTemplates.map((template) => {
              const IconComponent = template.icon;
              return (
                <div
                  key={template.id}
                  className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60 hover:border-purple-600/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
                  style={{ backgroundColor: '#10091D' }}
                  onClick={() => selectTemplate(template)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{template.title}</h3>
                      <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-300 rounded-lg">
                        {template.channel}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{template.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={14} className="text-yellow-400" />
                        <span className="text-xs text-gray-400">هدف فروش</span>
                      </div>
                      <p className="text-white text-xs font-medium">{template.targetSales}</p>
                    </div>
                    
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-blue-400" />
                        <span className="text-xs text-gray-400">مدت زمان</span>
                      </div>
                      <p className="text-white text-xs font-medium">{template.timeline}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">سرمایه:</span>
                      <span className="text-green-400 text-xs font-medium">{template.investment}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">سختی:</span>
                      <span className={`text-xs font-medium ${
                        template.difficulty === 'آسان' ? 'text-green-400' :
                        template.difficulty === 'متوسط' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {template.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800/30 pt-4">
                    <p className="text-gray-400 text-xs mb-2">نمونه وظایف:</p>
                    <div className="space-y-1">
                      {template.dailyTasks.slice(0, 2).map((task, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                          <BarChart size={12} className="text-purple-300 flex-shrink-0" />
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl transition-colors duration-300 text-sm font-medium">
                    انتخاب قالب
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50" style={{ backgroundColor: '#10091D' }}>
              <h2 className="text-xl font-semibold mb-6">اطلاعات فروش</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">نام محصول/خدمت</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors"
                    placeholder="محصول یا خدمت خود را وارد کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">مخاطب هدف</label>
                  <input
                    type="text"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors"
                    placeholder="مثال: کارآفرینان، دانشجویان"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">کانال فروش</label>
                  <select
                    value={formData.salesChannel}
                    onChange={(e) => setFormData({...formData, salesChannel: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="Instagram">اینستاگرام</option>
                    <option value="Website">وبسایت</option>
                    <option value="Email">ایمیل</option>
                    <option value="WhatsApp">واتساپ</option>
                    <option value="Other">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">هدف فروش (اختیاری)</label>
                  <input
                    type="text"
                    value={formData.goal}
                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors"
                    placeholder="مثال: 10 فروش در هفته"
                  />
                </div>
                <button
                  onClick={generateSalesPath}
                  disabled={isGenerating}
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Map size={20} />
                      تولید مسیر فروش
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50" style={{ backgroundColor: '#10091D' }}>
              {result ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                  <h2 className="text-xl font-semibold mb-6">مسیر فروش تولید شده</h2>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-purple-500 font-bold mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-purple-500" />
                      برنامه فروش ۷ روزه
                    </h4>
                    <div className="space-y-3">
                      {((result.dailyPlan as Record<string, unknown>[]) || []).map((day: Record<string, unknown>, index: number) => (
                        <div key={index} className="flex gap-3 p-3 bg-gray-700/40 rounded-lg border border-gray-600/30">
                          <div className="w-8 h-8 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {String(day.day ?? '')}
                          </div>
                          <div className="flex-1">
                            <h5 className="text-white font-semibold mb-1">{String(day.action ?? '')}</h5>
                            <p className="text-gray-300 text-sm">{String(day.content ?? '')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-purple-500 font-bold mb-3 flex items-center gap-2">
                      <Lightbulb size={18} className="text-purple-500" />
                      نکات کلیدی فروش
                    </h4>
                    <div className="space-y-3">
                      {(result.salesTips || []).map((tip: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <Star size={16} className="text-yellow-400 mt-1 flex-shrink-0" />
                          <p className="text-gray-200 font-medium">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {isFreeTrial ? (
                    <>
                      {hasUsedBefore ? (
                        <div className="relative">
                          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30 shadow-lg blur-[2px] pointer-events-none">
                            <h4 className="text-purple-500 font-bold mb-3 flex items-center gap-2">
                              <Heart size={18} className="text-purple-500" />
                              تاکتیک‌های تعامل
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(result.engagement || []).map((tactic: string, index: number) => (
                                <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                                  {tactic}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={() => setShowSubscriptionCard(true)}>
                            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
                              <span className="text-white text-sm font-medium">برای مشاهده کامل کلیک کنید</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30 shadow-lg">
                          <h4 className="text-purple-500 font-bold mb-3 flex items-center gap-2">
                            <Heart size={18} className="text-purple-500" />
                            تاکتیک‌های تعامل
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(result.engagement || []).map((tactic: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                                {tactic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30 shadow-lg">
                      <h4 className="text-purple-500 font-bold mb-3 flex items-center gap-2">
                        <Heart size={18} className="text-purple-500" />
                        تاکتیک‌های تعامل
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(result.engagement || []).map((tactic: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                            {tactic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Copy size={16} />
                      کپی
                    </button>
                    <button
                      onClick={() => downloadAsText(JSON.stringify(result, null, 2), 'sales-path.txt')}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={16} />
                      دانلود
                    </button>
                    <button
                      onClick={generateSalesPath}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                      <Map size={24} />
                    </div>
                    <p>فرم را پر کنید و روی دکمه کلیک کنید</p>
                    <p className="text-sm mt-1">نتایج اینجا نمایش داده می‌شود</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default SalesPathAI;