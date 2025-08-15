import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  Copy, 
  Download, 
  RefreshCw, 
  ArrowLeft,
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
  Package
} from 'lucide-react';

const BusinessBuilderAI: React.FC = () => {
  const navigate = useNavigate();
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
      title: 'اپلیکیشن آموزش آنلاین',
      category: 'آموزش',
      description: 'پلتفرم آموزش مجازی با قابلیت‌های تعاملی',
      targetMarket: 'دانشجویان و کارآفرینان',
      startupCost: 'کم (زیر 50 میلیون)',
      revenue: '15-25 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '3-6 ماه',
      icon: Smartphone,
      color: 'from-blue-500 to-indigo-600',
      features: ['ویدیو کال', 'تست آنلاین', 'گواهی دیجیتال']
    },
    {
      id: 2,
      title: 'فروشگاه محصولات ارگانیک',
      category: 'فروش',
      description: 'فروش آنلاین محصولات طبیعی و سالم',
      targetMarket: 'خانواده‌های جوان و سلامت‌محور',
      startupCost: 'متوسط (50-200 میلیون)',
      revenue: '30-50 میلیون ماهانه',
      difficulty: 'آسان',
      timeToMarket: '1-3 ماه',
      icon: Globe2,
      color: 'from-green-500 to-emerald-600',
      features: ['تضمین کیفیت', 'ارسال سریع', 'مشاوره تغذیه']
    },
    {
      id: 3,
      title: 'خدمات مشاوره کسب‌وکار',
      category: 'خدمات',
      description: 'مشاوره تخصصی برای استارتاپ‌ها',
      targetMarket: 'کارآفرینان و کسب‌وکارهای نوپا',
      startupCost: 'کم (زیر 20 میلیون)',
      revenue: '20-40 میلیون ماهانه',
      difficulty: 'سخت',
      timeToMarket: '1-2 ماه',
      icon: TrendingUp,
              color: 'from-[#5a0ecc] to-violet-600',
      features: ['تحلیل بازار', 'طرح کسب‌وکار', 'راهنمایی مالی']
    },
    {
      id: 4,
      title: 'کورس‌های آموزش مهارت',
      category: 'آموزش',
      description: 'آموزش مهارت‌های عملی و کاربردی',
      targetMarket: 'جویندگان شغل و حرفه‌ای‌ها',
      startupCost: 'کم (زیر 30 میلیون)',
      revenue: '10-20 میلیون ماهانه',
      difficulty: 'متوسط',
      timeToMarket: '2-4 ماه',
      icon: BookOpen,
      color: 'from-orange-500 to-red-600',
      features: ['ویدیو آموزشی', 'تمرین عملی', 'پشتیبانی مربی']
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
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const interests = formData.interests.split(',').map(i => i.trim()).filter(i => i);
    const businessResult = {
      businessName: `${formData.userName} ${interests[0] || 'کسب‌وکار'}`,
      tagline: `راه‌حل نوآورانه برای ${formData.market || 'مخاطبان شما'}`,
      description: `کسب‌وکاری مبتنی بر ${formData.interests} که با تمرکز بر ${formData.market} فعالیت می‌کند.`,
      targetAudience: formData.market || 'مخاطبان هدف شما',
      products: [
        'محصولات دیجیتال',
        'خدمات مشاوره‌ای',
        'محتوای آموزشی'
      ],
      monetization: [
        'فروش مستقیم محصولات',
        'اشتراک ماهانه',
        'خدمات مشاوره‌ای'
      ],
      firstAction: 'شروع با ایجاد پروفایل حرفه‌ای و معرفی خدمات'
    };
    
    setResult(businessResult);
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
  );
};

export default BusinessBuilderAI;