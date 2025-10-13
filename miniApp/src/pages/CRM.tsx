import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Filter, Download, Plus, Search,
  MessageCircle,
  Send, X, Phone, Upload, Copy
} from 'lucide-react';

type LeadStatus = 'cold' | 'warm' | 'hot';

type Lead = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  country?: string;
  status: LeadStatus;
  lastInteraction: string;
  estimatedValue: number;
  score: number; // 1..5
  notes?: Array<{ text: string; timestamp: string }>;
  interactions?: Array<{ type: 'call' | 'whatsapp' | 'sms' | 'meeting'; text: string; timestamp: string }>;
  upcoming?: Array<{ type: 'call' | 'whatsapp' | 'sms' | 'meeting'; due: string; text: string }>;
};

// No default data - start completely empty
const mockLeads: Lead[] = [];

const formatCurrency = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const conf = {
    cold: { text: 'سرد', cls: 'text-gray-300 bg-gray-700/40 border-gray-600/50' },
    warm: { text: 'نیمه‌گرم', cls: 'text-yellow-300 bg-yellow-600/20 border-yellow-500/30' },
    hot: { text: 'آماده خرید', cls: 'text-emerald-300 bg-emerald-600/20 border-emerald-500/30' }
  }[status];
  return (
    <span className={`px-2 py-1 rounded-full text-xs border ${conf.cls}`}>{conf.text}</span>
  );
};

