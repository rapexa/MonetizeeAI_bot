import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { 
  ArrowRight, 
  DollarSign, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target, 
  BarChart3, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Star, 
  Phone, 
  Mail, 
  Eye, 
  Edit3, 
  Plus, 
  Filter, 
  Search,
  User,
  Send,
  Heart,
  Share2,
  Zap,
  Trophy,
  Crown,
  Gift,
  Flame,
  Brain,
  Settings,
  RefreshCw,
  Download,
  Upload,
  FileText,
  PieChart,
  Activity,
  Briefcase,
  ShoppingCart,
  CreditCard,
  Wallet,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  MoreHorizontal,
  X,
  Save,
  Trash2,
  Copy,
  ExternalLink,
  MapPin,
  Building,
  Globe,
  Smartphone,
  Tag,
  Percent,
  Calculator,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  Archive,
  Bookmark,
  Flag,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  PhoneCall,
  MessageCircle,
  Video,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Timer,
  Hourglass,
  PlayCircle,
  PauseCircle,
  StopCircle,
  FastForward,
  Rewind,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  Maximize,
  Minimize,
  MoreVertical,
  Menu,
  Grid,
  List,
  Columns,
  Rows,
  Layout,
  Sidebar,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Expand,
  Shrink,
  Move,
  Crop,
  Scissors,
  Paperclip,
  Link,
  Unlink,
  Anchor,
  Hash,
  AtSign,
  Percent as PercentIcon,
  Euro,
  Bitcoin,
  Coins,
  Banknote,
  Receipt,
  CreditCard as CreditCardIcon,
  Wallet as WalletIcon,
  PiggyBank,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart,
  BarChart2,
  BarChart3 as BarChart3Icon,
  LineChart,
  PieChart as PieChartIcon,
  Radar,
  Gauge,
  Thermometer,
  Battery,
  BatteryLow,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Wifi,
  WifiOff,
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  Nfc,
  Radio,
  Satellite,
  Router,
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Usb,
  Cable,
  Plug,
  Power,
  PowerOff,
  Zap as ZapIcon,
  Bolt,
  Sun,
  Moon,
  Stars,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudHail,
  Umbrella,
  Rainbow,
  Sunrise,
  Sunset,
  Wind,
  Tornado,
  Snowflake,
  Droplets,
  Waves,
  Thermometer as ThermometerIcon,
  Compass,
  Navigation,
  Map,
  MapPin as MapPinIcon,
  Route,
  Car,
  Truck,
  Bus,
  Bike,
  Plane,
  Train,
  Ship,
  Rocket,
  Anchor as AnchorIcon,
  Fuel,
  Construction,
  Hammer,
  Wrench,
  Drill,
  Ruler,
  Scissors as ScissorsIcon,
  Paintbrush,
  Palette,
  Brush,
  Pen,
  Pencil,
  PenTool,
  Highlighter,
  Eraser,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List as ListIcon,
  ListOrdered,
  Indent,
  Outdent,
  Quote,
  Code,
  Code2,
  Terminal,
  Command,
  Option,
  Space,
  Delete,
  Insert,
  Home,
  End,
  PageUp,
  PageDown,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsUp,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  CornerLeftDown,
  CornerLeftUp,
  CornerRightDown,
  CornerRightUp,
  Move3d,
  RotateCcw as RotateCcwIcon,
  RotateCw,
  Repeat,
  Repeat1,
  Repeat2,
  Shuffle,
  SkipBack as SkipBackIcon,
  SkipForward as SkipForwardIcon,
  Rewind as RewindIcon,
  FastForward as FastForwardIcon,
  Play,
  Pause,
  Stop,
  Record,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Octagon,
  Pentagon,
  Diamond,
  Heart as HeartIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  Flag as FlagIcon,
  Tag as TagIcon,
  Hash as HashIcon,
  AtSign as AtSignIcon,
  Percent as PercentIconDup,
  Dollar as DollarIconDup,
  Euro as EuroIcon,
  Pound as PoundIcon,
  Yen as YenIcon,
  Bitcoin as BitcoinIcon,
  Coins as CoinsIcon,
  Banknote as BanknoteIcon,
  Receipt as ReceiptIcon,
  Invoice as InvoiceIcon,
  CreditCard as CreditCardIconDup,
  Wallet as WalletIconDup,
  PiggyBank as PiggyBankIcon,
  TrendingUp as TrendingUpIconDup,
  TrendingDown as TrendingDownIconDup,
  BarChart as BarChartIcon,
  BarChart2 as BarChart2Icon,
  BarChart3 as BarChart3IconDup,
  LineChart as LineChartIcon,
  PieChart as PieChartIconDup,
  Doughnut as DoughnutIcon,
  Area as AreaIcon,
  Scatter as ScatterIcon,
  Radar as RadarIcon,
  Gauge as GaugeIcon
} from 'lucide-react';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'negotiating' | 'qualified' | 'proposal' | 'closed' | 'lost';
  value: number;
  source: string;
  lastContact: string;
  avatar: string;
  notes: string;
  probability: number;
  company?: string;
  position?: string;
  tags: string[];
  createdAt: string;
  nextFollowUp?: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Sale {
  id: number;
  customer: string;
  product: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'refunded' | 'cancelled';
  paymentMethod: string;
  invoice?: string;
  notes?: string;
}

