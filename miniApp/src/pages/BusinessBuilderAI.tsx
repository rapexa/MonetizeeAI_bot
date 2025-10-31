import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';
import AIToolSubscriptionCard from '../components/AIToolSubscriptionCard';
import { 
  Rocket, 
  Copy, 
  Download, 
  RefreshCw, 
  ArrowLeft,
  ArrowRight,
  Zap,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Globe2,
  Smartphone,
  BookOpen,
  Building2,
  FileText,
  Package,
  User,
  Instagram,
  Palette,
  GraduationCap,
  MessageSquare,
  Search,
  Briefcase,
  Video,
  School,
  Bot,
  TestTube,
  FileCheck,
  Database,
  Target,
  UserCheck,
  BarChart3,
  Megaphone,
  User as UserIcon,
  Clipboard
} from 'lucide-react';

const BusinessBuilderAI: React.FC = () => {
  const navigate = useNavigate();
  const { isAPIConnected, userData } = useApp();
  const [showSubscriptionCard, setShowSubscriptionCard] = React.useState(false);
  const [hasUsedBefore, setHasUsedBefore] = React.useState(false);
  const [formData, setFormData] = React.useState({
    userName: '',
    interests: '',
    skills: '',
    market: ''
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<'custom' | 'ideas'>('custom');
  const [selectedIdea, setSelectedIdea] = React.useState<any>(null);

  // Business Ideas Database
  const businessIdeas = [
    {
      id: 1,
      title: 'سرویس ساخت رزومه هوشمند',
      category: 'فریلنس / شغلی',
      description: 'پلتفرمی برای ساخت رزومه، کاورلتر و لینک رزومه آنلاین',
      targetMarket: 'جویندگان شغل و فریلنسرها',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '10-20 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: User,
      color: 'from-blue-500 to-indigo-600',
      features: ['رزومه PDF', 'پیشنهاد متن خودکار', 'خروجی لینک']
    },
    {
      id: 2,
      title: 'ربات تولید محتوا برای اینستاگرام',
      category: 'بازاریابی',
      description: 'ربات تولید ایده پست، کپشن، هشتگ و زمان انتشار',
      targetMarket: 'صاحبان پیج و کسب‌وکارها',
      startupCost: 'متوسط (10-20 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: Instagram,
      color: 'from-pink-500 to-rose-600',
      features: ['تولید کپشن', 'زمان‌بندی پست', 'ایده روزانه']
    },
    {
      id: 3,
      title: 'سرویس طراحی برند و لوگو با AI',
      category: 'برندینگ',
      description: 'ابزاری برای ساخت هویت برند (اسم، لوگو، رنگ، شعار)',
      targetMarket: 'استارتاپ‌ها و کسب‌وکارهای نوپا',
      startupCost: 'کم (زیر 10 میلیون)',
      revenue: '15-30 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-4 ماه',
      icon: Palette,
      color: 'from-purple-500 to-violet-600',
      features: ['لوگو اتومات', 'انتخاب رنگ', 'پیشنهاد شعار']
    },
    {
      id: 4,
      title: 'پلتفرم آموزش کوتاه مهارت‌های AI',
      category: 'آموزش',
      description: 'مینی‌پلتفرم آموزش مهارت‌های کاربردی هوش مصنوعی',
      targetMarket: 'علاقه‌مندان به AI و کارآفرینان',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '15-25 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: GraduationCap,
      color: 'from-green-500 to-emerald-600',
      features: ['ویدیوهای کوتاه', 'تست آنلاین', 'سرتیفیکیت']
    },
    {
      id: 5,
      title: 'دستیار متن تبلیغاتی و کپشن‌ساز',
      category: 'بازاریابی',
      description: 'AI که برای تبلیغات، صفحه فروش و استوری کپشن می‌سازه',
      targetMarket: 'بازاریابان و صاحبان کسب‌وکار',
      startupCost: 'کم (5-10 میلیون)',
      revenue: '20-35 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: MessageSquare,
      color: 'from-orange-500 to-red-600',
      features: ['متن فروش', 'عنوان جذاب', 'تست CTA']
    },
    {
      id: 6,
      title: 'ربات تحلیل رقبا برای اینستاگرام',
      category: 'مارکتینگ',
      description: 'ابزار بررسی پیج‌های رقیب و استخراج ایده محتوا',
      targetMarket: 'مدیران پیج و بازاریابان',
      startupCost: 'متوسط (10-20 میلیون)',
      revenue: '15-30 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: Search,
      color: 'from-cyan-500 to-blue-600',
      features: ['تحلیل نرخ تعامل', 'استخراج هشتگ', 'گزارش هفتگی']
    },
    {
      id: 7,
      title: 'دستیار انتخاب شغل و مسیر شغلی',
      category: 'شغلی / رشد فردی',
      description: 'پیشنهاد مسیر کاری مناسب براساس مهارت و تیپ شخصیتی',
      targetMarket: 'جویندگان شغل و دانشجویان',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '10-15 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: Briefcase,
      color: 'from-indigo-500 to-purple-600',
      features: ['تست شخصیت', 'مسیر پیشنهادی', 'مشاغل آینده']
    },
    {
      id: 8,
      title: 'اپ تولید ویدیو کوتاه (AI Reel Maker)',
      category: 'محتوا',
      description: 'تبدیل متن به ویدیو کوتاه با صدا و تم آماده',
      targetMarket: 'صاحبان پیج و تولیدکنندگان محتوا',
      startupCost: 'متوسط (15-30 میلیون)',
      revenue: '30-50 میلیون ماهانه',
      difficulty: 'بالا',
      timeToMarket: '3-4 ماه',
      icon: Video,
      color: 'from-red-500 to-pink-600',
      features: ['تبدیل متن به ویدیو', 'زیرنویس اتوماتیک']
    },
    {
      id: 9,
      title: 'پلتفرم ساخت دوره آموزشی هوشمند',
      category: 'آموزش',
      description: 'مدرس‌ها محتوا می‌ذارن، سیستم براشون تست و خلاصه می‌سازه',
      targetMarket: 'مدرسین و آموزشگاه‌ها',
      startupCost: 'متوسط (15-25 میلیون)',
      revenue: '25-50 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '3-4 ماه',
      icon: School,
      color: 'from-teal-500 to-green-600',
      features: ['تست خودکار', 'مرور هوشمند', 'داشبورد مدرس']
    },
    {
      id: 10,
      title: 'ربات پاسخ خودکار دایرکت و واتساپ',
      category: 'فروش',
      description: 'ربات برای پاسخ‌دهی سریع به مشتری و ثبت سفارش',
      targetMarket: 'فروشندگان و صاحبان کسب‌وکار',
      startupCost: 'کم (زیر 10 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '2-3 ماه',
      icon: Bot,
      color: 'from-emerald-500 to-teal-600',
      features: ['پاسخ دایرکت', 'فیلتر سوالات', 'ثبت در CRM']
    },
    {
      id: 11,
      title: 'سرویس تست ایده بازار',
      category: 'کسب‌وکار',
      description: 'ابزار سنجش بازار و ریسک ایده قبل از اجرا',
      targetMarket: 'کارآفرینان و استارتاپ‌ها',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '15-25 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: TestTube,
      color: 'from-yellow-500 to-orange-600',
      features: ['تحلیل ریسک', 'نمره تقاضا', 'بررسی رقبا']
    },
    {
      id: 12,
      title: 'اپ نوشتن پروپوزال و قرارداد با AI',
      category: 'فریلنس',
      description: 'ابزار ساخت پروپوزال و قراردادهای آماده',
      targetMarket: 'فریلنسرها و مشاوران',
      startupCost: 'کم (زیر 10 میلیون)',
      revenue: '20-30 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: FileCheck,
      color: 'from-slate-500 to-gray-600',
      features: ['قالب آماده', 'امضای دیجیتال', 'پیشنهاد قیمت']
    },
    {
      id: 13,
      title: 'پلتفرم مینی‌CRM برای فروشنده‌های کوچک',
      category: 'فروش',
      description: 'مدیریت مشتری‌ها، تسک‌ها و یادآوری‌ها در یک صفحه',
      targetMarket: 'فروشندگان و کسب‌وکارهای کوچک',
      startupCost: 'متوسط (10-20 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-4 ماه',
      icon: Database,
      color: 'from-blue-600 to-indigo-700',
      features: ['وظایف', 'نوتیف یادآوری', 'تگ‌گذاری لید']
    },
    {
      id: 14,
      title: 'ربات ساخت پست آموزشی اینستاگرام',
      category: 'محتوا',
      description: 'تبدیل متن آموزشی به اسلایدهای زیبا',
      targetMarket: 'مدرسین و تولیدکنندگان محتوا',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '15-25 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: Target,
      color: 'from-violet-500 to-purple-600',
      features: ['قالب اسلاید', 'کپشن آموزشی', 'خروجی PNG']
    },
    {
      id: 15,
      title: 'سرویس ساخت سایت شخصی هوشمند',
      category: 'وب / پرسونال برندینگ',
      description: 'تبدیل رزومه و اطلاعات کاربر به سایت آماده',
      targetMarket: 'فریلنسرها و متخصصان',
      startupCost: 'متوسط (10-20 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: UserCheck,
      color: 'from-rose-500 to-pink-600',
      features: ['قالب آماده', 'فرم تماس', 'هاست ساده']
    },
    {
      id: 16,
      title: 'اپ ساخت کتاب یا ای‌بوک خودکار',
      category: 'محتوا',
      description: 'تولید کتاب دیجیتال از روی موضوع، با طراحی جلد',
      targetMarket: 'نویسندگان و تولیدکنندگان محتوا',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '15-30 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: BookOpen,
      color: 'from-amber-500 to-yellow-600',
      features: ['تولید محتوا', 'ساخت جلد', 'دانلود PDF']
    },
    {
      id: 17,
      title: 'پلتفرم تحلیل فروش و رفتار مشتری',
      category: 'فروش / داده',
      description: 'آنالیز رفتار مشتری‌ها و پیشنهاد بهبود روند فروش',
      targetMarket: 'فروشندگان و مدیران فروش',
      startupCost: 'متوسط (15-25 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '3-4 ماه',
      icon: BarChart3,
      color: 'from-green-600 to-emerald-700',
      features: ['تحلیل روند', 'گزارش ماهانه', 'توصیه فروش']
    },
    {
      id: 18,
      title: 'سیستم ساخت کمپین تبلیغاتی هوشمند',
      category: 'بازاریابی',
      description: 'پیشنهاد متن تبلیغ، بودجه و زمان اجرای کمپین',
      targetMarket: 'بازاریابان و مدیران مارکتینگ',
      startupCost: 'کم (زیر 10 میلیون)',
      revenue: '25-45 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: Megaphone,
      color: 'from-orange-600 to-red-700',
      features: ['پیشنهاد کانال', 'بودجه', 'هدف‌گذاری کمپین']
    },
    {
      id: 19,
      title: 'اپ ساخت پرسونا مشتری',
      category: 'مارکتینگ',
      description: 'AI برای ساخت پرسونای دقیق مشتری از چند سؤال',
      targetMarket: 'بازاریابان و صاحبان کسب‌وکار',
      startupCost: 'کم (زیر 5 میلیون)',
      revenue: '15-25 میلیون ماهانه',
      difficulty: 'پایین',
      timeToMarket: '1-2 ماه',
      icon: UserIcon,
      color: 'from-sky-500 to-blue-600',
      features: ['تست رفتار مشتری', 'پروفایل خروجی', 'پیشنهاد کانال فروش']
    },
    {
      id: 20,
      title: 'پلتفرم ساخت گزارش عملکرد کسب‌وکار',
      category: 'مدیریت',
      description: 'ایجاد گزارش گرافیکی از فروش، تسک‌ها و نتایج تیم',
      targetMarket: 'مدیران و صاحبان کسب‌وکار',
      startupCost: 'متوسط (10-20 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-3 ماه',
      icon: Clipboard,
      color: 'from-indigo-600 to-purple-700',
      features: ['داشبورد داده', 'خروجی PDF', 'نمودارهای هوشمند']
    }
  ];

  const selectBusinessIdea = (idea: any) => {
    setSelectedIdea(idea);
    setFormData({
      userName: formData.userName,
      interests: idea.category,
      skills: idea.features.join(', '),
      market: idea.targetMarket
    });
    setActiveTab('custom');
  };

  const generateBusinessPlan = async () => {
    // Validate required fields
    if (!formData.userName.trim() || !formData.interests.trim() || !formData.market.trim()) {
      alert('لطفاً نام، علاقه‌مندی‌ها و بازار هدف را وارد کنید');
      return;
    }

    if (!isAPIConnected) {
      alert('اتصال به سرور برقرار نیست. لطفاً دوباره تلاش کنید.');
      return;
    }

    // Check if free_trial user has already used this tool
    if (isFreeTrial) {
      const toolKey = 'business_builder_used';
      const hasUsed = localStorage.getItem(toolKey) === 'true';
      if (hasUsed) {
        setShowSubscriptionCard(true);
        return;
      }
    }

    setIsGenerating(true);
    try {
      console.log('🚀 Generating business plan with ChatGPT...');
      const response = await apiService.generateBusinessPlan({
        user_name: formData.userName,
        interests: formData.interests,
        skills: formData.skills || '',
        market: formData.market
      });

      if (response.success && response.data) {
        console.log('✅ Business plan generated successfully:', response.data);
        setResult(response.data);
        
        // Check if user has used this tool before (only for free_trial)
        if (isFreeTrial) {
          const toolKey = 'business_builder_used';
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
        console.error('❌ Failed to generate business plan:', response.error);
        
        // Check if it's a rate limit error
        let errorMessage = 'خطا در تولید طرح کسب‌وکار: ' + (response.error || 'خطای نامشخص');
        if (response.error && response.error.includes('محدودیت سه تا سوال')) {
          errorMessage = '⚠️ ' + response.error;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error generating business plan:', error);
      
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
  
  // Check if free_trial user has already used this tool and redirect if needed
  React.useEffect(() => {
    if (isFreeTrial) {
      const toolKey = 'business_builder_used';
      const hasUsed = localStorage.getItem(toolKey) === 'true';
      if (hasUsed) {
        console.log('🚫 Free trial user already used Business Builder AI - redirecting...');
        navigate('/tools');
      }
    }
  }, [isFreeTrial, navigate]);
  
  // Check if user has used this tool before (on mount) - only for free_trial
  React.useEffect(() => {
    if (result && isFreeTrial) {
      const toolKey = 'business_builder_used';
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
            <div className="w-16 h-16 bg-gradient-to-br from-monetize-primary-600 via-monetize-primary-700 to-monetize-primary-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Rocket size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">سازنده کسب‌وکار ۱ دقیقه‌ای</h1>
              <p className="text-gray-400">بیایید کسب‌وکارتان را در ۶۰ ثانیه بسازیم!</p>
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
                  ? 'bg-monetize-primary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ساخت سفارشی
            </button>
            <button
              onClick={() => setActiveTab('ideas')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'ideas'
                  ? 'bg-monetize-primary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ایده‌های آماده
            </button>
          </div>
        </div>

        {activeTab === 'ideas' ? (
          /* Business Ideas Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {businessIdeas.map((idea) => {
              const IconComponent = idea.icon;
              return (
                <div
                  key={idea.id}
                  className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60 hover:border-monetize-primary-500/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
                  style={{ backgroundColor: '#10091D' }}
                  onClick={() => selectBusinessIdea(idea)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${idea.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{idea.title}</h3>
                      <span className="text-xs px-2 py-1 bg-monetize-primary-500/20 text-monetize-primary-400 rounded-lg">
                        {idea.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{idea.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} className="text-green-400" />
                        <span className="text-xs text-gray-400">سرمایه</span>
                      </div>
                      <p className="text-white text-xs font-medium">{idea.startupCost}</p>
                    </div>
                    
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-blue-400" />
                        <span className="text-xs text-gray-400">درآمد</span>
                      </div>
                      <p className="text-white text-xs font-medium">{idea.revenue}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">سختی:</span>
                      <span className={`text-xs font-medium ${
                        idea.difficulty === 'آسان' ? 'text-green-400' :
                        idea.difficulty === 'متوسط' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {idea.difficulty}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">زمان:</span>
                      <span className="text-white text-xs">{idea.timeToMarket}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800/30 pt-4">
                    <p className="text-gray-400 text-xs mb-2">ویژگی‌های کلیدی:</p>
                    <div className="space-y-1">
                      {idea.features.slice(0, 2).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                          <CheckCircle size={12} className="text-monetize-primary-400 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 py-2 bg-monetize-primary-500/20 hover:bg-monetize-primary-500/30 text-monetize-primary-400 rounded-xl transition-colors duration-300 text-sm font-medium">
                    انتخاب ایده
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
              <h2 className="text-xl font-semibold mb-6">اطلاعات شما</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">نام یا نام کاربری</label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({...formData, userName: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-primary-500 focus:ring-1 focus:ring-monetize-primary-500 transition-colors"
                    placeholder="نام خود را وارد کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">علاقه‌مندی‌ها</label>
                  <input
                    type="text"
                    value={formData.interests}
                    onChange={(e) => setFormData({...formData, interests: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-primary-500 focus:ring-1 focus:ring-monetize-primary-500 transition-colors"
                    placeholder="فناوری، آشپزی، ورزش (با کاما جدا کنید)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">مهارت‌ها (اختیاری)</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({...formData, skills: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-primary-500 focus:ring-1 focus:ring-monetize-primary-500 transition-colors"
                    placeholder="برنامه‌نویسی، طراحی، فروش"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">بازار هدف</label>
                  <input
                    type="text"
                    value={formData.market}
                    onChange={(e) => setFormData({...formData, market: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-primary-500 focus:ring-1 focus:ring-monetize-primary-500 transition-colors"
                    placeholder="دانشجویان، کارآفرینان، خانواده‌ها"
                  />
                </div>
                <button
                  onClick={generateBusinessPlan}
                  disabled={isGenerating}
                  className="w-full py-3 bg-monetize-primary-600 hover:bg-monetize-primary-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Rocket size={20} />
                      ساخت کسب‌وکار
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
              {result ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                  <h2 className="text-xl font-semibold mb-6">نتیجه تولید شده</h2>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                      <Building2 size={18} className="text-blue-500" />
                      نام کسب‌وکار
                    </h4>
                    <p className="text-white text-xl font-bold mb-2">{result.businessName}</p>
                    <p className="text-gray-300 text-sm">{result.tagline}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                      <FileText size={18} className="text-blue-500" />
                      توضیحات
                    </h4>
                    <p className="text-gray-200 leading-relaxed">{result.description}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                      <Users size={18} className="text-blue-500" />
                      مخاطب هدف
                    </h4>
                    <p className="text-gray-200 font-medium">{result.targetAudience}</p>
                  </div>
                  
                  {isFreeTrial ? (
                    <>
                      {hasUsedBefore ? (
                        <>
                          <div className="relative">
                            <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg blur-[2px] pointer-events-none">
                              <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                                <Package size={18} className="text-blue-500" />
                                محصولات/خدمات
                              </h4>
                              <ul className="text-gray-200 space-y-2">
                                {result.products.map((product: string, index: number) => (
                                  <li key={index} className="flex items-center gap-3">
                                    <CheckCircle size={16} className="text-blue-500 flex-shrink-0" />
                                    <span className="font-medium">{product}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={() => setShowSubscriptionCard(true)}>
                              <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
                                <span className="text-white text-sm font-medium">برای مشاهده کامل کلیک کنید</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative">
                            <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg blur-[2px] pointer-events-none">
                              <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                                <DollarSign size={18} className="text-blue-500" />
                                روش‌های درآمدزایی
                              </h4>
                              <ul className="text-gray-200 space-y-2">
                                {result.monetization.map((method: string, index: number) => (
                                  <li key={index} className="flex items-center gap-3">
                                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                                    <span className="font-medium">{method}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={() => setShowSubscriptionCard(true)}>
                              <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
                                <span className="text-white text-sm font-medium">برای مشاهده کامل کلیک کنید</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative">
                            <div className="bg-gradient-to-r from-[#5a189a]/20 to-purple-500/20 rounded-xl p-4 border border-[#5a189a]/30 shadow-lg blur-[2px] pointer-events-none">
                              <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                                <Zap size={18} className="text-blue-500" />
                                اولین قدم امروز
                              </h4>
                              <p className="text-gray-200 font-medium">{result.firstAction}</p>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={() => setShowSubscriptionCard(true)}>
                              <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
                                <span className="text-white text-sm font-medium">برای مشاهده کامل کلیک کنید</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                            <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                              <Package size={18} className="text-blue-500" />
                              محصولات/خدمات
                            </h4>
                            <ul className="text-gray-200 space-y-2">
                              {result.products.map((product: string, index: number) => (
                                <li key={index} className="flex items-center gap-3">
                                  <CheckCircle size={16} className="text-blue-500 flex-shrink-0" />
                                  <span className="font-medium">{product}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                            <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                              <DollarSign size={18} className="text-blue-500" />
                              روش‌های درآمدزایی
                            </h4>
                            <ul className="text-gray-200 space-y-2">
                              {result.monetization.map((method: string, index: number) => (
                                <li key={index} className="flex items-center gap-3">
                                  <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                                  <span className="font-medium">{method}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="bg-gradient-to-r from-[#5a189a]/20 to-purple-500/20 rounded-xl p-4 border border-[#5a189a]/30 shadow-lg">
                            <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                              <Zap size={18} className="text-blue-500" />
                              اولین قدم امروز
                            </h4>
                            <p className="text-gray-200 font-medium">{result.firstAction}</p>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                        <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                          <Package size={18} className="text-blue-500" />
                          محصولات/خدمات
                        </h4>
                        <ul className="text-gray-200 space-y-2">
                          {result.products.map((product: string, index: number) => (
                            <li key={index} className="flex items-center gap-3">
                              <CheckCircle size={16} className="text-blue-500 flex-shrink-0" />
                              <span className="font-medium">{product}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                        <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                          <DollarSign size={18} className="text-blue-500" />
                          روش‌های درآمدزایی
                        </h4>
                        <ul className="text-gray-200 space-y-2">
                          {result.monetization.map((method: string, index: number) => (
                            <li key={index} className="flex items-center gap-3">
                              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                              <span className="font-medium">{method}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-gradient-to-r from-[#5a189a]/20 to-purple-500/20 rounded-xl p-4 border border-[#5a189a]/30 shadow-lg">
                        <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2">
                          <Zap size={18} className="text-blue-500" />
                          اولین قدم امروز
                        </h4>
                        <p className="text-gray-200 font-medium">{result.firstAction}</p>
                      </div>
                    </>
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
                      onClick={() => downloadAsText(JSON.stringify(result, null, 2), 'business-plan.txt')}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={16} />
                      دانلود
                    </button>
                    <button
                      onClick={generateBusinessPlan}
                      className="py-2 px-4 bg-[#5a0ecc] hover:bg-[#5a0ecc]/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                      <Rocket size={24} />
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

export default BusinessBuilderAI;