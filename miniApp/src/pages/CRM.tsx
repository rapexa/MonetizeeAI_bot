import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, Flame, TrendingUp, Filter, Download, Plus, Search,
  MessageCircle, Star, Upload,
  Send, X, Phone, Clock, Copy
} from 'lucide-react';

type LeadStatus = 'cold' | 'warm' | 'hot' | 'converted';

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

type Task = {
  id: string;
  title: string;
  leadId?: string;
  leadName?: string;
  due: string; // ISO
  status: 'pending' | 'done' | 'overdue';
  note?: string;
  type: 'call' | 'whatsapp' | 'sms' | 'meeting';
  createdAt: string;
};

// No default data - start completely empty
const mockLeads: Lead[] = [];

const formatCurrency = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const conf = {
    cold: { text: 'سرد', cls: 'text-gray-300 bg-gray-700/40 border-gray-600/50' },
    warm: { text: 'نیمه‌گرم', cls: 'text-yellow-300 bg-yellow-600/20 border-yellow-500/30' },
    hot: { text: 'آماده خرید', cls: 'text-emerald-300 bg-emerald-600/20 border-emerald-500/30' },
    converted: { text: 'تبدیل شده', cls: 'text-blue-300 bg-blue-600/20 border-blue-500/30' }
  }[status];
  return (
    <span className={`px-2 py-1 rounded-full text-xs border ${conf.cls}`}>{conf.text}</span>
  );
};