interface SalesFunnel {
  id: number;
  name: string;
  description: string;
  stages: FunnelStage[];
  totalLeads: number;
  conversionRate: number;
  revenue: number;
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
  lastModified: string;
}

interface FunnelStage {
  id: number;
  name: string;
  leads: number;
  conversionRate: number;
  color: string;
}

const SalesPanel: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'sales' | 'funnels'>('overview');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<SalesFunnel | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  // Enhanced sample data
  const leads: Lead[] = [
    {
      id: 1,
      name: 'علی محمدی',
      email: 'ali@example.com',
      phone: '۰۹۱۲۳۴۵۶۷۸۹',
      status: 'negotiating',
      value: 2500000,
      source: 'اینستاگرام',
      lastContact: '۲ ساعت پیش',
      avatar: 'AM',
      notes: 'علاقه‌مند به پکیج کامل. نیاز به مشاوره بیشتر دارد.',
      probability: 75,
      company: 'شرکت تکنولوژی پارس',
      position: 'مدیر بازاریابی',
      tags: ['hot-lead', 'enterprise', 'follow-up'],
      createdAt: '۱۴۰۲/۱۰/۱۵',
      nextFollowUp: '۱۴۰۲/۱۰/۲۰',
      assignedTo: 'شما',
      priority: 'high'
    },
    {
      id: 2,
      name: 'سارا احمدی',
      email: 'sara@example.com',
      phone: '۰۹۱۲۳۴۵۶۷۸۰',
      status: 'qualified',
      value: 1800000,
      source: 'تلگرام',
      lastContact: '۱ روز پیش',
      avatar: 'SA',
      notes: 'پاسخ مثبت داده. منتظر تصمیم نهایی.',
      probability: 60,
      company: 'استودیو طراحی آریا',
      position: 'بنیانگذار',
      tags: ['warm-lead', 'design', 'budget-approved'],
      createdAt: '۱۴۰۲/۱۰/۱۲',
      nextFollowUp: '۱۴۰۲/۱۰/۱۸',
      assignedTo: 'شما',
      priority: 'medium'
    },
    {
      id: 3,
      name: 'محمد رضایی',
      email: 'mohammad@example.com',
      phone: '۰۹۱۲۳۴۵۶۷۸۱',
      status: 'new',
      value: 3200000,
      source: 'وب‌سایت',
      lastContact: 'هنوز تماس نگرفته',
      avatar: 'MR',
      notes: 'لید جدید از فرم تماس وب‌سایت',
      probability: 30,
      company: 'فروشگاه آنلاین مهر',
      position: 'مالک',
      tags: ['new', 'ecommerce', 'website'],
      createdAt: '۱۴۰۲/۱۰/۱۶',
      assignedTo: 'شما',
      priority: 'medium'
    }
  ];

  const recentSales: Sale[] = [
    {
      id: 1,
      customer: 'فاطمه کریمی',
      product: 'پکیج کامل MonetizeAI',
      amount: 2800000,
      date: 'امروز',
      status: 'completed',
      paymentMethod: 'کارت بانکی',
      invoice: 'INV-001',
      notes: 'پرداخت موفق انجام شد'
    },
    {
      id: 2,
      customer: 'حسین نوری',
      product: 'مشاوره شخصی',
      amount: 1500000,
      date: 'دیروز',
      status: 'completed',
      paymentMethod: 'درگاه پرداخت',
      invoice: 'INV-002'
    },
    {
      id: 3,
      customer: 'مریم صادقی',
      product: 'دوره آنلاین',
      amount: 950000,
      date: '۲ روز پیش',
      status: 'pending',
      paymentMethod: 'انتقال بانکی',
      notes: 'در انتظار تأیید پرداخت'
    }
  ];

  const salesFunnels: SalesFunnel[] = [
    {
      id: 1,
      name: 'قیف فروش اصلی',
      description: 'قیف فروش برای محصولات اصلی MonetizeAI',
      stages: [
        { id: 1, name: 'لید جدید', leads: 150, conversionRate: 100, color: 'from-blue-500 to-cyan-500' },
        { id: 2, name: 'تماس اولیه', leads: 120, conversionRate: 80, color: 'from-green-500 to-emerald-500' },
        { id: 3, name: 'ارائه پیشنهاد', leads: 85, conversionRate: 57, color: 'from-yellow-500 to-orange-500' },
        { id: 4, name: 'مذاکره', leads: 45, conversionRate: 30, color: 'from-orange-500 to-red-500' },
        { id: 5, name: 'بسته شده', leads: 25, conversionRate: 17, color: 'from-[#5a0ecc] to-pink-500' }
      ],
      totalLeads: 150,
      conversionRate: 17,
      revenue: 45000000,
      status: 'active',
      createdAt: '۱۴۰۲/۰۹/۰۱',
      lastModified: '۱۴۰۲/۱۰/۱۶'
    },
    {
      id: 2,
      name: 'قیف مشاوره',
      description: 'قیف فروش برای خدمات مشاوره',
      stages: [
        { id: 1, name: 'درخواست مشاوره', leads: 80, conversionRate: 100, color: 'from-indigo-500 to-[#5a0ecc]' },
        { id: 2, name: 'جلسه اولیه', leads: 65, conversionRate: 81, color: 'from-[#5a0ecc] to-pink-500' },
        { id: 3, name: 'ارائه پکیج', leads: 40, conversionRate: 50, color: 'from-pink-500 to-rose-500' },
        { id: 4, name: 'تأیید نهایی', leads: 20, conversionRate: 25, color: 'from-rose-500 to-red-500' }
      ],
      totalLeads: 80,
      conversionRate: 25,
      revenue: 18000000,
      status: 'active',
      createdAt: '۱۴۰۲/۰۹/۱۵',
      lastModified: '۱۴۰۲/۱۰/۱۴'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100/70 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'contacted': return 'bg-yellow-100/70 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'qualified': return 'bg-green-100/70 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'negotiating': return 'bg-orange-100/70 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
              case 'proposal': return 'bg-[#5a0ecc]/10 text-[#5a0ecc] dark:bg-[#5a0ecc]/30 dark:text-[#5a0ecc]/80';
      case 'closed': return 'bg-emerald-100/70 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'lost': return 'bg-red-100/70 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-green-100/70 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100/70 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'refunded': return 'bg-red-100/70 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100/70 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'active': return 'bg-green-100/70 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'paused': return 'bg-gray-100/70 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'draft': return 'bg-blue-100/70 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100/70 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'جدید';
      case 'contacted': return 'تماس گرفته';
      case 'qualified': return 'واجد شرایط';
      case 'negotiating': return 'در مذاکره';
      case 'proposal': return 'پیشنهاد ارسالی';
      case 'closed': return 'بسته شده';
      case 'lost': return 'از دست رفته';
      case 'completed': return 'تکمیل شده';
      case 'pending': return 'در انتظار';
      case 'refunded': return 'بازگشت وجه';
      case 'cancelled': return 'لغو شده';
      case 'active': return 'فعال';
      case 'paused': return 'متوقف';
      case 'draft': return 'پیش‌نویس';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100/70 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'medium': return 'bg-blue-100/70 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'high': return 'bg-orange-100/70 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'urgent': return 'bg-red-100/70 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100/70 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'کم';
      case 'medium': return 'متوسط';
      case 'high': return 'بالا';
      case 'urgent': return 'فوری';
      default: return priority;
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
  };

  const handleFunnelClick = (funnel: SalesFunnel) => {
    setSelectedFunnel(funnel);
    setShowFunnelModal(true);
  };

  const totalLeadValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const totalSalesValue = recentSales.reduce((sum, sale) => sum + sale.amount, 0);
  const conversionRate = leads.length > 0 ? (recentSales.filter(s => s.status === 'completed').length / leads.length) * 100 : 0;

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-50 transition-colors duration-300 page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
          html.dark .page-container {
            background: #08000f !important;
          }
          @media (prefers-color-scheme: dark) {
            .page-container {
              background: #08000f !important;
            }
          }
        `
      }} />
              {/* Enhanced Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl border-b border-white/20 dark:border-gray-700/20 px-4 py-4 sticky top-0 z-10 transition-colors duration-300 shadow-[0_10px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgb(0,0,0,0.25)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">پنل فروش</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">مدیریت حرفه‌ای لیدها و فروش</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm">
              <RefreshCw size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm">
              <Settings size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <DollarSign size={16} className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-300">{formatCurrency(userData.incomeMonth)}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="flex mt-4 bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-xl rounded-2xl p-1.5 transition-colors duration-300 shadow-inner">
          {[
            { key: 'overview', label: 'نمای کلی', icon: BarChart3, badge: null },
            { key: 'leads', label: 'لیدها', icon: Users, badge: leads.length },
            { key: 'sales', label: 'فروش', icon: DollarSign, badge: recentSales.length },
            { key: 'funnels', label: 'قیف فروش', icon: Target, badge: salesFunnels.filter(f => f.status === 'active').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 relative ${
                activeTab === tab.key
                  ? 'bg-white/90 dark:bg-gray-600/90 text-emerald-600 dark:text-emerald-400 shadow-lg backdrop-blur-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-white text-xs font-bold">{tab.badge}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-800/50 backdrop-blur-xl shadow-xl hover:scale-105 transition-all duration-300">
                <div className="text-center">
                  <div className="w-14 h-14 bg-emerald-100/70 dark:bg-emerald-900/30 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <DollarSign size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1 transition-colors duration-300">
                    {formatCurrency(userData.incomeMonth)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors duration-300">درآمد ماهانه</div>
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1 transition-colors duration-300">
                    <ArrowUp size={10} />
                    +۱۲%
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-xl shadow-xl hover:scale-105 transition-all duration-300">
                <div className="text-center">
                  <div className="w-14 h-14 bg-blue-100/70 dark:bg-blue-900/30 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Users size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">
                    {leads.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors duration-300">لید فعال</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 transition-colors duration-300">
                    <ArrowUp size={10} />
                    +۳ امروز
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-[#5a0ecc]/10 to-pink-50/80 dark:from-[#5a0ecc]/20 dark:to-pink-900/20 border border-[#5a0ecc]/30 dark:border-[#5a0ecc]/80 backdrop-blur-xl shadow-xl hover:scale-105 transition-all duration-300">
                <div className="text-center">
                                      <div className="w-14 h-14 bg-[#5a0ecc]/10 dark:bg-[#5a0ecc]/30 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Target size={24} className="text-[#5a0ecc] dark:text-[#5a0ecc]/80" />
                    </div>
                    <div className="text-2xl font-bold text-[#5a0ecc] dark:text-[#5a0ecc]/80 mb-1 transition-colors duration-300">
                    {Math.round(conversionRate)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors duration-300">نرخ تبدیل</div>
                                      <div className="text-xs text-[#5a0ecc] dark:text-[#5a0ecc]/80 flex items-center justify-center gap-1 transition-colors duration-300">
                    <ArrowUp size={10} />
                    +۵%
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50/80 to-red-50/80 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200/50 dark:border-orange-800/50 backdrop-blur-xl shadow-xl hover:scale-105 transition-all duration-300">
                <div className="text-center">
                  <div className="w-14 h-14 bg-orange-100/70 dark:bg-orange-900/30 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <MessageSquare size={24} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1 transition-colors duration-300">
                    {userData.negotiatingCustomers}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors duration-300">در مذاکره</div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center justify-center gap-1 transition-colors duration-300">
                    <ArrowUp size={10} />
                    +۱ امروز
                  </div>
                </div>
              </Card>
            </div>

            {/* Enhanced Quick Actions */}
            <Card className="bg-gradient-to-r from-[#5a0ecc]/10 to-blue-50/80 dark:from-[#5a0ecc]/20 dark:to-blue-900/20 border border-[#5a0ecc]/30 dark:border-[#5a0ecc]/80 backdrop-blur-xl shadow-xl">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                  <Zap size={18} className="text-[#5a0ecc] dark:text-[#5a0ecc]/80" />
                اقدامات سریع
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowAddLeadModal(true)}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group shadow-lg"
                >
                  <Plus size={20} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-2 group-hover:rotate-90 transition-transform duration-300" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">لید جدید</div>
                </button>
                <button 
                  onClick={() => setShowAddSaleModal(true)}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group shadow-lg"
                >
                  <DollarSign size={20} className="text-blue-600 dark:text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">فروش جدید</div>
                </button>
                <button className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group shadow-lg">
                  <BarChart3 size={20} className="text-[#5a0ecc] dark:text-[#5a0ecc]/80 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">گزارش</div>
                </button>
                <button 
                  onClick={() => setActiveTab('funnels')}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl p-3 hover:scale-105 transition-all duration-300 text-center group shadow-lg"
                >
                  <Target size={20} className="text-orange-600 dark:text-orange-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">قیف فروش</div>
                </button>
              </div>
            </Card>

            {/* Enhanced Recent Activity */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                فعالیت‌های اخیر
              </h3>
              <div className="space-y-3">
                <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100/70 dark:bg-green-900/30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">فروش جدید: فاطمه کریمی</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(2800000)} • ۱ ساعت پیش</p>
                    </div>
                    <div className="text-xs bg-green-100/70 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                      تکمیل شده
                    </div>
                  </div>
                </Card>
                <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100/70 dark:bg-blue-900/30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <User size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">لید جدید: محمد رضایی</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">از وب‌سایت • ۳ ساعت پیش</p>
                    </div>
                    <div className="text-xs bg-blue-100/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                      جدید
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Enhanced Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در لیدها..."
                  className="w-full pr-10 pl-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-lg"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/50 text-gray-900 dark:text-white shadow-lg"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="new">جدید</option>
                <option value="contacted">تماس گرفته</option>
                <option value="qualified">واجد شرایط</option>
                <option value="negotiating">در مذاکره</option>
                <option value="proposal">پیشنهاد ارسالی</option>
                <option value="closed">بسته شده</option>
                <option value="lost">از دست رفته</option>
              </select>
              <button 
                onClick={() => setShowAddLeadModal(true)}
                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:scale-105"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Enhanced Leads List */}
            <div className="space-y-3">
              {filteredLeads.map((lead) => (
                <Card 
                  key={lead.id} 
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-xl"
                  onClick={() => handleLeadClick(lead)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                        {lead.avatar}
                      </div>
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getPriorityColor(lead.priority)} flex items-center justify-center`}>
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{lead.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)} backdrop-blur-sm`}>
                          {getStatusText(lead.status)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(lead.priority)} backdrop-blur-sm`}>
                          {getPriorityText(lead.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{formatCurrency(lead.value)}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{lead.source}</span>
                        <span>•</span>
                        <span>{lead.lastContact}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{lead.probability}% احتمال</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {lead.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="text-xs bg-[#5a0ecc]/10 dark:bg-[#5a0ecc]/30 text-[#5a0ecc] dark:text-[#5a0ecc]/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">فروش‌های اخیر</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatCurrency(totalSalesValue)}
                </span>
                <button 
                  onClick={() => setShowAddSaleModal(true)}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:scale-105"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {recentSales.map((sale) => (
                <Card key={sale.id} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{sale.customer}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)} backdrop-blur-sm`}>
                          {getStatusText(sale.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{sale.product}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(sale.amount)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{sale.paymentMethod}</span>
                        {sale.invoice && (
                          <span className="text-xs bg-blue-100/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {sale.invoice}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{sale.date}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <button className="p-1 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded transition-colors duration-300">
                          <Eye size={14} className="text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded transition-colors duration-300">
                          <Edit3 size={14} className="text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded transition-colors duration-300">
                          <MoreHorizontal size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Sales Funnels Tab */}
        {activeTab === 'funnels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">قیف‌های فروش</h3>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:scale-105">
                قیف جدید
              </button>
            </div>

            <div className="space-y-4">
              {salesFunnels.map((funnel) => (
                <Card 
                  key={funnel.id} 
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  onClick={() => handleFunnelClick(funnel)}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#5a0ecc] to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Target size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{funnel.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(funnel.status)} backdrop-blur-sm`}>
                            {getStatusText(funnel.status)}
                          </span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300">
                        <MoreHorizontal size={16} className="text-gray-400" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{funnel.description}</p>

                    {/* Funnel Visualization */}
                    <div className="space-y-2 mb-4">
                      {funnel.stages.map((stage, index) => (
                        <div key={stage.id} className="relative">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${stage.color} rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{stage.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{stage.leads} لید</span>
                              </div>
                              <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-2">
                                <div 
                                  className={`bg-gradient-to-r ${stage.color} h-2 rounded-full transition-all duration-1000`}
                                  style={{ width: `${stage.conversionRate}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{stage.conversionRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{funnel.totalLeads}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">کل لیدها</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{funnel.conversionRate}%</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">نرخ تبدیل</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#5a0ecc] dark:text-[#5a0ecc]/80">{formatCurrency(funnel.revenue)}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">درآمد</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200/20 dark:border-gray-700/20">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>ایجاد شده: {funnel.createdAt}</span>
                        <span>آخرین بروزرسانی: {funnel.lastModified}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Lead Detail Modal */}
      {showLeadModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">جزئیات لید</h3>
              <button 
                onClick={() => setShowLeadModal(false)}
                className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                {selectedLead.avatar}
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedLead.name}</h4>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLead.status)} backdrop-blur-sm`}>
                  {getStatusText(selectedLead.status)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedLead.priority)} backdrop-blur-sm`}>
                  {getPriorityText(selectedLead.priority)}
                </span>
              </div>
              {selectedLead.company && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedLead.position} در {selectedLead.company}</p>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">{selectedLead.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">{selectedLead.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">{formatCurrency(selectedLead.value)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Target size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">{selectedLead.probability}% احتمال موفقیت</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">ایجاد شده: {selectedLead.createdAt}</span>
              </div>
              {selectedLead.nextFollowUp && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">پیگیری بعدی: {selectedLead.nextFollowUp}</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">برچسب‌ها</h5>
              <div className="flex flex-wrap gap-2">
                {selectedLead.tags.map((tag, index) => (
                  <span key={index} className="text-xs bg-[#5a0ecc]/10 dark:bg-[#5a0ecc]/30 text-[#5a0ecc] dark:text-[#5a0ecc]/80 px-2 py-1 rounded-full backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">یادداشت‌ها</h5>
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-3 backdrop-blur-sm">
                {selectedLead.notes}
              </p>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg">
                <Phone size={16} />
                تماس
              </button>
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg">
                <Send size={16} />
                پیام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">لید جدید</h3>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام و نام خانوادگی</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="نام کامل لید"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ایمیل</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شماره تماس</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ارزش پیش‌بینی شده</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="مبلغ به تومان"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">منبع</label>
                <select className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm">
                  <option>اینستاگرام</option>
                  <option>تلگرام</option>
                  <option>وب‌سایت</option>
                  <option>معرفی</option>
                  <option>تبلیغات</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اولویت</label>
                <select className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm">
                  <option value="low">کم</option>
                  <option value="medium">متوسط</option>
                  <option value="high">بالا</option>
                  <option value="urgent">فوری</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors duration-300 shadow-lg"
              >
                ایجاد لید
              </button>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-colors duration-300 backdrop-blur-sm"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sale Modal */}
      {showAddSaleModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">فروش جدید</h3>
              <button 
                onClick={() => setShowAddSaleModal(false)}
                className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام مشتری</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="نام کامل مشتری"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">محصول/خدمات</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="نام محصول یا خدمات"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">مبلغ</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm"
                  placeholder="مبلغ به تومان"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">روش پرداخت</label>
                <select className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm">
                  <option>کارت بانکی</option>
                  <option>درگاه پرداخت</option>
                  <option>انتقال بانکی</option>
                  <option>نقدی</option>
                  <option>چک</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">وضعیت</label>
                <select className="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white backdrop-blur-sm">
                  <option value="completed">تکمیل شده</option>
                  <option value="pending">در انتظار</option>
                  <option value="cancelled">لغو شده</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddSaleModal(false)}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors duration-300 shadow-lg"
              >
                ثبت فروش
              </button>
              <button 
                onClick={() => setShowAddSaleModal(false)}
                className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-colors duration-300 backdrop-blur-sm"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPanel;