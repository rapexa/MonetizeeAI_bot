import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText
} from 'lucide-react';

const SellKitAI: React.FC = () => {
  const navigate = useNavigate();
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

  // Ready Products Database
  const readyProducts = [
    {
      id: 1,
      name: 'کورس آموزش دیجیتال مارکتینگ',
      category: 'آموزش',
      description: 'کورس جامع دیجیتال مارکتینگ برای مبتدیان',
      targetAudience: 'کارآفرینان و بازاریابان',
      price: '599,000 تومان',
      benefits: ['یادگیری کامل SEO', 'مهارت‌های شبکه‌های اجتماعی', 'استراتژی‌های بازاریابی محتوا'],
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 2,
      name: 'اپلیکیشن مدیریت فیتنس',
      category: 'سلامت',
      description: 'اپ کامل برای مدیریت ورزش و تغذیه',
      targetAudience: 'علاقه‌مندان به ورزش',
      price: '199,000 تومان',
      benefits: ['برنامه ورزشی شخصی', 'ردیابی کالری', 'مشاوره آنلاین'],
      icon: Zap,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 3,
      name: 'قالب وبسایت فروشگاهی',
      category: 'وب',
      description: 'قالب حرفه‌ای فروشگاه آنلاین',
      targetAudience: 'کسب‌وکارهای آنلاین',
      price: '299,000 تومان',
      benefits: ['طراحی واکنش‌گرا', 'سیستم پرداخت', 'پنل مدیریت کامل'],
      icon: Globe,
              color: 'from-[#5a0ecc] to-violet-600'
    },
    {
      id: 4,
      name: 'پکیج مشاوره کسب‌وکار',
      category: 'خدمات',
      description: 'مشاوره جامع راه‌اندازی کسب‌وکار',
      targetAudience: 'استارتاپ‌ها',
      price: '1,299,000 تومان',
      benefits: ['تحلیل بازار', 'طرح کسب‌وکار', 'مشاوره مالی'],
      icon: Layers,
      color: 'from-orange-500 to-red-600'
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
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const sellKitResult = {
      title: `${formData.productName} - راه‌حل نهایی شما`,
      headline: `تجربه‌ای فراتر از انتظار با ${formData.productName}`,
      description: `${formData.description} - طراحی شده خصوصاً برای ${formData.targetAudience}`,
      benefits: [
        'صرفه‌جویی زمان و انرژی قابل توجه',
        'نتایج تضمین شده و قابل اندازه‌گیری', 
        'پشتیبانی کامل و مشاوره رایگان'
      ],
      priceRange: '299,000 - 899,000 تومان',
      offer: 'تخفیف 30% برای 50 خریدار اول + ضمانت بازگشت وجه',
      visualSuggestion: 'تصویر محصول با بک‌گراند مینیمال و رنگ‌های گرم'
    };
    
    setResult(sellKitResult);
    setIsGenerating(false);
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
              محصولات آماده
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