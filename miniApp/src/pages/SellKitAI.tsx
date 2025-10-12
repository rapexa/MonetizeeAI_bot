import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  Copy, 
  Download, 
  RefreshCw, 
  ArrowLeft,
  Gift,
  CheckCircle,
  ShoppingBag,
  Layers,
  Globe,
  BookOpen,
  Zap,
  Megaphone,
  FileText,
  Instagram,
  Palette,
  Bot,
  User,
  GraduationCap,
  FileEdit,
  BarChart3,
  Monitor,
  Lightbulb,
  Calendar,
  Briefcase,
  CreditCard,
  Target,
  Video,
  MessageSquare,
  Search,
  Mail,
  TrendingUp,
  FileCheck,
  Eye,
  PenTool,
  School
} from 'lucide-react';

const SellKitAI: React.FC = () => {
  const navigate = useNavigate();
  const { isAPIConnected } = useApp();
  const [formData, setFormData] = React.useState({
    productName: '',
    description: '',
    targetAudience: '',
    benefits: ''
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<'custom' | 'ready'>('custom');
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

  // Ready Services Database
  const readyProducts = [
    {
      id: 1,
      name: 'سرویس تولید پست و کپشن اینستاگرام با AI',
      category: 'بازاریابی',
      description: 'تولید پست، کپشن، هشتگ و ایده روزانه برای پیج‌ها',
      targetAudience: 'پیج‌های تجاری، کوچ‌ها، فروشگاه‌ها',
      price: '399,000 تومان',
      benefits: ['تولید روزانه محتوا', 'افزایش تعامل پیج'],
      icon: Instagram,
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 2,
      name: 'سرویس طراحی برند (نام + لوگو + رنگ + شعار)',
      category: 'برندینگ',
      description: 'ساخت کامل هویت برند برای پیج یا بیزینس کوچک',
      targetAudience: 'استارتاپ‌ها و فریلنسرها',
      price: '799,000 تومان',
      benefits: ['طراحی هویت بصری', 'برندبوک اختصاصی'],
      icon: Palette,
      color: 'from-purple-500 to-violet-600'
    },
    {
      id: 3,
      name: 'ربات پاسخ خودکار دایرکت و واتساپ',
      category: 'فروش',
      description: 'ساخت ربات پیام‌رسان که پاسخ مشتری رو اتومات میده',
      targetAudience: 'فروشنده‌های آنلاین',
      price: '299,000 تومان',
      benefits: ['پاسخ 24 ساعته', 'افزایش نرخ بستن فروش'],
      icon: Bot,
      color: 'from-emerald-500 to-teal-600'
    },
    {
      id: 4,
      name: 'سرویس رزومه و کاورلتر حرفه‌ای (ResumeX)',
      category: 'شغلی',
      description: 'ساخت رزومه، کاورلتر و پروفایل لینکدین حرفه‌ای',
      targetAudience: 'کارجوها و دانشجوها',
      price: '249,000 تومان',
      benefits: ['طراحی مدرن رزومه', 'متن آماده مخصوص هر موقعیت'],
      icon: User,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 5,
      name: 'سرویس تولید محتوای آموزشی و پست اسلایدی',
      category: 'محتوا',
      description: 'تولید اسلاید آموزشی آماده انتشار برای پیج‌ها',
      targetAudience: 'پیج‌های آموزشی و مربیان',
      price: '499,000 تومان',
      benefits: ['طراحی پست آماده', 'متن آموزشی دقیق'],
      icon: GraduationCap,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 6,
      name: 'سرویس نوشتن صفحه فروش حرفه‌ای با AI',
      category: 'فروش',
      description: 'نوشتن متن جذاب برای لندینگ یا صفحه محصول',
      targetAudience: 'سازندگان دوره، فروشگاه‌ها',
      price: '699,000 تومان',
      benefits: ['متن روان و قانع‌کننده', 'ساخت CTA هدفمند'],
      icon: FileEdit,
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 7,
      name: 'سرویس تحلیل و بهبود پیج اینستاگرام',
      category: 'مارکتینگ',
      description: 'بررسی پیج، پیشنهاد محتوا، کپشن و تقویم پست',
      targetAudience: 'برندهای کوچک و فریلنسرها',
      price: '349,000 تومان',
      benefits: ['تحلیل کامل تعامل', 'برنامه محتوایی 14 روزه'],
      icon: BarChart3,
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 8,
      name: 'سرویس ساخت لندینگ پیج محصول با AI',
      category: 'طراحی وب',
      description: 'ایجاد لندینگ پیج حرفه‌ای برای معرفی سرویس',
      targetAudience: 'بیزینس‌های خدماتی',
      price: '699,000 تومان',
      benefits: ['طراحی ریسپانسیو', 'بهینه برای تبدیل فروش'],
      icon: Monitor,
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 9,
      name: 'سرویس ساخت نام برند + دامنه پیشنهادی',
      category: 'برندینگ',
      description: 'پیشنهاد نام، دامنه و هویت اولیه برند',
      targetAudience: 'کارآفرینان تازه‌کار',
      price: '199,000 تومان',
      benefits: ['پیشنهاد نام خلاق', 'بررسی دامنه آزاد'],
      icon: Lightbulb,
      color: 'from-yellow-500 to-orange-600'
    },
    {
      id: 10,
      name: 'دستیار نوشتن تبلیغات و متن‌های تبلیغاتی',
      category: 'تبلیغات',
      description: 'تولید متن تبلیغات، بنر، کپشن و ویدیو اد',
      targetAudience: 'فروشگاه‌ها و آژانس‌ها',
      price: '399,000 تومان',
      benefits: ['متن فروش روان', 'افزایش CTR تبلیغات'],
      icon: Megaphone,
      color: 'from-red-500 to-pink-600'
    },
    {
      id: 11,
      name: 'پک ایده کسب‌وکارهای پول‌ساز با AI',
      category: 'کارآفرینی',
      description: 'مجموعه‌ای از ایده‌های تست‌شده با آموزش اجرا',
      targetAudience: 'تازه‌کارها',
      price: '299,000 تومان',
      benefits: ['ایده واقعی + تمرین اجرا', 'مسیر قدم‌به‌قدم راه‌اندازی'],
      icon: Briefcase,
      color: 'from-slate-500 to-gray-600'
    },
    {
      id: 12,
      name: 'سرویس تولید تقویم محتوایی ماهانه',
      category: 'بازاریابی محتوا',
      description: 'AI تقویم پست، کپشن و ایده روزانه می‌سازه',
      targetAudience: 'مدیران محتوا',
      price: '449,000 تومان',
      benefits: ['ایده روزانه 30 روزه', 'نظم در انتشار محتوا'],
      icon: Calendar,
      color: 'from-teal-500 to-green-600'
    },
    {
      id: 13,
      name: 'پلتفرم ساخت پروپوزال فریلنسری',
      category: 'فریلنس',
      description: 'نوشتن پیشنهاد همکاری و قیمت پروژه با AI',
      targetAudience: 'فریلنسرها و آژانس‌ها',
      price: '299,000 تومان',
      benefits: ['پیشنهاد آماده', 'تنظیم بر اساس پروژه'],
      icon: FileCheck,
      color: 'from-blue-600 to-indigo-700'
    },
    {
      id: 14,
      name: 'سرویس طراحی لوگو و کارت ویزیت هوشمند',
      category: 'گرافیک',
      description: 'طراحی اتومات لوگو + کارت ویزیت بر اساس برند',
      targetAudience: 'بیزینس‌های نوپا',
      price: '249,000 تومان',
      benefits: ['طراحی فوری', 'خروجی آماده چاپ'],
      icon: CreditCard,
      color: 'from-violet-500 to-purple-600'
    },
    {
      id: 15,
      name: 'ربات تولید ایده‌های تبلیغاتی و کمپین فروش',
      category: 'مارکتینگ',
      description: 'ایده‌سازی برای تبلیغات خلاقانه',
      targetAudience: 'مدیران مارکتینگ',
      price: '399,000 تومان',
      benefits: ['ایده بنر و ویدیو', 'متن تبلیغ آماده'],
      icon: Target,
      color: 'from-rose-500 to-pink-600'
    },
    {
      id: 16,
      name: 'سرویس طراحی پست معرفی محصول',
      category: 'طراحی / فروش',
      description: 'طراحی و کپشن آماده برای معرفی محصول جدید',
      targetAudience: 'فروشگاه‌ها',
      price: '299,000 تومان',
      benefits: ['طراحی چشمگیر', 'افزایش نرخ تبدیل'],
      icon: ShoppingBag,
      color: 'from-amber-500 to-yellow-600'
    },
    {
      id: 17,
      name: 'سرویس تولید گزارش عملکرد ماهانه برای بیزینس‌ها',
      category: 'مدیریت',
      description: 'ساخت گزارش فروش و رشد با طراحی حرفه‌ای',
      targetAudience: 'مدیران استارتاپ‌ها',
      price: '499,000 تومان',
      benefits: ['نمودار رشد', 'گزارش PDF آماده'],
      icon: TrendingUp,
      color: 'from-green-600 to-emerald-700'
    },
    {
      id: 18,
      name: 'اپ ساخت ویدیوهای معرفی برند (AI Promo Video)',
      category: 'ویدیو مارکتینگ',
      description: 'تبدیل متن برند به ویدیوی معرفی کوتاه',
      targetAudience: 'پیج‌ها و برندهای کوچک',
      price: '599,000 تومان',
      benefits: ['ساخت خودکار ویدیو', 'شخصی‌سازی رنگ و لوگو'],
      icon: Video,
      color: 'from-red-600 to-pink-700'
    },
    {
      id: 19,
      name: 'سرویس ساخت بایو حرفه‌ای برای اینستاگرام',
      category: 'شبکه‌های اجتماعی',
      description: 'نوشتن بایو هوشمند با لحن خاص برند',
      targetAudience: 'کوچ‌ها، فروشنده‌ها',
      price: '99,000 تومان',
      benefits: ['بایو خلاق و هدفمند', 'پیشنهاد CTA بایو'],
      icon: MessageSquare,
      color: 'from-sky-500 to-blue-600'
    },
    {
      id: 20,
      name: 'پلتفرم تحلیل سایت و پیشنهاد بهبود سئو',
      category: 'دیجیتال مارکتینگ',
      description: 'تحلیل سایت و پیشنهاد کلمات کلیدی هدفمند',
      targetAudience: 'وبمسترها',
      price: '399,000 تومان',
      benefits: ['نمره سئو', 'پیشنهاد بهبود عنوان‌ها'],
      icon: Search,
      color: 'from-indigo-600 to-purple-700'
    },
    {
      id: 21,
      name: 'سرویس تولید پست لینکدین برای متخصصان',
      category: 'محتوا',
      description: 'تولید متن‌های لینکدینی تخصصی و الهام‌بخش',
      targetAudience: 'مدیران، متخصصان، کارجوها',
      price: '249,000 تومان',
      benefits: ['پست‌های تحلیلی', 'افزایش دیده‌شدن در لینکدین'],
      icon: Globe,
      color: 'from-blue-700 to-indigo-800'
    },
    {
      id: 22,
      name: 'سرویس ساخت ایمیل مارکتینگ با متن فروشنده‌ساز',
      category: 'بازاریابی',
      description: 'نوشتن متن‌های ایمیل حرفه‌ای برای جذب مشتری',
      targetAudience: 'فروشگاه‌ها و برندها',
      price: '399,000 تومان',
      benefits: ['متن فروش با CTA', 'ساخت قالب ایمیل'],
      icon: Mail,
      color: 'from-orange-600 to-red-700'
    },
    {
      id: 23,
      name: 'سرویس طراحی پست‌های وایرال (Viral Post Maker)',
      category: 'محتوا',
      description: 'ایده‌سازی برای پست‌های وایرال و انگیزشی',
      targetAudience: 'پیج‌های انگیزشی و بیزینسی',
      price: '299,000 تومان',
      benefits: ['ایده روزانه وایرال', 'طراحی اسلاید آماده'],
      icon: Eye,
      color: 'from-purple-600 to-violet-700'
    },
    {
      id: 24,
      name: 'سرویس تحلیل و بازنویسی کپشن برای افزایش فروش',
      category: 'فروش / مارکتینگ',
      description: 'بازنویسی کپشن‌ها برای نرخ تبدیل بالاتر',
      targetAudience: 'پیج‌های فروش',
      price: '249,000 تومان',
      benefits: ['اصلاح لحن فروش', 'افزایش انگیزش خرید'],
      icon: PenTool,
      color: 'from-emerald-600 to-teal-700'
    },
    {
      id: 25,
      name: 'سرویس ساخت پکیج آموزشی دیجیتال',
      category: 'آموزش',
      description: 'AI کمک می‌کنه دوره آموزشی کاربر با ساختار حرفه‌ای طراحی بشه',
      targetAudience: 'مدرسان و کوچ‌ها',
      price: '699,000 تومان',
      benefits: ['ساخت سرفصل خودکار', 'طراحی صفحه معرفی دوره'],
      icon: School,
      color: 'from-teal-600 to-green-700'
    }
  ];

  const selectReadyProduct = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      productName: product.name,
      description: product.description,
      targetAudience: product.targetAudience,
      benefits: product.benefits.join(', ')
    });
    setActiveTab('custom');
  };

  const generateSellKit = async () => {
    // Validate required fields
    if (!formData.productName.trim() || !formData.description.trim() || !formData.targetAudience.trim()) {
      alert('لطفاً نام محصول، توضیحات و مخاطب هدف را وارد کنید');
      return;
    }

    if (!isAPIConnected) {
      alert('اتصال به سرور برقرار نیست. لطفاً دوباره تلاش کنید.');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🚀 Generating sell kit with ChatGPT...');
      const response = await apiService.generateSellKit({
        product_name: formData.productName,
        description: formData.description,
        target_audience: formData.targetAudience,
        benefits: formData.benefits || ''
      });

      if (response.success && response.data) {
        console.log('✅ Sell kit generated successfully:', response.data);
        setResult(response.data);
      } else {
        console.error('❌ Failed to generate sell kit:', response.error);
        
        // Check if it's a rate limit error
        let errorMessage = 'خطا در تولید کیت فروش: ' + (response.error || 'خطای نامشخص');
        if (response.error && response.error.includes('محدودیت سه تا سوال')) {
          errorMessage = '⚠️ ' + response.error;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error generating sell kit:', error);
      
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
            <div className="w-16 h-16 bg-gradient-to-br from-monetize-success-600 via-monetize-success-700 to-monetize-success-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Package size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">پکیج محصول آماده فروش</h1>
              <p className="text-gray-400">تولید بسته فروش حرفه‌ای با AI</p>
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
                  ? 'bg-monetize-success-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ساخت سفارشی
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'ready'
                  ? 'bg-monetize-success-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              سرویس‌های آماده
            </button>
          </div>
        </div>

        {activeTab === 'ready' ? (
          /* Ready Products Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {readyProducts.map((product) => {
              const IconComponent = product.icon;
              return (
                <div
                  key={product.id}
                  className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60 hover:border-monetize-success-500/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
                  style={{ backgroundColor: '#10091D' }}
                  onClick={() => selectReadyProduct(product)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${product.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
                      <span className="text-xs px-2 py-1 bg-monetize-success-500/20 text-monetize-success-400 rounded-lg">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{product.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">مخاطب هدف:</span>
                      <span className="text-white text-sm">{product.targetAudience}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">قیمت پیشنهادی:</span>
                      <span className="text-monetize-success-400 font-bold">{product.price}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-800/30">
                    <p className="text-gray-400 text-xs mb-2">مزایای کلیدی:</p>
                    <div className="space-y-1">
                      {product.benefits.slice(0, 2).map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                          <CheckCircle size={12} className="text-monetize-success-400 flex-shrink-0" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 py-2 bg-monetize-success-500/20 hover:bg-monetize-success-500/30 text-monetize-success-400 rounded-xl transition-colors duration-300 text-sm font-medium">
                    انتخاب و شروع
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
              <h2 className="text-xl font-semibold mb-6">اطلاعات محصول</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">نام محصول</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-success-500 focus:ring-1 focus:ring-monetize-success-500 transition-colors"
                    placeholder="نام محصول خود را وارد کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">توضیحات کوتاه</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-success-500 focus:ring-1 focus:ring-monetize-success-500 transition-colors"
                    placeholder="محصول شما چه مشکلی را حل می‌کند؟"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">مخاطب هدف</label>
                  <input
                    type="text"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-success-500 focus:ring-1 focus:ring-monetize-success-500 transition-colors"
                    placeholder="مثال: کارآفرینان، دانشجویان"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">مزایای اصلی (اختیاری)</label>
                  <input
                    type="text"
                    value={formData.benefits}
                    onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                    className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-success-500 focus:ring-1 focus:ring-monetize-success-500 transition-colors"
                    placeholder="مزایای محصول خود را با کاما جدا کنید"
                  />
                </div>
                <button
                  onClick={generateSellKit}
                  disabled={isGenerating}
                  className="w-full py-3 bg-monetize-success-600 hover:bg-monetize-success-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Package size={20} />
                      ایجاد کیت فروش
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
              {result ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                  <h2 className="text-xl font-semibold mb-6">کیت فروش تولید شده</h2>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-green-500 font-bold mb-3 flex items-center gap-2">
                      <Megaphone size={18} className="text-green-500" />
                      عنوان بازاریابی
                    </h4>
                    <p className="text-white text-xl font-bold mb-2">{result.title}</p>
                    <p className="text-gray-300 text-sm">{result.headline}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl p-4 border border-gray-600/30 shadow-lg">
                    <h4 className="text-green-500 font-bold mb-3 flex items-center gap-2">
                      <FileText size={18} className="text-green-500" />
                      توضیحات متقاعدکننده
                    </h4>
                    <p className="text-gray-200 leading-relaxed">{result.description}</p>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <h4 className="text-monetize-success-400 font-semibold mb-2">مزایای اصلی</h4>
                    <ul className="text-gray-300 space-y-2">
                      {result.benefits.map((benefit: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle size={16} className="text-monetize-success-400 mt-1 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <h4 className="text-monetize-success-400 font-semibold mb-2">محدوده قیمت پیشنهادی</h4>
                    <p className="text-white text-lg font-medium">{result.priceRange}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-monetize-success-500/20 to-monetize-success-600/20 rounded-xl p-4 border border-monetize-success-500/30">
                    <h4 className="text-monetize-success-400 font-semibold mb-2 flex items-center gap-2">
                      <Gift size={16} />
                      پیشنهاد ویژه
                    </h4>
                    <p className="text-gray-300">{result.offer}</p>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <h4 className="text-monetize-success-400 font-semibold mb-2">پیشنهاد تصویری</h4>
                    <p className="text-gray-300">{result.visualSuggestion}</p>
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
                      onClick={() => downloadAsText(JSON.stringify(result, null, 2), 'sell-kit.txt')}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={16} />
                      دانلود
                    </button>
                    <button
                      onClick={generateSellKit}
                      className="py-2 px-4 bg-monetize-success-600 hover:bg-monetize-success-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                      <Package size={24} />
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

export default SellKitAI;