const CRM: React.FC = () => {
  const navigate = useNavigate();

  const [selectedTab, setSelectedTab] = React.useState<'overview' | 'leads' | 'tasks'>('overview');
  
  // تابع کمکی برای تبدیل تاریخ‌های قدیمی به فرمت ISO
  const convertOldDates = (oldLeads: Lead[]): Lead[] => {
    return oldLeads.map(lead => {
      // اگر lastInteraction فرمت ISO نباشد (با - شروع نشود)، آن را به امروز تبدیل می‌کنیم
      if (!lead.lastInteraction.includes('-')) {
        return {
          ...lead,
          lastInteraction: new Date().toISOString()
        };
      }
      return lead;
    });
  };

  // Load leads from localStorage
  const [leads, setLeads] = React.useState<Lead[]>(() => {
    const saved = localStorage.getItem('crm-leads');
    // تبدیل تاریخ‌های قدیمی به فرمت جدید
    return saved ? convertOldDates(JSON.parse(saved)) : mockLeads;
  });
  
  const [customSalesAmount, setCustomSalesAmount] = React.useState(() => {
    const saved = localStorage.getItem('crm-custom-sales');
    return saved || '';
  });

  // Load tasks from localStorage
  const [allTasks, setAllTasks] = React.useState<Task[]>(() => {
    const saved = localStorage.getItem('crm-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // Save leads to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('crm-leads', JSON.stringify(leads));
  }, [leads]);

  // Save custom sales amount to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('crm-custom-sales', customSalesAmount);
  }, [customSalesAmount]);

  // Save tasks to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('crm-tasks', JSON.stringify(allTasks));
  }, [allTasks]);

  // Sync showLead with leads when leads changes
  React.useEffect(() => {
    if (showLead) {
      const updatedLead = leads.find(l => l.id === showLead.id);
      if (updatedLead) {
        setShowLead(updatedLead);
      }
    }
  }, [leads]);

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | LeadStatus>('all');
  const [showLead, setShowLead] = React.useState<Lead | null>(null);
  const [note, setNote] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [newLead, setNewLead] = React.useState<{name: string; phone: string; email: string; country: string; estimatedValue: string; status: LeadStatus}>({
    name: '', phone: '', email: '', country: 'IR', estimatedValue: '', status: 'cold'
  });

  const [showAddTask, setShowAddTask] = React.useState(false);
  const [newTask, setNewTask] = React.useState<{
    title: string;
    leadId: string;
    due: string;
    status: 'pending' | 'done' | 'overdue';
    note: string;
    type: 'call' | 'whatsapp' | 'sms' | 'meeting';
  }>({
    title: '',
    leadId: '',
    due: '',
    status: 'pending',
    note: '',
    type: 'call'
  });

  const filteredLeads = leads.filter(l => {
    const matchesQuery = !query || l.name.includes(query) || l.phone?.includes(query) || l.email?.includes(query);
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summary = React.useMemo(() => {
    const leadsCount = leads.length;
    const hotLeads = leads.filter(l => l.status === 'hot');
    const convertedLeads = leads.filter(l => l.status === 'converted');
    
    // استفاده از لیدهای تبدیل شده به جای لیدهای داغ برای محاسبه فروش
    const calculatedSales = convertedLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    const salesThisMonth = customSalesAmount ? parseInt(customSalesAmount.replace(/,/g, '')) || calculatedSales : calculatedSales;
    
    // جمع ارزش همه لیدها به جز لیدهای تبدیل شده
    const nonConvertedLeads = leads.filter(l => l.status !== 'converted');
    const totalLeadValue = nonConvertedLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    
    return {
      salesThisMonth,
      leadsCount,
      newToday: 0,
      hotLeads: hotLeads.length,
      convertedLeads: convertedLeads.length,
      totalLeadValue // جمع ارزش لیدها به جای میانگین ارزش
    };
  }, [leads, customSalesAmount]);

  const pipeline = React.useMemo(() => ({
    cold: leads.filter(l => l.status === 'cold').length,
    warm: leads.filter(l => l.status === 'warm').length,
    hot: leads.filter(l => l.status === 'hot').length,
    converted: leads.filter(l => l.status === 'converted').length,
  }), [leads]);

  const changeStatus = (leadId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      const order: LeadStatus[] = ['cold', 'warm', 'hot', 'converted'];
      const idx = order.indexOf(l.status);
      return { ...l, status: order[(idx + 1) % order.length] };
    }));
  };

  const addLead = () => {
    if (!newLead.name || (!newLead.phone && !newLead.email)) return;
    // استفاده از تاریخ امروز به فرمت ISO
    const today = new Date().toISOString();
    const created: Lead = {
      id: 'L-' + Math.floor(1000 + Math.random() * 9000).toString(),
      name: newLead.name,
      phone: newLead.phone || undefined,
      email: newLead.email || undefined,
      country: newLead.country || 'IR',
      status: newLead.status,
      lastInteraction: today, // ذخیره تاریخ به فرمت ISO
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

  const addTask = () => {
    if (!newTask.title || !newTask.due) return;
    
    const leadName = newTask.leadId ? leads.find(l => l.id === newTask.leadId)?.name : undefined;
    
    const created: Task = {
      id: 'T-' + Math.floor(1000 + Math.random() * 9000).toString(),
      title: newTask.title,
      leadId: newTask.leadId || undefined,
      leadName: leadName,
      due: new Date(newTask.due).toISOString(),
      status: newTask.status,
      note: newTask.note || undefined,
      type: newTask.type,
      createdAt: new Date().toISOString()
    };
    
    setAllTasks(prev => [created, ...prev]);
    setShowAddTask(false);
    setNewTask({
      title: '',
      leadId: '',
      due: '',
      status: 'pending',
      note: '',
      type: 'call'
    });
  };

  const addInteraction = (leadId: string, type: 'call' | 'whatsapp' | 'sms' | 'meeting', text: string) => {
    const ts = new Date().toLocaleString('fa-IR');
    const updatedLead = leads.find(l => l.id === leadId);
    if (updatedLead) {
      const newLead = {
        ...updatedLead,
        interactions: [...(updatedLead.interactions || []), { type, text, timestamp: ts }],
        lastInteraction: new Date().toISOString()
      };
      syncLeadWithState(newLead);
    }
  };

  const updateLeadScore = (leadId: string, newScore: number) => {
    const updatedLead = leads.find(l => l.id === leadId);
    if (updatedLead) {
      const newLead = { ...updatedLead, score: newScore };
      syncLeadWithState(newLead);
    }
  };

  const updateLeadValue = (leadId: string, newValue: number) => {
    const updatedLead = leads.find(l => l.id === leadId);
    if (updatedLead) {
      const newLead = { ...updatedLead, estimatedValue: newValue };
      syncLeadWithState(newLead);
    }
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

  // Sync showLead with leads state
  const syncLeadWithState = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setShowLead(updatedLead);
  };

  const clearAllData = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های CRM را پاک کنید؟ این عمل قابل بازگشت نیست.')) {
      localStorage.removeItem('crm-leads');
      localStorage.removeItem('crm-custom-sales');
      localStorage.removeItem('crm-tasks');
      setLeads([]);
      setCustomSalesAmount('');
      setAllTasks([]);
    }
  };

  const exportAllData = () => {
    const data = {
      leads: leads,
      customSalesAmount: customSalesAmount,
      tasks: allTasks,
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
              if (data.tasks && Array.isArray(data.tasks)) {
                setAllTasks(data.tasks);
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
        <div className="flex items-center justify-between p-3 sm:p-4 mx-auto max-w-md">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
          >
            <X size={18} className="text-white sm:w-5 sm:h-5" />
          </button>
          <div className="text-right flex-1 mr-3 sm:mr-4">
            <h1 className="text-lg sm:text-xl font-bold text-white mb-1">CRM</h1>
            <p className="text-xs text-gray-300">مدیریت مشتریان</p>
          </div>
          <div className="w-10 sm:w-12"></div>
        </div>

        {/* Tab Navigation */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 mx-auto max-w-md">
          <div className="flex gap-1 sm:gap-2">
            <button onClick={() => setSelectedTab('overview')} className={`flex-1 py-2 px-2 sm:px-3 rounded-xl border text-xs sm:text-sm ${selectedTab==='overview' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>داشبورد</button>
            <button onClick={() => setSelectedTab('leads')} className={`flex-1 py-2 px-2 sm:px-3 rounded-xl border text-xs sm:text-sm ${selectedTab==='leads' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>مدیریت لیدها</button>
            <button onClick={() => setSelectedTab('tasks')} className={`flex-1 py-2 px-2 sm:px-3 rounded-xl border text-xs sm:text-sm ${selectedTab==='tasks' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>وظایف و پیگیری</button>
          </div>
        </div>
      </div>

      <div className="pt-32 sm:pt-40 mx-auto max-w-md p-3 sm:p-4 space-y-4 sm:space-y-6">
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
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/20 p-4 cursor-pointer hover:border-emerald-500/40 transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-emerald-300 text-xs font-medium">فروش این ماه</div>
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <TrendingUp size={14} className="text-white" />
                        </div>
                      </div>
                      <div className="text-white font-bold text-lg mb-2">{formatCurrency(summary.salesThisMonth)}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: '75%' }}></div>
                        </div>
                        <span className="text-emerald-400 text-xs font-medium">+12%</span>
                      </div>
                    </div>
                  </div>

                  {/* کل لیدها */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent border border-blue-500/20 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-blue-300 text-xs font-medium">کل لیدها</div>
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Users size={14} className="text-white" />
                        </div>
                      </div>
                      <div className="text-white font-bold text-lg mb-2">{summary.leadsCount}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-blue-400 text-xs font-medium">+8%</span>
                      </div>
                    </div>
                  </div>

                  {/* لیدهای داغ */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-transparent border border-orange-500/20 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-orange-300 text-xs font-medium">لیدهای داغ</div>
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                          <Flame size={14} className="text-white" />
                        </div>
                      </div>
                      <div className="text-white font-bold text-lg mb-2">{summary.hotLeads}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-orange-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: '45%' }}></div>
                        </div>
                        <span className="text-orange-400 text-xs font-medium">{Math.round((summary.hotLeads / Math.max(summary.leadsCount,1)) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* جمع ارزش لیدها */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent border border-purple-500/20 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-purple-300 text-xs font-medium">جمع ارزش لیدها</div>
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <BarChart3 size={14} className="text-white" />
                        </div>
                      </div>
                      <div className="text-white font-bold text-lg mb-2">{formatCurrency(summary.totalLeadValue)}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: '80%' }}></div>
                        </div>
                        <span className="text-purple-400 text-xs font-medium">+15%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipeline */}
                <div className="backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-white">پایپلاین فروش</h3>
                  <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF]"></div>
                    <span className="text-xs text-gray-300">وضعیت فعلی</span>
                  </div>
                </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    {/* Cold Leads */}
                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gray-600/30 flex items-center justify-center">
                          <span className="text-gray-300 text-xs sm:text-sm">❄️</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-xs sm:text-sm">لیدهای سرد</div>
                          <div className="text-gray-400 text-xs">نیاز به گرم کردن</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm sm:text-lg">{pipeline.cold}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.cold / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>

                    {/* Warm Leads */}
                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-yellow-600/30 flex items-center justify-center">
                          <span className="text-yellow-300 text-xs sm:text-sm">🔥</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-xs sm:text-sm">لیدهای نیمه‌گرم</div>
                          <div className="text-gray-400 text-xs">در حال پیگیری</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm sm:text-lg">{pipeline.warm}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.warm / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>

                    {/* Hot Leads */}
                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-600/30 flex items-center justify-center">
                          <span className="text-emerald-300 text-xs sm:text-sm">🚀</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-xs sm:text-sm">لیدهای آماده خرید</div>
                          <div className="text-gray-400 text-xs">آماده برای بستن</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm sm:text-lg">{pipeline.hot}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.hot / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>
                    
                    {/* Converted Leads */}
                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-600/30 flex items-center justify-center">
                          <span className="text-blue-300 text-xs sm:text-sm">💰</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-xs sm:text-sm">لیدهای تبدیل شده</div>
                          <div className="text-gray-400 text-xs">فروش موفق</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm sm:text-lg">{pipeline.converted}</div>
                        <div className="text-xs text-gray-400">{Math.round((pipeline.converted / Math.max(summary.leadsCount,1)) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Chart */}
                <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">روند فروش و لیدهای جدید</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF]"></div>
                      <span className="text-xs text-gray-300">آخرین ۷ روز</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#7c3aed]"></div>
                      <span className="text-xs text-gray-300">لیدهای جدید</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                      <span className="text-xs text-gray-300">تعداد فروش</span>
                    </div>
                  </div>
                  <MiniLineChart leads={leads} />
                </div>

                {/* Quick Actions */}
                <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                  <h3 className="text-lg font-bold text-white mb-4">عملیات سریع</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSelectedTab('leads')}
                      className="p-4 rounded-2xl border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl shadow-lg" 
                      style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Users size={18} className="text-white" />
                        </div>
                        <span className="text-white text-sm font-medium">مدیریت لیدها</span>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setSelectedTab('tasks')}
                      className="p-4 rounded-2xl border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl shadow-lg" 
                      style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                          <MessageCircle size={18} className="text-white" />
                        </div>
                        <span className="text-white text-sm font-medium">وظایف و پیگیری</span>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {selectedTab === 'leads' && (
          <>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex-1 flex items-center gap-2 sm:gap-3 border border-gray-700/60 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Search size={16} className="text-gray-300 sm:w-[18px] sm:h-[18px]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو (نام، ایمیل، شماره)" className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-gray-400 outline-none" />
              </div>
              <button onClick={() => setStatusFilter(s => s==='all' ? 'hot' : s==='hot' ? 'warm' : s==='warm' ? 'cold' : 'all')} className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-gray-700/60 text-xs sm:text-sm text-gray-200 flex items-center gap-1 sm:gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <Filter size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{statusFilter==='all' ? 'همه' : statusFilter==='hot' ? 'آماده' : statusFilter==='warm' ? 'نیمه‌گرم' : 'سرد'}</span>
                <span className="sm:hidden">{statusFilter==='all' ? 'همه' : statusFilter==='hot' ? 'آماده' : statusFilter==='warm' ? 'گرم' : 'سرد'}</span>
              </button>
            </div>

            {/* Mobile: Stack buttons vertically, Desktop: Horizontal */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2 sm:gap-4 mb-4 sm:mb-6">
              <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center justify-center gap-2">
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> افزودن لید جدید
              </button>
              
              {/* Mobile: Grid of small buttons */}
              <div className="grid grid-cols-2 gap-2 sm:hidden">
                <button onClick={exportSimple} className="px-3 py-2 rounded-xl text-xs border text-gray-200 flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <Download size={14} /> اکسل
                </button>
                <button onClick={exportAllData} className="px-3 py-2 rounded-xl text-xs border text-gray-200 flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <Download size={14} /> پشتیبان
                </button>
                <button onClick={importData} className="px-3 py-2 rounded-xl text-xs border text-blue-300 flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-blue-500/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <Upload size={14} /> وارد کردن
                </button>
                <button onClick={clearAllData} className="px-3 py-2 rounded-xl text-xs border text-red-300 flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-red-500/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <X size={14} /> پاک کردن
                </button>
              </div>
              
              {/* Desktop: Horizontal buttons */}
              <div className="hidden sm:flex sm:items-center sm:gap-2">
                <button onClick={exportSimple} className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm border text-gray-200 flex items-center gap-1 sm:gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <Download size={14} className="sm:w-4 sm:h-4" /> خروجی اکسل
                </button>
                <button onClick={exportAllData} className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm border text-gray-200 flex items-center gap-1 sm:gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <Download size={14} className="sm:w-4 sm:h-4" /> پشتیبان‌گیری کامل
                </button>
                <button onClick={importData} className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm border text-blue-300 flex items-center gap-1 sm:gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-blue-500/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <Upload size={14} className="sm:w-4 sm:h-4" /> وارد کردن داده‌ها
                </button>
                <button onClick={clearAllData} className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm border text-red-300 flex items-center gap-1 sm:gap-2 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-red-500/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <X size={14} className="sm:w-4 sm:h-4" /> پاک کردن همه داده‌ها
                </button>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📋</div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">هنوز مشتری اضافه نکرده‌اید</h3>
                  <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">برای شروع، اولین مشتری خود را اضافه کنید</p>
                  <button 
                    onClick={() => setShowAdd(true)} 
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center gap-2 mx-auto"
                  >
                    <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> افزودن اولین مشتری
                  </button>
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <div key={lead.id} className="backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-700/60 shadow-lg relative overflow-hidden hover:scale-[1.01] transition-all" style={{ backgroundColor: '#10091c' }}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <span className="text-white text-base sm:text-lg font-bold truncate">{lead.name}</span>
                          <StatusBadge status={lead.status} />
                        </div>
                        <div className="text-xs sm:text-sm text-gray-300 mb-1 truncate">{lead.phone || lead.email}</div>
                        <div className="text-xs text-gray-400">آخرین تعامل: {new Date(lead.lastInteraction).toLocaleDateString('fa-IR')}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-sm sm:text-lg">{formatCurrency(lead.estimatedValue)}</div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-xs sm:text-sm ${lead.score >= star ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button onClick={() => navigate('/lead-profile', { state: { lead } })} className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white border border-white/10 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg">پروفایل</button>
                      <button onClick={() => changeStatus(lead.id)} className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm border text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>تغییر وضعیت</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {selectedTab === 'tasks' && (
          <>
            {/* Add Task Button */}
            <div className="mb-4 sm:mb-6">
              <button 
                onClick={() => setShowAddTask(true)} 
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> افزودن وظیفه جدید
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-3 sm:space-y-4">
              {allTasks.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📝</div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">هنوز وظیفه‌ای اضافه نکرده‌اید</h3>
                  <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">برای شروع، اولین وظیفه خود را اضافه کنید</p>
                  <button 
                    onClick={() => setShowAddTask(true)} 
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center gap-2 mx-auto"
                  >
                    <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> افزودن اولین وظیفه
                  </button>
                </div>
              ) : (
                allTasks.map(task => (
                  <div key={task.id} className="backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-700/60 shadow-lg relative overflow-hidden hover:scale-[1.01] transition-all" style={{ backgroundColor: '#10091c' }}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <span className="text-white text-base sm:text-lg font-bold truncate">{task.title}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            task.status === 'pending' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30' :
                            task.status === 'done' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-red-600/20 text-red-300 border border-red-500/30'
                          }`}>
                            {task.status === 'pending' ? 'در انتظار' : 
                             task.status === 'done' ? 'انجام شد' : 'عقب افتاده'}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-300 mb-1">
                          {task.leadName ? `مربوط به: ${task.leadName}` : 'وظیفه عمومی'}
                        </div>
                        <div className="text-xs text-gray-400">
                          موعد: {new Date(task.due).toLocaleString('fa-IR')}
                        </div>
                        {task.note && (
                          <div className="text-xs text-gray-300 mt-2 p-2 bg-gray-800/40 rounded-lg">
                            {task.note}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-xs text-gray-400 mb-1">
                          {task.type === 'call' ? '📞 تماس' :
                           task.type === 'whatsapp' ? '💬 واتساپ' :
                           task.type === 'sms' ? '📱 پیامک' : '🤝 جلسه'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button 
                        onClick={() => {
                          const updatedTasks = allTasks.map(t => 
                            t.id === task.id 
                              ? { ...t, status: (t.status === 'pending' ? 'done' : 'pending') as 'pending' | 'done' | 'overdue' }
                              : t
                          );
                          setAllTasks(updatedTasks);
                        }}
                        className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium border border-white/10 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg ${
                          task.status === 'done' 
                            ? 'bg-gray-600 text-gray-200' 
                            : 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white'
                        }`}
                      >
                        {task.status === 'done' ? 'بازگشت به انتظار' : 'انجام شد'}
                      </button>
                      <button 
                        onClick={() => {
                          const updatedTasks = allTasks.filter(t => t.id !== task.id);
                          setAllTasks(updatedTasks);
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm border text-red-300 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-red-500/60 shadow-lg" 
                        style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6">افزودن وظیفه جدید</h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">عنوان وظیفه *</label>
                    <input
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="عنوان وظیفه"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">مربوط به مشتری</label>
                    <select
                      value={newTask.leadId}
                      onChange={(e) => setNewTask(prev => ({ ...prev, leadId: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm sm:text-base"
                    >
                      <option value="">وظیفه عمومی</option>
                      {leads.map(lead => (
                        <option key={lead.id} value={lead.id}>{lead.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">تاریخ و ساعت موعد *</label>
                    <input
                      type="datetime-local"
                      value={newTask.due}
                      onChange={(e) => setNewTask(prev => ({ ...prev, due: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm sm:text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">نوع وظیفه</label>
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask(prev => ({ ...prev, type: e.target.value as 'call' | 'whatsapp' | 'sms' | 'meeting' }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm sm:text-base"
                    >
                      <option value="call">📞 تماس</option>
                      <option value="whatsapp">💬 واتساپ</option>
                      <option value="sms">📱 پیامک</option>
                      <option value="meeting">🤝 جلسه</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">یادداشت</label>
                    <textarea
                      value={newTask.note}
                      onChange={(e) => setNewTask(prev => ({ ...prev, note: e.target.value }))}
                      className="w-full h-16 sm:h-20 px-3 sm:px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 text-sm sm:text-base resize-none"
                      placeholder="یادداشت اختیاری..."
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button onClick={addTask} className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-xs sm:text-sm font-bold border border-white/10">افزودن</button>
                  <button onClick={() => setShowAddTask(false)} className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800/70 text-gray-200 rounded-xl text-xs sm:text-sm font-bold border border-gray-700/60">انصراف</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Lead Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6">افزودن مشتری جدید</h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">نام *</label>
                    <input
                      value={newLead.name}
                      onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="نام مشتری"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">شماره تلفن</label>
                    <input
                      value={newLead.phone}
                      onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="09123456789"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">ایمیل</label>
                    <input
                      value={newLead.email}
                      onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="example@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">ارزش تخمینی (تومان)</label>
                    <input
                      value={newLead.estimatedValue}
                      onChange={(e) => setNewLead(prev => ({ ...prev, estimatedValue: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="1000000"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm text-gray-300 mb-2 block">وضعیت</label>
                    <select
                      value={newLead.status}
                      onChange={(e) => setNewLead(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm sm:text-base"
                    >
                      <option value="cold">سرد</option>
                      <option value="warm">نیمه‌گرم</option>
                      <option value="hot">آماده خرید</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button onClick={addLead} className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-xs sm:text-sm font-bold border border-white/10">افزودن</button>
                  <button onClick={() => setShowAdd(false)} className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800/70 text-gray-200 rounded-xl text-xs sm:text-sm font-bold border border-gray-700/60">انصراف</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lead Detail Modal */}
        {showLead && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: '#10091c' }}>
              <div className="p-3 sm:p-4 border-b border-gray-700/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-white">{showLead.name}</h3>
                  <button onClick={() => setShowLead(null)} className="p-2 hover:bg-gray-700/50 rounded-xl transition">
                    <X size={18} className="text-gray-300 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-4 sm:space-y-5 overflow-y-auto flex-1 pb-20 sm:pb-24">
                {/* Quick actions row */}
                <div className="grid grid-cols-4 gap-1 sm:gap-2">
                  <button onClick={() => {
                    callNumber(showLead.phone);
                    addInteraction(showLead.id, 'call', 'تماس تلفنی انجام شد');
                  }} className="px-2 sm:px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center justify-center gap-1 border border-gray-700/60">
                    <Phone size={14} className="sm:w-4 sm:h-4" />
                    <span>تماس</span>
                  </button>
                  <button onClick={() => {
                    openWhatsApp(`سلام ${showLead.name} عزیز! من از مانیتایزAI هستم. دوست دارید یک گفت‌وگوی کوتاه داشته باشیم؟`, showLead.phone);
                    addInteraction(showLead.id, 'whatsapp', 'پیام واتساپ ارسال شد');
                  }} className="px-2 sm:px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex flex-col items-center justify-center gap-1 border border-emerald-600/60">
                    <Send size={14} className="sm:w-4 sm:h-4" />
                    <span>واتساپ</span>
                  </button>
                  <button onClick={() => {
                    smsNumber(showLead.phone);
                    addInteraction(showLead.id, 'sms', 'پیامک ارسال شد');
                  }} className="px-2 sm:px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs bg-gradient-to-br from-indigo-600/60 to-indigo-700/60 text-white flex flex-col items-center justify-center gap-1 border border-indigo-500/60">
                    <MessageCircle size={14} className="sm:w-4 sm:h-4" />
                    <span>پیامک</span>
                  </button>
                  <button onClick={() => copyNumber(showLead.phone)} className="px-2 sm:px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center justify-center gap-1 border border-gray-700/60">
                    <Copy size={14} className="sm:w-4 sm:h-4" />
                    <span>کپی</span>
                  </button>
                </div>

                {/* Notes input and history */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white">یادداشت جدید:</h4>
                  <textarea 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    placeholder="اینجا بنویس چه قراری گذاشتی یا چی گفت..." 
                    className="w-full h-16 sm:h-20 px-2 sm:px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-600/50 text-xs text-white placeholder-gray-400"
                  ></textarea>
                  
                  {/* Interactions history */}
                  {showLead.interactions && showLead.interactions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white">تاریخچه تعاملات:</h4>
                      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-2 sm:p-3">
                        <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
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
                      <h4 className="text-xs sm:text-sm font-bold text-white">یادداشت‌های قبلی:</h4>
                      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-2 sm:p-3">
                        <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white">امتیاز مشتری:</h4>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => updateLeadScore(showLead.id, score)}
                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs font-bold transition-all duration-200 ${
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
                    <h4 className="text-xs sm:text-sm font-bold text-white">ارزش تخمینی:</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={showLead.estimatedValue}
                        onChange={(e) => updateLeadValue(showLead.id, parseInt(e.target.value) || 0)}
                        className="w-full px-2 sm:px-3 py-1 sm:py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-xs text-white"
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
                        lastInteraction: new Date().toISOString()
                      }; 
                      setNote(''); 
                      syncLeadWithState(updated);
                    } 
                  }} className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-xs sm:text-sm font-bold border border-white/10">ذخیره یادداشت</button>
                  <button onClick={() => setShowLead(null)} className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800/70 text-gray-200 rounded-xl text-xs sm:text-sm font-bold border border-gray-700/60">بستن</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MiniLineChart: React.FC<{leads: Lead[]}> = ({ leads }) => {
  // تابع تبدیل تاریخ میلادی به شمسی (دقیق‌تر)
  const toJalali = (gy: number, gm: number, gd: number) => {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + (parseInt(String((gy2 + 3) / 4))) - (parseInt(String((gy2 + 99) / 100))) +
      (parseInt(String((gy2 + 399) / 400))) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (parseInt(String(days / 12053)));
    days %= 12053;
    jy += 4 * (parseInt(String(days / 1461)));
    days %= 1461;
    jy += parseInt(String((days - 1) / 365));
    if (days > 365) days = (days - 1) % 365;
    const jm = (days < 186) ? 1 + parseInt(String(days / 31)) : 7 + parseInt(String((days - 186) / 30));
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { year: jy, month: jm, day: jd };
  };
  
  // تبدیل تاریخ میلادی به شمسی با استفاده از آبجکت Date
  const gregorianToJalali = (date: Date) => {
    return toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  };

  // تولید تاریخ‌های 7 روز گذشته
  const getLast7Days = () => {
    const result = [];
    // روزهای هفته در تقویم شمسی: شنبه (6)، یکشنبه (0)، دوشنبه (1)، سه‌شنبه (2)، چهارشنبه (3)، پنج‌شنبه (4)، جمعه (5)
    // ترتیب روزها در تقویم میلادی: یکشنبه (0)، دوشنبه (1)، سه‌شنبه (2)، چهارشنبه (3)، پنج‌شنبه (4)، جمعه (5)، شنبه (6)
    const persianDayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    const shortPersianDayNames = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
    
    // تاریخ‌های 7 روز گذشته را به ترتیب از قدیمی به جدید محاسبه می‌کنیم
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayIndex = date.getDay(); // 0 یکشنبه تا 6 شنبه
      
      // تبدیل به تاریخ شمسی
      const jalaliDate = gregorianToJalali(date);
      
      // نام‌های ماه‌های شمسی
      const jalaliMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
      
      result.push({
        date: date.toISOString().split('T')[0], // فرمت YYYY-MM-DD برای مقایسه
        dayName: shortPersianDayNames[dayIndex], // نام کوتاه روز هفته به فارسی
        fullDayName: persianDayNames[dayIndex], // نام کامل روز هفته به فارسی
        dayOfMonth: jalaliDate.day, // روز ماه شمسی
        jalaliMonth: jalaliDate.month, // ماه شمسی
        jalaliMonthName: jalaliMonthNames[jalaliDate.month - 1], // نام ماه شمسی
        jalaliYear: jalaliDate.year // سال شمسی
      });
    }
    return result;
  };

  const last7Days = getLast7Days();
  // نمایش روز ماه و نام روز هفته با هم
  const labels = last7Days.map(d => `${d.dayName} ${d.dayOfMonth}`);

  // محاسبه تعداد لیدهای جدید در هر روز
  const newLeadsData = last7Days.map(day => {
    // فرض می‌کنیم که فیلد lastInteraction تاریخ ایجاد لید است
    return leads.filter(lead => lead.lastInteraction.startsWith(day.date)).length;
  });

  // محاسبه تعداد فروش‌های هر روز (تعداد لیدهای تبدیل شده در آن روز)
  const dailySalesData = last7Days.map(day => {
    const dailyConvertedLeads = leads.filter(lead => 
      lead.status === 'converted' && 
      lead.lastInteraction.startsWith(day.date)
    );
    
    // تعداد لیدهای تبدیل شده را برمی‌گرداند (به جای مقدار فروش)
    return dailyConvertedLeads.length;
  });
  
  // محاسبه مقدار فروش هر روز (برای نمایش در دیباگ)
  const dailySalesAmountData = last7Days.map(day => {
    const dailyConvertedLeads = leads.filter(lead => 
      lead.status === 'converted' && 
      lead.lastInteraction.startsWith(day.date)
    );
    
    return dailyConvertedLeads.reduce((total, lead) => total + (lead.estimatedValue || 0), 0) / 1000000; // تبدیل به میلیون تومان
  });

  // اگر همه مقادیر صفر بودند، نمودار خالی است
  const hasData = newLeadsData.some(value => value > 0) || dailySalesData.some(value => value > 0);
  
  // استفاده از داده‌های واقعی یا آرایه‌های خالی در صورت نبود داده
  const newLeads = hasData ? newLeadsData : [0, 0, 0, 0, 0, 0, 0];
  const dailySales = hasData ? dailySalesData : [0, 0, 0, 0, 0, 0, 0];
  
  // اطلاعات دیباگ برای بررسی مشکل
  const debugInfo = {
    hasLeads: leads.length > 0,
    totalLeads: leads.length,
    convertedLeads: leads.filter(l => l.status === 'converted').length,
    leadDates: leads.slice(0, 3).map(l => l.lastInteraction), // نمونه تاریخ‌های چند لید اول
    last7Days: last7Days.map(d => ({
      date: d.date,
      jalaliDate: `${d.jalaliYear}/${d.jalaliMonth}/${d.dayOfMonth}`,
      dayName: d.dayName,
      fullDayName: d.fullDayName
    })), // اطلاعات 7 روز اخیر با تاریخ شمسی
    newLeadsData, // تعداد لیدهای جدید در هر روز
    dailySalesData, // تعداد فروش در هر روز
    dailySalesAmountData, // مقدار فروش در هر روز (میلیون تومان)
    hasData // آیا داده‌ای برای نمایش وجود دارد؟
  };
  
  // نمایش پیام اگر هیچ داده‌ای وجود نداشت
  if (!hasData && leads.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[130px] text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50">
          <path d="M3 3v18h18"/>
          <path d="m19 9-5 5-4-4-3 3"/>
        </svg>
        <p className="text-sm">هنوز آماری برای نمایش وجود ندارد</p>
        <p className="text-xs mt-1">با افزودن لید و ثبت فروش، آمار نمایش داده خواهد شد</p>
        <details className="mt-2 text-left text-xs opacity-70">
          <summary>اطلاعات دیباگ</summary>
          <pre className="text-left p-2 bg-gray-800 rounded overflow-auto max-h-40 mt-1" style={{direction: 'ltr'}}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    );
  }
  
  // نمایش پیام اگر هیچ لیدی وجود نداشت
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[130px] text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p className="text-sm">هنوز هیچ لیدی اضافه نشده است</p>
        <p className="text-xs mt-1">برای شروع، لید جدیدی اضافه کنید</p>
        <details className="mt-2 text-left text-xs opacity-70">
          <summary>اطلاعات دیباگ</summary>
          <pre className="text-left p-2 bg-gray-800 rounded overflow-auto max-h-40 mt-1" style={{direction: 'ltr'}}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const width = 280;
  const height = 130;
  const margin = { top: 10, right: 10, bottom: 24, left: 28 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxY = Math.max(...newLeads, ...dailySales);
  const yMax = Math.ceil(maxY * 1.2) || 1;

  const xAt = (i: number) => (i / (labels.length - 1)) * innerW + margin.left;
  const yAt = (v: number) => margin.top + innerH - (v / yMax) * innerH;

  const toPath = (arr: number[]) => arr
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`)
    .join(' ');

  const leadsPath = toPath(newLeads);
  const salesPath = toPath(dailySales);

  // فقط یک حالت برای نمایش tooltip داریم - یا hover یا click
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  // آیا tooltip در حالت کلیک شده است یا hover
  const [isLocked, setIsLocked] = React.useState<boolean>(false);
  
  const handleMove: React.MouseEventHandler<SVGRectElement> = (e) => {
    // اگر tooltip قفل شده باشد (کلیک شده باشد)، با حرکت موس تغییر نمی‌کند
    if (isLocked) return;
    
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const step = innerW / (labels.length - 1);
    const idx = Math.max(0, Math.min(labels.length - 1, Math.round(x / step)));
    setActiveIdx(idx);
  };
  
  const handleLeave = () => {
    // اگر tooltip قفل شده باشد (کلیک شده باشد)، با خارج شدن موس حذف نمی‌شود
    if (isLocked) return;
    setActiveIdx(null);
  };
  
  // کلیک روی نقطه: tooltip را قفل می‌کند یا باز می‌کند
  const handleClick: React.MouseEventHandler<SVGRectElement> = (e) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const step = innerW / (labels.length - 1);
    const idx = Math.max(0, Math.min(labels.length - 1, Math.round(x / step)));
    
    // اگر روی نقطه‌ای که قبلاً انتخاب شده کلیک کنیم، tooltip حذف می‌شود
    if (isLocked && activeIdx === idx) {
      setIsLocked(false);
      setActiveIdx(null);
    } else {
      // در غیر این صورت، tooltip را قفل می‌کنیم
      setIsLocked(true);
      setActiveIdx(idx);
    }
  };

  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 select-none">

      {/* Grid */}
      {[...Array(gridLines + 1)].map((_, i) => {
        const y = margin.top + (i / gridLines) * innerH;
        const value = Math.round(yMax * (1 - i / gridLines));
        return (
          <g key={i}>
            <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#374151" strokeOpacity={0.5} />
            <text x={margin.left - 8} y={y + 3} fontSize={9} textAnchor="end" fill="#9CA3AF">{value}</text>
          </g>
        );
      })}

      {/* X axis labels */}
      {labels.map((lbl, i) => (
        <text key={lbl} x={xAt(i)} y={height - 6} fontSize={10} textAnchor="middle" fill="#9CA3AF">{lbl}</text>
      ))}

      {/* Lines only (no area fill) */}
      <path d={leadsPath} fill="none" stroke="#7c3aed" strokeWidth={2.6} strokeLinecap="round" /> {/* تعداد لیدها - بنفش */}
      <path d={salesPath} fill="none" stroke="#22c55e" strokeWidth={2.6} strokeLinecap="round" /> {/* میزان فروش - سبز */}

      {/* Points */}
      {newLeads.map((v, i) => (
        <circle 
          key={`l-${i}`} 
          cx={xAt(i)} 
          cy={yAt(v)} 
          r={activeIdx === i ? 4.5 : 2.6} 
          fill="#7c3aed" 
          opacity={activeIdx === i ? 1 : 0.95}
          className="cursor-pointer transition-all duration-200"
        />
      ))}
      {dailySales.map((v, i) => (
        <circle 
          key={`s-${i}`} 
          cx={xAt(i)} 
          cy={yAt(v)} 
          r={activeIdx === i ? 4.5 : 2.6} 
          fill="#22c55e" 
          opacity={activeIdx === i ? 1 : 0.95}
          className="cursor-pointer transition-all duration-200"
        />
      ))}

      {/* فقط یک tooltip برای هر دو حالت hover و click */}
      {activeIdx !== null && (
        <g>
          {/* خط عمودی با استایل متفاوت بسته به حالت قفل */}
          <line 
            x1={xAt(activeIdx)} 
            x2={xAt(activeIdx)} 
            y1={margin.top} 
            y2={margin.top + innerH} 
            stroke={isLocked ? "#8B5CF6" : "#6B7280"} 
            strokeWidth={isLocked ? 2 : 1} 
            strokeDasharray={isLocked ? "4 4" : "3 3"} 
          />
          
          {(() => {
            const x = xAt(activeIdx);
            const valueY = yAt(Math.max(newLeads[activeIdx], dailySales[activeIdx]));
            
            // اندازه tooltip بسته به حالت قفل
            const boxW = isLocked ? 140 : 120;
            const boxH = isLocked ? 50 : 46;
            
            const minX = margin.left;
            const maxX = margin.left + innerW - boxW;
            const minY = margin.top;
            const maxY = margin.top + innerH - boxH;
            
            // موقعیت tooltip
            let boxX = x - boxW / 2;
            let boxY = valueY - boxH - 8;
            
            // اگر از بالای نمودار بیرون بزند، زیر نقطه نمایش داده شود
            if (boxY < minY) {
              boxY = valueY + 8;
            }
            
            // محدود کردن موقعیت tooltip به داخل نمودار
            boxX = Math.max(minX, Math.min(maxX, boxX));
            boxY = Math.max(minY, Math.min(maxY, boxY));
            
            return (
              <g>
                {/* پس‌زمینه tooltip با استایل متفاوت بسته به حالت قفل */}
                <rect 
                  x={boxX} 
                  y={boxY} 
                  rx={isLocked ? 12 : 10} 
                  ry={isLocked ? 12 : 10} 
                  width={boxW} 
                  height={boxH} 
                  fill={isLocked ? "#1e1b4b" : "#0f172a"} 
                  stroke={isLocked ? "#8B5CF6" : "#334155"} 
                  strokeWidth={isLocked ? 1.5 : 1} 
                />
                
                {/* محتوای tooltip */}
                {(() => {
                  const cx = boxX + boxW / 2;
                  const y1 = boxY + 18;
                  const y2 = boxY + 34;
                  
                  if (isLocked) {
                    // حالت کلیک شده
                    return (
                      <>
                        <text x={cx} y={y1} fontSize={11} textAnchor="middle" fill="#A78BFA" fontWeight="bold">
                          {last7Days[activeIdx].fullDayName} {last7Days[activeIdx].dayOfMonth} - {newLeads[activeIdx]} لید جدید
                        </text>
                        <text x={cx} y={y2} fontSize={11} textAnchor="middle" fill="#10B981" fontWeight="bold">
                          {dailySales[activeIdx]} فروش
                        </text>
                      </>
                    );
                  } else {
                    // حالت hover
                    return (
                      <>
                        <text direction="rtl" x={cx} y={y1} textAnchor="middle" fontSize={12} fill="#E5E7EB">
                          {`${last7Days[activeIdx].dayName} ${last7Days[activeIdx].dayOfMonth} - لید جدید: ${newLeads[activeIdx]}`}
                        </text>
                        <text direction="rtl" x={cx} y={y2} textAnchor="middle" fontSize={12} fill="#E5E7EB">
                          {`تعداد فروش: ${dailySales[activeIdx]}`}
                        </text>
                      </>
                    );
                  }
                })()}
              </g>
            );
          })()}
        </g>
      )}

      {/* Interaction overlay */}
      <rect
        x={margin.left}
        y={margin.top}
        width={innerW}
        height={innerH}
        fill="transparent"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={handleClick}
        className="cursor-pointer"
      />
    </svg>
  );
};

export default CRM;