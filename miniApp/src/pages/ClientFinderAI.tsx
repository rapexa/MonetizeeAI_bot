import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  Copy, 
  Download, 
  RefreshCw, 
  ArrowLeft,
  Calendar,
  Target,
  Users,
  MessageSquare,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MessageCircle,
  Hash,
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  Trophy,
  Send,
  Image,
  FileText,
  Users2,
  Megaphone,
  BookOpen,
  Gift,
  MessageCircle as MessageCircleIcon
} from 'lucide-react';

const ClientFinderAI: React.FC = () => {
  const navigate = useNavigate();
  const { isAPIConnected } = useApp();
  const [formData, setFormData] = React.useState({
    product: '',
    targetClient: '',
    platforms: [] as string[]
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<'custom' | 'strategies'>('custom');
  const [selectedStrategy, setSelectedStrategy] = React.useState<any>(null);

  // Client Finding Strategies Database
  const clientStrategies = [
    {
      id: 1,
      title: 'استراتژی گفتگو در کامنت‌ها (Comment Networking)',
      platform: 'Instagram / LinkedIn',
      description: 'جذب مشتری از طریق کامنت‌گذاری هدفمند زیر پست‌های مرتبط',
      targetAudience: 'فریلنسرها، کوچ‌ها، متخصصان',
      timeFrame: '1-2 هفته',
      cost: 'رایگان',
      successRate: '60-75%',
      icon: MessageSquareIcon,
      color: 'from-blue-500 to-cyan-600',
      steps: ['انتخاب 10 پیج مرتبط با مشتری هدفت', 'نوشتن کامنت‌های هوشمند و ارزش‌افزا', 'ارتباط دایرکت بعد از 2-3 تعامل']
    },
    {
      id: 2,
      title: 'استراتژی همکاری محتوایی (Collab Strategy)',
      platform: 'Instagram + Telegram',
      description: 'همکاری با پیج‌های مشابه برای معرفی متقابل',
      targetAudience: 'پیج‌های آموزشی و خدماتی',
      timeFrame: '2 هفته',
      cost: 'رایگان یا کم‌هزینه',
      successRate: '70%',
      icon: UsersIcon,
      color: 'from-purple-500 to-violet-600',
      steps: ['یافتن پیج‌های با مخاطب مشابه', 'پیشنهاد همکاری دوطرفه', 'انتشار پست مشترک']
    },
    {
      id: 3,
      title: 'استراتژی چالش جذب فالوئر هدفمند (Challenge Launch)',
      platform: 'Instagram / Telegram',
      description: 'راه‌اندازی چالش آموزشی یا انگیزشی 3 روزه برای جذب لید',
      targetAudience: 'کوچ‌ها، مدرسان، پیج‌های رشد فردی',
      timeFrame: '1 هفته',
      cost: 'کم',
      successRate: '80%',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-600',
      steps: ['طراحی چالش کوتاه و هدف‌دار', 'ساخت لندینگ ثبت‌نام', 'ارسال پیام پیگیری بعد از چالش']
    },
    {
      id: 4,
      title: 'استراتژی پیام مستقیم هدفمند (Smart DMs)',
      platform: 'Instagram / WhatsApp',
      description: 'ارسال پیام شخصی‌سازی‌شده به مشتریان بالقوه با کمک AI',
      targetAudience: 'فروشنده‌های خدمات و فریلنسرها',
      timeFrame: '3-5 روز',
      cost: 'رایگان',
      successRate: '45-65%',
      icon: Send,
      color: 'from-green-500 to-emerald-600',
      steps: ['شناسایی مشتری هدف', 'ارسال پیام هوشمند و طبیعی', 'پاسخ با پیشنهاد گفتگو']
    },
    {
      id: 5,
      title: 'استراتژی محتواهای قبل‌و‌بعد (Transformation Post)',
      platform: 'Instagram / Twitter',
      description: 'نمایش نمونه‌های قبل و بعد از خدماتت برای تحریک اعتماد',
      targetAudience: 'طراحان، کوچ‌ها، متخصصان خدماتی',
      timeFrame: '1 هفته',
      cost: 'رایگان',
      successRate: '60-80%',
      icon: Image,
      color: 'from-pink-500 to-rose-600',
      steps: ['انتشار نمونه قبل و بعد', 'اضافه کردن CTA به دایرکت', 'ذخیره استوری‌های نتایج']
    },
    {
      id: 6,
      title: 'استراتژی جذب با پرسش‌نامه (Interactive Form Funnel)',
      platform: 'Telegram / Notion / Typeform',
      description: 'ساخت پرسش‌نامه کوتاه برای شناسایی نیاز کاربر و دعوت به تماس',
      targetAudience: 'کوچ‌ها، مشاوران، متخصصان خدماتی',
      timeFrame: '1 هفته',
      cost: 'کم (زیر 50 هزار تومان)',
      successRate: '70%',
      icon: FileText,
      color: 'from-indigo-500 to-purple-600',
      steps: ['ساخت فرم با سوالات شخصی‌سازی‌شده', 'اشتراک در استوری یا گروه‌ها', 'دعوت افراد واجد شرایط به جلسه رایگان']
    },
    {
      id: 7,
      title: 'استراتژی استفاده از گروه‌های هدفمند تلگرام',
      platform: 'Telegram',
      description: 'معرفی ارزش و خدمات در گروه‌های تخصصی بدون اسپم',
      targetAudience: 'فریلنسرها، مدرسان، فروشندگان ابزار',
      timeFrame: '3-5 روز',
      cost: 'رایگان',
      successRate: '50-70%',
      icon: Users2,
      color: 'from-teal-500 to-green-600',
      steps: ['یافتن گروه‌های حوزه هدفت', 'ارائه نکات کاربردی و ارزش‌افزا', 'پاسخ به سوالات با CTA ملایم']
    },
    {
      id: 8,
      title: 'استراتژی میکروتبلیغ (Micro Promotion)',
      platform: 'Instagram / تلگرام',
      description: 'تبلیغ در پیج‌های کوچک اما مرتبط (1k تا 5k فالوئر)',
      targetAudience: 'پیج‌های آموزشی یا فروش خدمات',
      timeFrame: '1-2 هفته',
      cost: 'کم (200-300 هزار تومان)',
      successRate: '55-75%',
      icon: Megaphone,
      color: 'from-red-500 to-pink-600',
      steps: ['انتخاب پیج مرتبط', 'ارسال بنر یا ویدیو کوتاه', 'سنجش ورودی با لینک اختصاصی']
    },
    {
      id: 9,
      title: 'استراتژی پست داستان شخصی (Authority Building Story)',
      platform: 'Instagram / LinkedIn',
      description: 'روایت داستان مسیر خودت تا ساخت سرویس و موفقیتت',
      targetAudience: 'برندهای شخصی، مدرسان، کوچ‌ها',
      timeFrame: '3 روز',
      cost: 'رایگان',
      successRate: '50-65%',
      icon: BookOpen,
      color: 'from-amber-500 to-yellow-600',
      steps: ['نوشتن روایت واقعی', 'پایان با CTA: "می‌خوای تو هم بسازی؟ پیام بده."', 'انتشار در قالب پست و استوری']
    },
    {
      id: 10,
      title: 'استراتژی «پیشنهاد تست رایگان محدود»',
      platform: 'همه پلتفرم‌ها',
      description: 'ارائه نسخه تست سرویس برای جذب اولین خریداران',
      targetAudience: 'هر نوع سرویس تازه راه‌اندازی‌شده',
      timeFrame: '1-2 هفته',
      cost: 'رایگان',
      successRate: '70-85%',
      icon: Gift,
      color: 'from-emerald-500 to-teal-600',
      steps: ['ساخت نسخه محدود با امکانات پایه', 'دعوت کاربران به تست', 'پیگیری بعد از تجربه برای تبدیل به خریدار']
    }
  ];

  const selectStrategy = (strategy: any) => {
    setSelectedStrategy(strategy);
    setFormData({
      product: formData.product,
      targetClient: strategy.targetAudience,
      platforms: [strategy.platform]
    });
    setActiveTab('custom');
  };

  const generateClientFinder = async () => {
    // Validate required fields
    if (!formData.product.trim() || !formData.targetClient.trim()) {
      alert('لطفاً محصول و مخاطب هدف را وارد کنید');
      return;
    }

    if (!isAPIConnected) {
      alert('اتصال به سرور برقرار نیست. لطفاً دوباره تلاش کنید.');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🚀 Generating client finder with ChatGPT...');
      const response = await apiService.generateClientFinder({
        product: formData.product,
        target_client: formData.targetClient,
        platforms: formData.platforms
      });

      if (response.success && response.data) {
        console.log('✅ Client finder generated successfully:', response.data);
        setResult(response.data);
      } else {
        console.error('❌ Failed to generate client finder:', response.error);
        
        // Check if it's a rate limit error
        let errorMessage = 'خطا در تولید راهنمای یافتن مشتری: ' + (response.error || 'خطای نامشخص');
        if (response.error && response.error.includes('محدودیت سه تا سوال')) {
          errorMessage = '⚠️ ' + response.error;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error generating client finder:', error);
      
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

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        platforms: [...formData.platforms, platform]
      });
    } else {
      setFormData({
        ...formData,
        platforms: formData.platforms.filter(p => p !== platform)
      });
    }
  };

  return (
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
            <div className="w-16 h-16 bg-gradient-to-br from-monetize-warning-600 via-monetize-warning-700 to-monetize-danger-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Search size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">یابنده مشتری فوری</h1>
              <p className="text-gray-400">اولین مشتریان خود را پیدا کنید</p>
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
                  ? 'bg-monetize-warning-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              جستجوی سفارشی
            </button>
            <button
              onClick={() => setActiveTab('strategies')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'strategies'
                  ? 'bg-monetize-warning-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              استراتژی‌های آماده
            </button>
          </div>
        </div>

        {activeTab === 'strategies' ? (
          /* Strategies Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clientStrategies.map((strategy) => {
              const IconComponent = strategy.icon;
              return (
                <div
                  key={strategy.id}
                  className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60 hover:border-monetize-warning-500/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
                  style={{ backgroundColor: '#10091D' }}
                  onClick={() => selectStrategy(strategy)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${strategy.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{strategy.title}</h3>
                      <span className="text-xs px-2 py-1 bg-monetize-warning-500/20 text-monetize-warning-400 rounded-lg">
                        {strategy.platform}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{strategy.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={14} className="text-monetize-warning-400" />
                        <span className="text-xs text-gray-400">نرخ موفقیت</span>
                      </div>
                      <p className="text-white text-xs font-medium">{strategy.successRate}</p>
                    </div>
                    
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-blue-400" />
                        <span className="text-xs text-gray-400">زمان</span>
                      </div>
                      <p className="text-white text-xs font-medium">{strategy.timeFrame}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">هزینه:</span>
                      <span className="text-green-400 text-xs font-medium">{strategy.cost}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-monetize-warning-400" />
                      <span className="text-white text-xs">{strategy.targetAudience}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800/30 pt-4">
                    <p className="text-gray-400 text-xs mb-2">مراحل کلیدی:</p>
                    <div className="space-y-1">
                      {strategy.steps.slice(0, 2).map((step, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                          <div className="w-1.5 h-1.5 bg-monetize-warning-400 rounded-full flex-shrink-0"></div>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 py-2 bg-monetize-warning-500/20 hover:bg-monetize-warning-500/30 text-monetize-warning-400 rounded-xl transition-colors duration-300 text-sm font-medium">
                    انتخاب استراتژی
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50" style={{ backgroundColor: '#10091D' }}>
              <h2 className="text-xl font-semibold mb-6">اطلاعات کسب‌وکار</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">چه چیزی می‌فروشید؟</label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => setFormData({...formData, product: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-warning-500 focus:ring-1 focus:ring-monetize-warning-500 transition-colors"
                    placeholder="محصول یا خدمت خود را توصیف کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">مخاطب هدف شما کیست؟</label>
                  <input
                    type="text"
                    value={formData.targetClient}
                    onChange={(e) => setFormData({...formData, targetClient: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-warning-500 focus:ring-1 focus:ring-monetize-warning-500 transition-colors"
                    placeholder="مثال: کارآفرینان، دانشجویان، خانواده‌ها"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">پلتفرم‌های مورد نظر</label>
                  <div className="space-y-2">
                    {['Instagram', 'Telegram', 'LinkedIn', 'Email'].map((platform) => (
                      <label key={platform} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.platforms.includes(platform)}
                          onChange={(e) => handlePlatformChange(platform, e.target.checked)}
                          className="w-4 h-4 text-monetize-warning-500 bg-gray-700 border-gray-600 rounded focus:ring-monetize-warning-500"
                        />
                        <span className="text-gray-300">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={generateClientFinder}
                  disabled={isGenerating}
                  className="w-full py-3 bg-monetize-warning-600 hover:bg-monetize-warning-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      در حال جستجو...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      یافتن مشتری
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50" style={{ backgroundColor: '#10091D' }}>
              {result ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                  <h2 className="text-xl font-semibold mb-6">راهنمای یافتن مشتری</h2>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-orange-500 font-bold mb-3 flex items-center gap-2">
                      <Target size={18} className="text-orange-500" />
                      3 کانال برتر یافتن مشتری
                    </h4>
                    <div className="space-y-3">
                      {result.channels.map((channel: any, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/40 rounded-lg border border-gray-600/30">
                          <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="text-white font-medium">{channel.name}</h5>
                            <p className="text-gray-300 text-sm">{channel.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-orange-500 font-bold mb-3 flex items-center gap-2">
                      <MessageCircle size={18} className="text-orange-500" />
                      پیام ارتباط پیشنهادی
                    </h4>
                    <div className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/30">
                      <p className="text-gray-200 italic leading-relaxed">"{result.outreachMessage}"</p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-orange-500 font-bold mb-3 flex items-center gap-2">
                      <Hash size={18} className="text-orange-500" />
                      هشتگ‌های پیشنهادی
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.hashtags.map((hashtag: string, index: number) => (
                        <span key={index} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30 shadow-lg">
                    <h4 className="text-orange-500 font-bold mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-orange-500" />
                      برنامه عملیاتی ۳ روزه
                    </h4>
                    <div className="space-y-3">
                      {result.actionPlan.map((action: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-200 font-medium">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Copy size={16} />
                      کپی
                    </button>
                    <button
                      onClick={() => downloadAsText(JSON.stringify(result, null, 2), 'client-finder.txt')}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={16} />
                      دانلود
                    </button>
                    <button
                      onClick={generateClientFinder}
                      className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                      <Search size={24} />
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
  );
};

export default ClientFinderAI;