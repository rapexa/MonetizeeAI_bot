import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Wrench, Rocket, Package, Search, Map, ExternalLink, Sparkles, Brain, Target, Users, BarChart3, Globe, Zap, Shield, Clock,
  Palette, FileText, Image, Layers, PenTool, Eye, TrendingUp, Activity, BarChart, PieChart, LineChart, Mail, MessageSquare, ShoppingCart, CreditCard, DollarSign,
  Settings, Calendar, FolderOpen, Cloud, Link, Workflow, Cpu, Database, Server, Network, Zap as ZapIcon, GitBranch, GitCommit, GitPullRequest, Trophy, X, Crown
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Tools: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useApp();

  // Check if user can access AI tools
  const canAccessAITools = () => {
    if (userData.subscriptionType === 'paid') {
      return true;
    }
    if (userData.subscriptionType === 'free_trial') {
      return false; // AI tools are NOT available in free trial
    }
    return false;
  };

  // Check if user can access CRM
  const canAccessCRM = () => {
    if (userData.subscriptionType === 'paid') {
      return true;
    }
    if (userData.subscriptionType === 'free_trial') {
      return false; // CRM is NOT available in free trial
    }
    return false;
  };

  const internalTools = [
    {
      id: 'business-builder',
      title: 'سازنده ۱ دقیقه‌ای',
      description: 'ایجاد کسب‌وکار در ۱ دقیقه',
      icon: Rocket,
      color: 'from-monetize-primary-600 via-monetize-primary-700 to-monetize-primary-800',
      path: '/business-builder-ai'
    },
    {
      id: 'sell-kit',
      title: 'کیت فروش فوری',
      description: 'ابزارهای فروش فوری',
      icon: Package,
      color: 'from-monetize-success-600 via-monetize-success-700 to-monetize-success-800',
      path: '/sell-kit-ai'
    },
    {
      id: 'client-finder',
      title: 'یابنده مشتری فوری',
      description: 'یافتن مشتریان جدید',
      icon: Search,
      color: 'from-monetize-warning-600 via-monetize-warning-700 to-monetize-danger-600',
      path: '/client-finder-ai'
    },
    {
      id: 'sales-path',
      title: 'مسیر فروش سریع',
      description: 'استراتژی‌های فروش سریع',
      icon: Map,
              color: 'from-[#5a0ecc] via-violet-800 to-[#5a0ecc]',
      path: '/sales-path-ai'
    }
  ];

  const externalTools = [
    // طراحی
    {
      id: 'canva',
      title: 'Canva',
      description: 'طراحی گرافیک و محتوای بصری سریع',
      icon: Palette,
      color: 'from-blue-500 to-blue-700',
      url: 'https://canva.com',
      category: 'طراحی'
    },
    {
      id: 'figma',
      title: 'Figma',
      description: 'طراحی رابط کاربری و پروتوتایپ',
      icon: PenTool,
      color: 'from-purple-500 to-purple-700',
      url: 'https://figma.com',
      category: 'طراحی'
    },
    {
      id: 'looka',
      title: 'Looka',
      description: 'ساخت لوگو خودکار',
      icon: Eye,
      color: 'from-pink-500 to-pink-700',
      url: 'https://looka.com',
      category: 'طراحی'
    },
    {
      id: 'freepik',
      title: 'Freepik',
      description: 'دانلود المان و تصاویر گرافیکی',
      icon: Image,
      color: 'from-green-500 to-green-700',
      url: 'https://freepik.com',
      category: 'طراحی'
    },
    {
      id: 'midjourney',
      title: 'Midjourney',
      description: 'تولید تصاویر خلاقانه با AI',
      icon: Sparkles,
      color: 'from-indigo-500 to-indigo-700',
      url: 'https://midjourney.com',
      category: 'طراحی'
    },
    {
      id: 'logo-maker',
      title: 'LogoMaker',
      description: 'ساخت لوگو آنلاین',
      icon: Layers,
      color: 'from-orange-500 to-orange-700',
      url: 'https://logomaker.com',
      category: 'طراحی'
    },
    {
      id: 'crello',
      title: 'Crello (VistaCreate)',
      description: 'طراحی پست و ویدیو اجتماعی',
      icon: FileText,
      color: 'from-teal-500 to-teal-700',
      url: 'https://crello.com',
      category: 'طراحی'
    },

    // مدیریت
    {
      id: 'notion',
      title: 'Notion',
      description: 'مدیریت پروژه و ایده‌ها',
      icon: Brain,
      color: 'from-gray-600 to-gray-800',
      url: 'https://notion.so',
      category: 'مدیریت'
    },
    {
      id: 'trello',
      title: 'Trello',
      description: 'مدیریت وظایف و تیم',
      icon: Calendar,
      color: 'from-blue-500 to-blue-700',
      url: 'https://trello.com',
      category: 'مدیریت'
    },
    {
      id: 'asana',
      title: 'Asana',
      description: 'مدیریت پروژه تیمی',
      icon: Target,
      color: 'from-orange-500 to-orange-700',
      url: 'https://asana.com',
      category: 'مدیریت'
    },
    {
      id: 'clickup',
      title: 'ClickUp',
      description: 'مدیریت کارها و فرآیندها',
      icon: Settings,
      color: 'from-purple-500 to-purple-700',
      url: 'https://clickup.com',
      category: 'مدیریت'
    },
    {
      id: 'monday',
      title: 'Monday.com',
      description: 'سازماندهی پروژه‌ها و همکاری تیمی',
      icon: Workflow,
      color: 'from-red-500 to-red-700',
      url: 'https://monday.com',
      category: 'مدیریت'
    },
    {
      id: 'google-workspace',
      title: 'Google Workspace',
      description: 'ابزار اداری آنلاین (Docs, Sheets, Drive)',
      icon: FolderOpen,
      color: 'from-green-500 to-green-700',
      url: 'https://workspace.google.com',
      category: 'مدیریت'
    },
    {
      id: 'dropbox',
      title: 'Dropbox',
      description: 'ذخیره و اشتراک‌گذاری فایل‌ها',
      icon: Cloud,
      color: 'from-blue-500 to-blue-700',
      url: 'https://dropbox.com',
      category: 'مدیریت'
    },

    // تحلیل
    {
      id: 'google-analytics',
      title: 'Google Analytics',
      description: 'تحلیل ترافیک وب‌سایت',
      icon: BarChart3,
      color: 'from-orange-500 to-orange-700',
      url: 'https://analytics.google.com',
      category: 'تحلیل'
    },
    {
      id: 'hotjar',
      title: 'Hotjar',
      description: 'تحلیل رفتار کاربران وب‌سایت',
      icon: Eye,
      color: 'from-red-500 to-red-700',
      url: 'https://hotjar.com',
      category: 'تحلیل'
    },
    {
      id: 'similarweb',
      title: 'SimilarWeb',
      description: 'تحلیل رقبا و بازار',
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-700',
      url: 'https://similarweb.com',
      category: 'تحلیل'
    },
    {
      id: 'semrush',
      title: 'SEMrush',
      description: 'تحقیق کلمات کلیدی و تحلیل سئو',
      icon: Search,
      color: 'from-orange-500 to-orange-700',
      url: 'https://semrush.com',
      category: 'تحلیل'
    },
    {
      id: 'ahrefs',
      title: 'Ahrefs',
      description: 'آنالیز بک‌لینک و سئو',
      icon: Activity,
      color: 'from-red-500 to-red-700',
      url: 'https://ahrefs.com',
      category: 'تحلیل'
    },
    {
      id: 'google-trends',
      title: 'Google Trends',
      description: 'بررسی ترندهای جستجو',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-700',
      url: 'https://trends.google.com',
      category: 'تحلیل'
    },
    {
      id: 'social-blade',
      title: 'Social Blade',
      description: 'تحلیل عملکرد شبکه‌های اجتماعی',
      icon: BarChart,
      color: 'from-green-500 to-green-700',
      url: 'https://socialblade.com',
      category: 'تحلیل'
    },

    // بازاریابی
    {
      id: 'meta-business',
      title: 'Meta Business Suite',
      description: 'مدیریت تبلیغات و پیج اینستاگرام/فیسبوک',
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-700',
      url: 'https://business.facebook.com',
      category: 'بازاریابی'
    },
    {
      id: 'google-ads',
      title: 'Google Ads',
      description: 'تبلیغات گوگل',
      icon: ShoppingCart,
      color: 'from-red-500 to-red-700',
      url: 'https://ads.google.com',
      category: 'بازاریابی'
    },
    {
      id: 'active-campaign',
      title: 'ActiveCampaign',
      description: 'ایمیل مارکتینگ و اتوماسیون',
      icon: Mail,
      color: 'from-green-500 to-green-700',
      url: 'https://activecampaign.com',
      category: 'بازاریابی'
    },
    {
      id: 'mailerlite',
      title: 'MailerLite',
      description: 'ایمیل مارکتینگ ساده',
      icon: Mail,
      color: 'from-blue-500 to-blue-700',
      url: 'https://mailerlite.com',
      category: 'بازاریابی'
    },
    {
      id: 'manychat',
      title: 'ManyChat',
      description: 'ساخت چت‌بات بازاریابی',
      icon: MessageSquare,
      color: 'from-purple-500 to-purple-700',
      url: 'https://manychat.com',
      category: 'بازاریابی'
    },
    {
      id: 'hubspot-crm',
      title: 'HubSpot CRM',
      description: 'بازاریابی و مدیریت مشتریان',
      icon: Users,
      color: 'from-orange-500 to-orange-700',
      url: 'https://hubspot.com',
      category: 'بازاریابی'
    },
    {
      id: 'linkedin-sales',
      title: 'LinkedIn Sales Navigator',
      description: 'جذب مشتری B2B',
      icon: Network,
      color: 'from-blue-500 to-blue-700',
      url: 'https://linkedin.com/sales',
      category: 'بازاریابی'
    },
    {
      id: 'buffer',
      title: 'Buffer',
      description: 'زمان‌بندی پست شبکه‌های اجتماعی',
      icon: Clock,
      color: 'from-green-500 to-green-700',
      url: 'https://buffer.com',
      category: 'بازاریابی'
    },
    {
      id: 'hootsuite',
      title: 'Hootsuite',
      description: 'مدیریت چندین شبکه اجتماعی',
      icon: Globe,
      color: 'from-orange-500 to-orange-700',
      url: 'https://hootsuite.com',
      category: 'بازاریابی'
    },

    // پرداخت
    {
      id: 'zarinpal',
      title: 'زرین‌پال',
      description: 'درگاه پرداخت آنلاین ایرانی',
      icon: CreditCard,
      color: 'from-green-500 to-green-700',
      url: 'https://zarinpal.com',
      category: 'پرداخت'
    },
    {
      id: 'payping',
      title: 'PayPing',
      description: 'پرداخت و انتقال وجه آنلاین',
      icon: DollarSign,
      color: 'from-blue-500 to-blue-700',
      url: 'https://payping.ir',
      category: 'پرداخت'
    },
    {
      id: 'zibal',
      title: 'زیبال',
      description: 'درگاه پرداخت و تسویه سریع',
      icon: CreditCard,
      color: 'from-purple-500 to-purple-700',
      url: 'https://zibal.ir',
      category: 'پرداخت'
    },
    {
      id: 'stripe',
      title: 'Stripe',
      description: 'پرداخت بین‌المللی',
      icon: Shield,
      color: 'from-[#5a0ecc] to-[#5a0ecc]/80',
      url: 'https://stripe.com',
      category: 'پرداخت'
    },
    {
      id: 'paypal',
      title: 'PayPal',
      description: 'پرداخت بین‌المللی',
      icon: CreditCard,
      color: 'from-blue-500 to-blue-700',
      url: 'https://paypal.com',
      category: 'پرداخت'
    },
    {
      id: 'square',
      title: 'Square',
      description: 'پرداخت و مدیریت فروشگاه',
      icon: ShoppingCart,
      color: 'from-green-500 to-green-700',
      url: 'https://square.com',
      category: 'پرداخت'
    },
    {
      id: 'nextpay',
      title: 'NextPay',
      description: 'درگاه پرداخت ایرانی',
      icon: CreditCard,
      color: 'from-orange-500 to-orange-700',
      url: 'https://nextpay.ir',
      category: 'پرداخت'
    },

    // اتوماسیون
    {
      id: 'zapier',
      title: 'Zapier',
      description: 'اتصال خودکار سرویس‌ها و ابزارها',
      icon: Zap,
      color: 'from-red-500 to-red-700',
      url: 'https://zapier.com',
      category: 'اتوماسیون'
    },
    {
      id: 'n8n',
      title: 'n8n',
      description: 'ساخت اتوماسیون پیشرفته با کنترل کامل',
      icon: Cpu,
      color: 'from-purple-500 to-purple-700',
      url: 'https://n8n.io',
      category: 'اتوماسیون'
    },
    {
      id: 'make',
      title: 'Make (Integromat)',
      description: 'اتوماسیون کارها و فرآیندها',
      icon: Workflow,
      color: 'from-blue-500 to-blue-700',
      url: 'https://make.com',
      category: 'اتوماسیون'
    },
    {
      id: 'ifttt',
      title: 'IFTTT',
      description: 'اتوماسیون ساده بین اپلیکیشن‌ها',
      icon: Link,
      color: 'from-orange-500 to-orange-700',
      url: 'https://ifttt.com',
      category: 'اتوماسیون'
    },
    {
      id: 'gohighlevel',
      title: 'GoHighLevel',
      description: 'CRM و اتوماسیون بازاریابی',
      icon: Database,
      color: 'from-green-500 to-green-700',
      url: 'https://gohighlevel.com',
      category: 'اتوماسیون'
    },
    {
      id: 'pabbly',
      title: 'Pabbly Connect',
      description: 'اتوماسیون مقرون‌به‌صرفه',
      icon: Server,
      color: 'from-purple-500 to-purple-700',
      url: 'https://pabbly.com',
      category: 'اتوماسیون'
    },
    {
      id: 'bitrix24',
      title: 'Bitrix24',
      description: 'CRM و اتوماسیون کسب‌وکار',
      icon: GitBranch,
      color: 'from-blue-500 to-blue-700',
      url: 'https://bitrix24.com',
      category: 'اتوماسیون'
    }
  ];

  const categories = ['همه', 'طراحی', 'مدیریت', 'تحلیل', 'بازاریابی', 'پرداخت', 'اتوماسیون'];
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExternalTools = externalTools.filter(tool => {
    const matchesCategory = selectedCategory === 'همه' || tool.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Function to highlight search terms
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-400/30 text-yellow-200 px-1 rounded">$1</mark>');
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          {/* Icon Container */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-xl flex items-center justify-center shadow-lg">
              <Wrench size={24} className="text-white" />
            </div>
            {/* Icon Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/30 via-[#5a189a]/30 to-[#7222F2]/30 rounded-xl blur-md animate-pulse"></div>
          </div>
          
          {/* Title Section */}
          <div className="text-right flex-1 mr-4">
            <h1 className="text-xl font-bold text-white mb-1">ابزارهای هوشمند</h1>
            <p className="text-xs text-gray-300">مجموعه‌ای از ابزارهای قدرتمند AI</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 max-w-6xl mx-auto p-6">
        {/* Subscription limit warning */}
        {!canAccessAITools() && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h4 className="text-red-400 font-bold text-sm mb-1">محدودیت اشتراک</h4>
                <p className="text-red-300 text-xs">
                  برای دسترسی به ابزارهای هوش مصنوعی، اشتراک پولی تهیه کنید.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Internal AI Tools */}
        <div className="mb-12 mt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">ابزارهای AI داخلی</h2>
            <p className="text-gray-400">ابزارهای هوشمند MonetizeAI برای رشد کسب‌وکار</p>
          </div>
          
          {/* Small AI Tools - All four on top */}

          <div className="grid grid-cols-2 gap-3">
            {internalTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    if (canAccessAITools()) {
                      navigate(tool.path);
                    } else {
                      alert('🔒 برای دسترسی به ابزارهای هوش مصنوعی، اشتراک پولی تهیه کنید.');
                    }
                  }}
                  className={`text-center group transition-all duration-300 h-20 flex flex-col justify-center backdrop-blur-xl rounded-3xl p-7 border border-gray-700/60 shadow-lg relative overflow-hidden ${
                    canAccessAITools() 
                      ? 'cursor-pointer hover:shadow-xl hover:scale-105' 
                      : 'opacity-50 cursor-not-allowed grayscale blur-sm'
                  }`}
                  style={{ backgroundColor: '#10091c' }}
                >
                  <div className="flex items-center justify-center mb-1">
                    <div className="text-xs text-white font-medium transition-colors duration-300">
                      {tool.title}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white flex items-center justify-center gap-1 transition-colors duration-300">
                    {!canAccessAITools() ? (
                      <Crown size={16} className="text-red-400" />
                    ) : (
                      <Icon size={16} className={tool.title.includes('سازنده') ? 'text-blue-500 drop-shadow-lg' : 
                                                   tool.title.includes('کیت') ? 'text-green-500 drop-shadow-lg' :
                                                   tool.title.includes('یابنده') ? 'text-orange-500 drop-shadow-lg' :
                                                   tool.title.includes('مسیر') ? 'text-purple-500 drop-shadow-lg' : 'text-white'} />
                    )}
                    <span className={tool.title.includes('سازنده') ? 'text-blue-500 drop-shadow-lg' : 
                                       tool.title.includes('کیت') ? 'text-green-500 drop-shadow-lg' :
                                       tool.title.includes('یابنده') ? 'text-orange-500 drop-shadow-lg' :
                                       tool.title.includes('مسیر') ? 'text-purple-500 drop-shadow-lg' : 'text-white'}>
                      {tool.title.includes('سازنده') ? 'کسب‌وکار' : 
                       tool.title.includes('کیت') ? 'فوری' :
                       tool.title.includes('یابنده') ? 'فوری' :
                       tool.title.includes('مسیر') ? 'سریع' : 'AI'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Large Sales Management System Card - below all small buttons */}
          <div 
            className={`mt-3 text-center group transition-all duration-300 h-20 flex flex-col justify-center backdrop-blur-xl rounded-3xl p-7 border border-gray-700/60 shadow-lg relative overflow-hidden ${
              canAccessCRM() 
                ? 'cursor-pointer hover:shadow-xl hover:scale-105' 
                : 'opacity-50 cursor-not-allowed grayscale blur-sm'
            }`}
            style={{ backgroundColor: '#10091c' }}
            onClick={() => {
              if (canAccessCRM()) {
                navigate('/crm');
              } else {
                alert('🔒 برای دسترسی به CRM، اشتراک پولی تهیه کنید.');
              }
            }}
          >
            <div className="flex items-center justify-center mb-1">
              <div className="text-xs text-white font-medium transition-colors duration-300">سیستم مدیریت فروش</div>
            </div>
            <div className="text-lg font-bold text-white flex items-center justify-center gap-1 transition-colors duration-300">
              {!canAccessCRM() ? (
                <Crown size={16} className="text-red-400" />
              ) : (
                <BarChart3 size={16} className="text-green-500 drop-shadow-lg" />
              )}
              <span className="text-green-500 drop-shadow-lg">مدیریت فروش</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-64 h-px bg-gray-200/30 dark:bg-gray-700/30 my-6 mx-auto"></div>

        {/* Featured Courses Section (minimal, like internal tools) */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">دوره‌های ویژه</h2>
            <p className="text-gray-400">دو مسیر سریع و کاربردی برای رشد</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* دوره درآمد دلاری واقعی */}
            <div
              onClick={() => navigate('/courses/real-dollar-income')}
              className="text-center group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-20 flex flex-col justify-center backdrop-blur-xl rounded-3xl p-7 border border-yellow-500/50 shadow-lg relative overflow-hidden"
              style={{ backgroundColor: '#10091c' }}
            >
              <div className="flex items-center justify-center">
                <div className="text-sm text-white font-bold transition-colors duration-300">دوره درآمد دلاری واقعی</div>
              </div>
            </div>

            {/* دوره طراحی سایت بدون کدنویسی */}
            <div
              onClick={() => navigate('/courses/no-code-web-design')}
              className="text-center group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-20 flex flex-col justify-center backdrop-blur-xl rounded-3xl p-7 border border-rose-500/50 shadow-lg relative overflow-hidden"
              style={{ backgroundColor: '#10091c' }}
            >
              <div className="flex items-center justify-center">
                <div className="text-sm text-white font-bold transition-colors duration-300">دوره طراحی سایت بدون کدنویسی</div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-64 h-px bg-gray-200/30 dark:bg-gray-700/30 my-6 mx-auto"></div>

        {/* External Tools */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">ابزارهای خارجی</h2>
            <p className="text-gray-400">ابزارهای مفید برای تکمیل کسب‌وکار شما</p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="جستجو در ابزارها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-800/60 backdrop-blur-md border border-gray-700/60 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-base"
                style={{ fontSize: '16px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Count */}
          {searchQuery && (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400">
                {filteredExternalTools.length > 0 
                  ? `${filteredExternalTools.length} ابزار یافت شد` 
                  : 'نتیجه‌ای یافت نشد'
                }
              </p>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => {
              const categoryTools = externalTools.filter(tool => tool.category === category);
              const hasResults = searchQuery === '' || categoryTools.some(tool => 
                tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.category.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  disabled={!hasResults && searchQuery !== ''}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white'
                      : hasResults || searchQuery === ''
                        ? 'bg-gray-800/60 text-gray-300 hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 hover:text-white'
                        : 'bg-gray-800/30 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {filteredExternalTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredExternalTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.id}
                    onClick={() => window.open(tool.url, '_blank')}
                    className="group cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 backdrop-blur-xl rounded-3xl p-7 border border-gray-700/60 shadow-lg relative overflow-hidden"
                    style={{ backgroundColor: '#10091c' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-16 h-16 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 flex-shrink-0`}>
                        <Icon size={28} className="text-white" />
                      </div>
                      
                      <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 
                          className="text-white font-bold text-base"
                          dangerouslySetInnerHTML={{ __html: highlightText(tool.title, searchQuery) }}
                        />
                        <ExternalLink size={14} className="text-gray-400 group-hover:text-orange-400 transition-colors duration-300" />
                      </div>
                      
                      <p 
                        className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: highlightText(tool.description, searchQuery) }}
                      />
                      
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs text-[#8B5CF6] font-medium bg-[#7222F2]/20 px-2 py-1 rounded-full"
                          dangerouslySetInnerHTML={{ __html: highlightText(tool.category, searchQuery) }}
                        />
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">خارجی</span>
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-800/60 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">نتیجه‌ای یافت نشد</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery ? `برای "${searchQuery}" ابزاری پیدا نشد` : 'ابزاری در این دسته‌بندی وجود ندارد'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  پاک کردن جستجو
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tools;