const CRM: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedTab, setSelectedTab] = React.useState<'overview' | 'leads' | 'tasks'>('overview');
  
  // Load leads from localStorage
  const [leads, setLeads] = React.useState<Lead[]>(() => {
    const saved = localStorage.getItem('crm-leads');
    return saved ? JSON.parse(saved) : mockLeads;
  });
  
  const [customSalesAmount, setCustomSalesAmount] = React.useState(() => {
    const saved = localStorage.getItem('crm-custom-sales');
    return saved || '';
  });

  // Save leads to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('crm-leads', JSON.stringify(leads));
  }, [leads]);

  // Save custom sales amount to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('crm-custom-sales', customSalesAmount);
  }, [customSalesAmount]);

  // Check for navigation state to set the correct tab
  React.useEffect(() => {
    if (location.state?.tab) {
      setSelectedTab(location.state.tab);
    }
  }, [location.state]);

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | LeadStatus>('all');
  const [showLead, setShowLead] = React.useState<Lead | null>(null);
  const [note, setNote] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [newLead, setNewLead] = React.useState<{name: string; phone: string; email: string; country: string; estimatedValue: string; status: LeadStatus}>({
    name: '', phone: '', email: '', country: 'IR', estimatedValue: '', status: 'cold'
  });

  const filteredLeads = leads.filter(l => {
    const matchesQuery = !query || l.name.includes(query) || l.phone?.includes(query) || l.email?.includes(query);
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summary = React.useMemo(() => {
    const leadsCount = leads.length;
    const hotLeads = leads.filter(l => l.status === 'hot');
    const calculatedSales = hotLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    const salesThisMonth = customSalesAmount ? parseInt(customSalesAmount.replace(/,/g, '')) || calculatedSales : calculatedSales;
    const avgValue = leadsCount ? Math.round(leads.reduce((a, l) => a + (l.estimatedValue || 0), 0) / leadsCount) : 0;
    return {
      salesThisMonth,
      leadsCount,
      newToday: 0,
      hotLeads: hotLeads.length,
      avgValue
    };
  }, [leads, customSalesAmount]);

  const pipeline = React.useMemo(() => ({
    cold: leads.filter(l => l.status === 'cold').length,
    warm: leads.filter(l => l.status === 'warm').length,
    hot: leads.filter(l => l.status === 'hot').length,
  }), [leads]);

  const changeStatus = (leadId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      const order: LeadStatus[] = ['cold', 'warm', 'hot'];
      const idx = order.indexOf(l.status);
      return { ...l, status: order[(idx + 1) % order.length] };
    }));
  };

  const addLead = () => {
    if (!newLead.name || (!newLead.phone && !newLead.email)) return;
    const created: Lead = {
      id: 'L-' + Math.floor(1000 + Math.random() * 9000).toString(),
      name: newLead.name,
      phone: newLead.phone || undefined,
      email: newLead.email || undefined,
      country: newLead.country || 'IR',
      status: newLead.status,
      lastInteraction: 'همین حالا',
      estimatedValue: parseInt(newLead.estimatedValue || '0') || 0,
      score: 3,
      notes: [],
      interactions: [],
      upcoming: []
    };
    setLeads(prev => [created, ...prev]);
    setShowAdd(false);
    setNewLead({ name: '', phone: '', email: '', country: 'IR', estimatedValue: '', status: 'cold' });
  };

  const addInteraction = (leadId: string, type: 'call' | 'whatsapp' | 'sms' | 'meeting', text: string) => {
    const ts = new Date().toLocaleString('fa-IR');
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        interactions: [...(l.interactions || []), { type, text, timestamp: ts }],
        lastInteraction: 'همین حالا'
      };
    }));
  };

  const updateLeadScore = (leadId: string, newScore: number) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return { ...l, score: newScore };
    }));
  };

  const updateLeadValue = (leadId: string, newValue: number) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return { ...l, estimatedValue: newValue };
    }));
  };

  // Helper functions for communication
  const callNumber = (phone?: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const smsNumber = (phone?: string) => {
    if (phone) {
      window.open(`sms:${phone}`, '_self');
    }
  };

  const openWhatsApp = (message: string, phone?: string) => {
    if (phone) {
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    }
  };

  const copyNumber = (phone?: string) => {
    if (phone) {
      navigator.clipboard.writeText(phone);
    }
  };

  const clearAllData = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های CRM را پاک کنید؟ این عمل قابل بازگشت نیست.')) {
      localStorage.removeItem('crm-leads');
      localStorage.removeItem('crm-custom-sales');
      setLeads([]);
      setCustomSalesAmount('');
    }
  };

  const exportAllData = () => {
    const data = {
      leads: leads,
      customSalesAmount: customSalesAmount,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.leads && Array.isArray(data.leads)) {
              setLeads(data.leads);
              if (data.customSalesAmount) {
                setCustomSalesAmount(data.customSalesAmount);
              }
              alert('داده‌ها با موفقیت وارد شدند!');
            } else {
              alert('فایل نامعتبر است!');
            }
          } catch (error) {
            alert('خطا در خواندن فایل!');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const exportSimple = () => {
    const header = 'id,name,phone,email,country,status,lastInteraction,estimatedValue,score\n';
    const rows = leads.map(l => `${l.id},${l.name},${l.phone || ''},${l.email || ''},${l.country || ''},${l.status},${l.lastInteraction},${l.estimatedValue},${l.score}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
          >
            <X size={20} className="text-white" />
          </button>
          <div className="text-right flex-1 mr-4">
            <h1 className="text-xl font-bold text-white mb-1">CRM</h1>
            <p className="text-xs text-gray-300">مدیریت مشتریان</p>
          </div>
          <div className="w-12"></div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-4 max-w-md mx-auto">
          <div className="flex gap-2">
            <button onClick={() => setSelectedTab('overview')} className={`py-2 rounded-xl border ${selectedTab==='overview' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>داشبورد</button>
            <button onClick={() => setSelectedTab('leads')} className={`py-2 rounded-xl border ${selectedTab==='leads' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>مدیریت لیدها</button>
            <button onClick={() => setSelectedTab('tasks')} className={`py-2 rounded-xl border ${selectedTab==='tasks' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>وظایف و پیگیری‌ها</button>
          </div>
        </div>
      </div>

      <div className="pt-40 max-w-md mx-auto p-4 space-y-6">
        {selectedTab === 'overview' && (
          <>
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-6">📊</div>
                <h2 className="text-2xl font-bold text-white mb-4">خوش آمدید به CRM</h2>
                <p className="text-gray-400 mb-8">برای شروع، اولین مشتری خود را اضافه کنید</p>
                <button 
                  onClick={() => setSelectedTab('leads')} 
                  className="px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition"
                >
                  شروع کنید
                </button>
              </div>
            ) : (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {/* فروش این ماه */}
                  <div 
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/20 p-4"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-emerald-300 text-xs font-medium">فروش این ماه</div>
                        <div className="text-emerald-400 text-xs">💰</div>
                      </div>
                      <div className="text-white font-bold text-lg">{formatCurrency(summary.salesThisMonth)}</div>
                      <div className="text-emerald-400 text-xs mt-1">+12% نسبت به ماه قبل</div>
                    </div>
                  </div>

                  {/* تعداد لیدها */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent border border-blue-500/20 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-blue-300 text-xs font-medium">تعداد لیدها</div>
                        <div className="text-blue-400 text-xs">👥</div>
                      </div>
                      <div className="text-white font-bold text-lg">{summary.leadsCount}</div>
                      <div className="text-blue-400 text-xs mt-1">+3 این هفته</div>
                    </div>
                  </div>

                  {/* لیدهای آماده خرید */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-transparent border border-orange-500/20 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-orange-300 text-xs font-medium">آماده خرید</div>
                        <div className="text-orange-400 text-xs">🚀</div>
                      </div>
                      <div className="text-white font-bold text-lg">{summary.hotLeads}</div>
                      <div className="text-orange-400 text-xs mt-1">
                        <span className="text-orange-400 text-xs font-medium">{Math.round((summary.hotLeads / Math.max(summary.leadsCount,1)) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* میانگین ارزش */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent border border-purple-500/20 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-purple-300 text-xs font-medium">میانگین ارزش</div>
                        <div className="text-purple-400 text-xs">💎</div>
                      </div>
                      <div className="text-white font-bold text-lg">{formatCurrency(summary.avgValue)}</div>
                      <div className="text-purple-400 text-xs mt-1">+8% نسبت به قبل</div>
                    </div>
                  </div>
                </div>

                {/* Pipeline */}
                <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                  <h3 className="text-lg font-bold text-white mb-6">Pipeline فروش</h3>
                  
                  <div className="space-y-3">
                    {/* Cold Leads */}
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-600/30 flex items-center justify-center">
                          <span className="text-gray-300 text-sm">❄️</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">لیدهای سرد</div>
                          <div className="text-gray-400 text-xs">نیاز به گرم کردن</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">{pipeline.cold}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.cold / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>

                    {/* Warm Leads */}
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-yellow-600/30 flex items-center justify-center">
                          <span className="text-yellow-300 text-sm">🔥</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">لیدهای نیمه‌گرم</div>
                          <div className="text-gray-400 text-xs">در حال پیگیری</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">{pipeline.warm}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.warm / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>

                    {/* Hot Leads */}
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600/30 flex items-center justify-center">
                          <span className="text-emerald-300 text-sm">🚀</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">لیدهای آماده خرید</div>
                          <div className="text-gray-400 text-xs">آماده برای بستن</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">{pipeline.hot}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.hot / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {selectedTab === 'leads' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 flex items-center gap-3 border border-gray-700/60 rounded-2xl px-4 py-3 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Search size={18} className="text-gray-300" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو (نام، ایمیل، شماره)" className="flex-1 bg-transparent text-base text-white placeholder-gray-400 outline-none" />
              </div>
              <button onClick={() => setStatusFilter(s => s==='all' ? 'hot' : s==='hot' ? 'warm' : s==='warm' ? 'cold' : 'all')} className="px-4 py-3 rounded-2xl border border-gray-700/60 text-sm text-gray-200 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Filter size={16} />
                {statusFilter==='all' ? 'همه' : statusFilter==='hot' ? 'آماده' : statusFilter==='warm' ? 'نیمه‌گرم' : 'سرد'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 mb-6">
              <button onClick={() => setShowAdd(true)} className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center gap-2">
                <Plus size={18} /> افزودن لید جدید
              </button>
              <button onClick={exportSimple} className="px-4 py-3 rounded-2xl text-sm border text-gray-200 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Download size={16} /> خروجی اکسل
              </button>
              <button onClick={exportAllData} className="px-4 py-3 rounded-2xl text-sm border text-gray-200 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Download size={16} /> پشتیبان‌گیری کامل
              </button>
              <button onClick={importData} className="px-4 py-3 rounded-2xl text-sm border text-blue-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-blue-500/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Upload size={16} /> وارد کردن داده‌ها
              </button>
              <button onClick={clearAllData} className="px-4 py-3 rounded-2xl text-sm border text-red-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-red-500/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <X size={16} /> پاک کردن همه داده‌ها
              </button>
            </div>

            <div className="space-y-4">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-4">📋</div>
                  <h3 className="text-xl font-bold text-white mb-2">هنوز مشتری اضافه نکرده‌اید</h3>
                  <p className="text-gray-400 mb-6">برای شروع، اولین مشتری خود را اضافه کنید</p>
                  <button 
                    onClick={() => setShowAdd(true)} 
                    className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center gap-2 mx-auto"
                  >
                    <Plus size={18} /> افزودن اولین مشتری
                  </button>
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <div key={lead.id} className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg relative overflow-hidden hover:scale-[1.01] transition-all" style={{ backgroundColor: '#10091c' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white text-lg font-bold truncate">{lead.name}</span>
                          <StatusBadge status={lead.status} />
                        </div>
                        <div className="text-sm text-gray-300 mb-1 truncate">{lead.phone || lead.email}</div>
                        <div className="text-xs text-gray-400">آخرین تعامل: {lead.lastInteraction}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-lg">{formatCurrency(lead.estimatedValue)}</div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-sm ${lead.score >= star ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigate('/lead-profile', { state: { lead } })} className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white border border-white/10 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg">پروفایل</button>
                      <button onClick={() => changeStatus(lead.id)} className="px-4 py-3 rounded-2xl text-sm border text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>تغییر وضعیت</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {selectedTab === 'tasks' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-white mb-4">وظایف و پیگیری‌ها</h2>
            <p className="text-gray-400 mb-8">این بخش به زودی اضافه خواهد شد</p>
          </div>
        )}

        {/* Add Lead Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-6">افزودن مشتری جدید</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">نام *</label>
                    <input
                      value={newLead.name}
                      onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400"
                      placeholder="نام مشتری"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">شماره تلفن</label>
                    <input
                      value={newLead.phone}
                      onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400"
                      placeholder="09123456789"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">ایمیل</label>
                    <input
                      value={newLead.email}
                      onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400"
                      placeholder="example@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">ارزش تخمینی (تومان)</label>
                    <input
                      value={newLead.estimatedValue}
                      onChange={(e) => setNewLead(prev => ({ ...prev, estimatedValue: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400"
                      placeholder="1000000"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">وضعیت</label>
                    <select
                      value={newLead.status}
                      onChange={(e) => setNewLead(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white"
                    >
                      <option value="cold">سرد</option>
                      <option value="warm">نیمه‌گرم</option>
                      <option value="hot">آماده خرید</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button onClick={addLead} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-sm font-bold border border-white/10">افزودن</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-3 bg-gray-800/70 text-gray-200 rounded-xl text-sm font-bold border border-gray-700/60">انصراف</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lead Detail Modal */}
        {showLead && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: '#10091c' }}>
              <div className="p-4 border-b border-gray-700/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{showLead.name}</h3>
                  <button onClick={() => setShowLead(null)} className="p-2 hover:bg-gray-700/50 rounded-xl transition">
                    <X size={20} className="text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-5 overflow-y-auto flex-1 pb-24">
                {/* Quick actions row */}
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => {
                    callNumber(showLead.phone);
                    addInteraction(showLead.id, 'call', 'تماس تلفنی انجام شد');
                  }} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center justify-center gap-1 border border-gray-700/60">
                    <Phone size={16} />
                    <span>تماس</span>
                  </button>
                  <button onClick={() => {
                    openWhatsApp(`سلام ${showLead.name} عزیز! من از مانیتایزAI هستم. دوست دارید یک گفت‌وگوی کوتاه داشته باشیم؟`, showLead.phone);
                    addInteraction(showLead.id, 'whatsapp', 'پیام واتساپ ارسال شد');
                  }} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex flex-col items-center justify-center gap-1 border border-emerald-600/60">
                    <Send size={16} />
                    <span>واتساپ</span>
                  </button>
                  <button onClick={() => {
                    smsNumber(showLead.phone);
                    addInteraction(showLead.id, 'sms', 'پیامک ارسال شد');
                  }} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-indigo-600/60 to-indigo-700/60 text-white flex flex-col items-center justify-center gap-1 border border-indigo-500/60">
                    <MessageCircle size={16} />
                    <span>پیامک</span>
                  </button>
                  <button onClick={() => copyNumber(showLead.phone)} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center justify-center gap-1 border border-gray-700/60">
                    <Copy size={16} />
                    <span>کپی</span>
                  </button>
                </div>

                {/* Notes input and history */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">یادداشت جدید:</h4>
                  <textarea 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    placeholder="اینجا بنویس چه قراری گذاشتی یا چی گفت..." 
                    className="w-full h-20 px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-600/50 text-xs text-white placeholder-gray-400"
                  ></textarea>
                  
                  {/* Interactions history */}
                  {showLead.interactions && showLead.interactions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white">تاریخچه تعاملات:</h4>
                      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-3">
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {[...showLead.interactions].reverse().map((interaction, i) => (
                            <div key={i} className="text-xs text-gray-300 border-b border-gray-700/30 pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  interaction.type === 'call' ? 'bg-blue-600/20 text-blue-300' :
                                  interaction.type === 'whatsapp' ? 'bg-emerald-600/20 text-emerald-300' :
                                  interaction.type === 'sms' ? 'bg-indigo-600/20 text-indigo-300' :
                                  'bg-purple-600/20 text-purple-300'
                                }`}>
                                  {interaction.type === 'call' ? 'تماس' :
                                   interaction.type === 'whatsapp' ? 'واتساپ' :
                                   interaction.type === 'sms' ? 'پیامک' : 'جلسه'}
                                </span>
                                <span className="text-gray-400">{interaction.timestamp}</span>
                              </div>
                              <div>{interaction.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes history */}
                  {showLead.notes && showLead.notes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white">یادداشت‌های قبلی:</h4>
                      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-3">
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {[...showLead.notes].reverse().map((n, i) => (
                            <div key={i} className="text-xs text-gray-300 border-b border-gray-700/30 pb-2">
                              <div className="text-gray-400 mb-1">{n.timestamp}</div>
                              <div>{n.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Score and Value Management */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white">امتیاز مشتری:</h4>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => updateLeadScore(showLead.id, score)}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 ${
                            showLead.score >= score
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white">ارزش تخمینی:</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={showLead.estimatedValue}
                        onChange={(e) => updateLeadValue(showLead.id, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-xs text-white"
                        placeholder="مبلغ به تومان"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-700/60 pt-3">
                  <button onClick={() => { 
                    if (showLead && note.trim()) { 
                      const ts = new Date().toLocaleString('fa-IR'); 
                      const updated = { 
                        ...showLead, 
                        notes: [...(showLead.notes || []), { text: note.trim(), timestamp: ts }],
                        lastInteraction: 'همین حالا'
                      }; 
                      setNote(''); 
                      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l)); 
                      setShowLead(updated);
                    } 
                  }} className="px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-sm font-bold border border-white/10">ذخیره یادداشت</button>
                  <button onClick={() => setShowLead(null)} className="px-4 py-3 bg-gray-800/70 text-gray-200 rounded-xl text-sm font-bold border border-gray-700/60">بستن</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRM;