import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, Users, Flame, TrendingUp, Filter, Download, Plus, Search,
  MessageCircle, Star,
  Send, X, Phone, Clock
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

const mockLeads: Lead[] = [
  { id: 'L-1001', name: 'علی محمدی', phone: '0912xxxxxxx', email: 'ali@example.com', country: 'IR', status: 'hot', lastInteraction: '۲ ساعت پیش', estimatedValue: 12000000, score: 5, notes: [{ text: 'تماس اولیه انجام شد.', timestamp: new Date().toLocaleString('fa-IR') }], interactions: [{ type: 'call', text: 'صحبت درباره نیازها', timestamp: new Date().toLocaleString('fa-IR') }], upcoming: [{ type: 'whatsapp', due: new Date(Date.now()+86400000).toISOString().slice(0,16), text: 'ارسال PDF معرفی' }] },
  { id: 'L-1002', name: 'سارا احمدی', phone: '0935xxxxxxx', email: 'sara@example.com', country: 'IR', status: 'warm', lastInteraction: 'دیروز', estimatedValue: 6000000, score: 4, notes: [], interactions: [], upcoming: [] },
  { id: 'L-1003', name: 'محمد رضایی', phone: '0990xxxxxxx', email: 'mr@example.com', country: 'IR', status: 'cold', lastInteraction: '۳ روز پیش', estimatedValue: 2000000, score: 2, notes: [], interactions: [], upcoming: [] },
];

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
  const [leads, setLeads] = React.useState<Lead[]>(mockLeads);
  const [isEditingSales, setIsEditingSales] = React.useState(false);
  const [customSalesAmount, setCustomSalesAmount] = React.useState('');

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
      score: 3
    };
    setLeads(prev => [created, ...prev]);
    setShowAdd(false);
    setNewLead({ name: '', phone: '', email: '', country: 'IR', estimatedValue: '', status: 'cold' });
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


  const openWhatsApp = (text: string, phone?: string) => {
    const msg = encodeURIComponent(text);
    const number = phone ? phone.replace(/^0/, '98') : '';
    const url = number ? `https://wa.me/${number}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const callNumber = (phone?: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const smsNumber = (phone?: string) => {
    if (!phone) return;
    window.location.href = `sms:${phone}`;
  };

  const copyNumber = async (phone?: string) => {
    if (!phone) return;
    try { await navigator.clipboard.writeText(phone); } catch {}
  };

  // Tasks & Follow-Ups state
  type TaskStatus = 'pending' | 'done' | 'overdue';
  type Task = {
    id: string;
    title: string;
    leadId?: string;
    due: string; // ISO
    status: TaskStatus;
    note?: string;
    remind?: boolean;
  };

  const [tasks, setTasks] = React.useState<Task[]>([
    { id: 'T-1', title: 'تماس اولیه با علی', leadId: 'L-1001', due: new Date(Date.now()+2*3600000).toISOString(), status: 'pending' },
    { id: 'T-2', title: 'ارسال پیشنهاد به سارا', leadId: 'L-1002', due: new Date(Date.now()+6*3600000).toISOString(), status: 'pending' },
    { id: 'T-3', title: 'پیگیری پرداخت', leadId: 'L-1003', due: new Date(Date.now()-2*3600000).toISOString(), status: 'overdue' },
    { id: 'T-4', title: 'ارسال قرارداد', leadId: 'L-1001', due: new Date(Date.now()-3600000).toISOString(), status: 'done' },
    { id: 'T-5', title: 'تماس پیگیری', leadId: 'L-1002', due: new Date(Date.now()-7200000).toISOString(), status: 'done' },
  ]);
  const [taskFilter, setTaskFilter] = React.useState<'all' | TaskStatus>('all');
  const [showAddTask, setShowAddTask] = React.useState(false);
  const [newTask, setNewTask] = React.useState<Pick<Task, 'title' | 'leadId' | 'due' | 'status' | 'note' | 'remind'>>({
    title: '', leadId: undefined, due: new Date(Date.now()+3600000).toISOString().slice(0,16), status: 'pending', note: '', remind: true
  });
  const [editTask, setEditTask] = React.useState<Task | null>(null);

  const sortedTasks = React.useMemo(() => {
    const filtered = tasks.filter(t => {
      if (taskFilter === 'all') return true;
      return t.status === taskFilter;
    });
    return [...filtered].sort((a,b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  }, [tasks, taskFilter]);

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const t: Task = {
      id: 'T-' + Math.floor(1000 + Math.random()*9000).toString(),
      title: newTask.title.trim(),
      leadId: newTask.leadId,
      due: newTask.due.length>16 ? newTask.due : new Date(newTask.due).toISOString(),
      status: newTask.status,
      note: newTask.note?.trim() || undefined,
      remind: !!newTask.remind
    };
    setTasks(prev => [...prev, t]);
    setShowAddTask(false);
    setNewTask({ title: '', leadId: undefined, due: new Date(Date.now()+3600000).toISOString().slice(0,16), status: 'pending', note: '', remind: true });
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status==='done' ? 'pending' : 'done' } : t));
  };

  const statusChip = (s: TaskStatus) => s==='pending' ? 'bg-purple-600/20 text-purple-200 border-purple-500/30' : s==='done' ? 'bg-emerald-600/20 text-emerald-200 border-emerald-500/30' : 'bg-rose-600/20 text-rose-200 border-rose-500/30';

  const saveEditedTask = () => {
    if (!editTask) return;
    setTasks(prev => prev.map(t => t.id === editTask.id ? editTask : t));
    setEditTask(null);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setEditTask(null);
  };

  // const saveLeadChanges = () => {
  //   if (!showLead) return;
  //   setLeads(prev => prev.map(l => l.id === showLead.id ? showLead : l));
  //   setShowLead(null);
  // };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/30 via-[#5a189a]/30 to-[#7222F2]/30 rounded-xl blur-md animate-pulse"></div>
          </div>
          <div className="text-right flex-1 mr-4">
            <h1 className="text-xl font-bold text-white mb-1">CRM فروش</h1>
            <p className="text-xs text-gray-300">مدیریت یکپارچه لیدها و فروش</p>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button onClick={() => setSelectedTab('overview')} className={`py-2 rounded-xl border ${selectedTab==='overview' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>داشبورد</button>
            <button onClick={() => setSelectedTab('leads')} className={`py-2 rounded-xl border ${selectedTab==='leads' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>مدیریت لیدها</button>
            <button onClick={() => setSelectedTab('tasks')} className={`py-2 rounded-xl border ${selectedTab==='tasks' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>وظایف و پیگیری‌ها</button>
          </div>
        </div>
      </div>

      <div className="pt-40 max-w-md mx-auto p-4 space-y-6">
        {selectedTab === 'overview' && (
          <>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {/* فروش این ماه */}
              <div 
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/20 p-4 cursor-pointer hover:border-emerald-500/40 transition-all duration-300"
                onClick={() => setIsEditingSales(true)}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-emerald-300 text-xs font-medium">فروش این ماه</div>
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <TrendingUp size={14} className="text-white" />
                </div>
              </div>
                  {isEditingSales ? (
                    <div className="mb-2">
                      <input
                        type="text"
                        value={customSalesAmount}
                        onChange={(e) => setCustomSalesAmount(e.target.value)}
                        onBlur={() => setIsEditingSales(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingSales(false);
                          }
                        }}
                        className="w-full bg-transparent text-white font-bold text-lg border-none outline-none"
                        placeholder="مبلغ فروش"
                        autoFocus
                      />
                </div>
                  ) : (
                    <div className="text-white font-bold text-lg mb-2">{formatCurrency(summary.salesThisMonth)}</div>
                  )}
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

              {/* میانگین ارزش */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent border border-purple-500/20 p-4">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-purple-300 text-xs font-medium">میانگین ارزش</div>
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <BarChart3 size={14} className="text-white" />
                    </div>
                  </div>
                  <div className="text-white font-bold text-lg mb-2">{formatCurrency(summary.avgValue)}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: '80%' }}></div>
                    </div>
                    <span className="text-purple-400 text-xs font-medium">+15%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Overview */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">پایپلاین فروش</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF]"></div>
                  <span className="text-xs text-gray-300">وضعیت فعلی</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Cold Leads */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-600/30 flex items-center justify-center">
                      <span className="text-gray-300 text-sm">❄️</span>
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">لیدهای سرد</div>
                      <div className="text-xs text-gray-400">نیاز به گرم کردن</div>
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
                      <div className="text-white font-medium text-sm">لیدهای نیمه‌گرم</div>
                      <div className="text-xs text-gray-400">در حال پیگیری</div>
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
                      <div className="text-white font-medium text-sm">آماده خرید</div>
                      <div className="text-xs text-gray-400">اولویت بالا</div>
                    </div>
                  </div>
                  <div className="text-right">
                  <div className="text-white font-bold text-lg">{pipeline.hot}</div>
                    <div className="text-xs text-gray-400">{Math.round((pipeline.hot / Math.max(summary.leadsCount,1)) * 100)}%</div>
                </div>
              </div>
              </div>
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

            {/* Sales Chart */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">روند فروش هفتگی</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF]"></div>
                  <span className="text-xs text-gray-300">آخرین ۷ روز</span>
                </div>
              </div>
              <MiniLineChart />
            </div>
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
            </div>

            <div className="space-y-4">
              {filteredLeads.map(lead => (
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
                    <div className="text-right ml-4">
                      <div className="text-white text-lg font-bold mb-2">{formatCurrency(lead.estimatedValue)}</div>
                      <div className="flex gap-1 justify-end">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={16} className={i < lead.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/lead-profile', { state: { lead } })} className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white border border-white/10 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg">پروفایل</button>
                    <button onClick={() => changeStatus(lead.id)} className="px-4 py-3 rounded-2xl text-sm border text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>تغییر وضعیت</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedTab === 'tasks' && (
          <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            {/* Header */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-white text-xl font-bold mb-2">وظایف و پیگیری‌ها</h3>
                <div className="text-sm text-gray-300 max-w-xs mx-auto leading-relaxed">مدیریت کارهای روزانه، تماس‌ها و پیگیری‌های فروش</div>
            </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowAddTask(true)}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition flex items-center gap-2"
                >
                  <Plus size={18} /> افزودن
                </button>
                <button
                  onClick={() => setTaskFilter(f => f==='all' ? 'pending' : f==='pending' ? 'done' : f==='done' ? 'overdue' : 'all')}
                  className="px-4 py-3 rounded-2xl text-sm border text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl border-gray-700/60 shadow-lg flex items-center gap-2" 
                  style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                  title="چرخه بین فیلترها"
                >
                  <Filter size={16} /> فیلتر
                </button>
            </div>
            </div>

            {/* Status Tabs */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {(['all','pending','done','overdue'] as const).map(k => (
                <button 
                  key={k} 
                  onClick={() => setTaskFilter(k)} 
                  className={`py-3 rounded-2xl text-sm font-medium border transition-all ${
                    taskFilter===k 
                      ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                      : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:scale-[1.02] active:scale-[0.99]'
                  }`}
                >
                  {k==='all'?'همه':k==='pending'?'در انتظار':k==='done'?'انجام شد':'عقب‌افتاده'}
            </button>
              ))}
            </div>


            {/* Task List */}
            <div className="space-y-4">
              {sortedTasks.map(t => {
                const lead = leads.find(l => l.id === t.leadId);
                return (
                  <label key={t.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 hover:scale-[1.01] hover:border-purple-400/40 transition cursor-pointer backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }} onClick={(e)=>{ if((e.target as HTMLElement).tagName.toLowerCase()==='input') return; setEditTask(t); }}>
                    <input type="checkbox" checked={t.status==='done'} onChange={() => toggleTask(t.id)} className="w-5 h-5 rounded border-gray-600 bg-gray-800/60 text-emerald-500 focus:ring-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-white text-base font-bold">{t.title}</div>
                        <span className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap backdrop-blur-xl shadow-lg ${statusChip(t.status)}`}>{t.status==='pending'?'در انتظار':t.status==='done'?'انجام شد':'عقب‌افتاده'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-300">
                        {lead && <span className="truncate font-medium">{lead.name}</span>}
                        <span className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#8A00FF]/20 to-[#C738FF]/20 text-purple-200 border border-purple-500/30 backdrop-blur-xl text-xs">
                          {new Date(t.due).toLocaleString('fa-IR')}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
              {sortedTasks.length===0 && (
                <div className="text-center text-gray-400 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Clock size={24} className="text-gray-500" />
                  </div>
                  <p className="text-base">موردی یافت نشد</p>
                  <p className="text-sm text-gray-500 mt-1">برای شروع، یک وظیفه جدید اضافه کنید</p>
          </div>
        )}
      </div>

            {/* Summary */}
            {(() => {
              // Show all tasks for summary (not just today's)
              const allTasks = tasks;
              const done = allTasks.filter(t => t.status === 'done').length;
              const pending = allTasks.filter(t => t.status === 'pending').length;
              const overdue = allTasks.filter(t => t.status === 'overdue').length;
              const pct = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
              
              return (
                <div className="mt-6 p-6 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">خلاصه وظایف</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF] shadow-lg"></div>
                      <span className="text-sm text-gray-300 font-medium">{pct}% تکمیل</span>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                      <div className="text-2xl font-bold text-white">{allTasks.length}</div>
                      <div className="text-sm text-gray-300 mt-1">کل وظایف</div>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 backdrop-blur-xl shadow-lg">
                      <div className="text-2xl font-bold text-emerald-300">{done}</div>
                      <div className="text-sm text-emerald-400 mt-1">انجام شده</div>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-amber-600/20 border border-amber-500/30 backdrop-blur-xl shadow-lg">
                      <div className="text-2xl font-bold text-amber-300">{pending + overdue}</div>
                      <div className="text-sm text-amber-400 mt-1">باقی‌مانده</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="h-3 rounded-full bg-gray-700/50 overflow-hidden backdrop-blur-xl">
                      <div 
                        className="h-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF] transition-all duration-500 ease-out shadow-lg" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                  
                  {/* Status Message */}
                  <div className="text-center">
                    {done >= allTasks.length && allTasks.length > 0 ? (
                      <div className="text-sm text-emerald-300 font-medium">🎉 همه وظایف انجام شدند!</div>
                    ) : allTasks.length === 0 ? (
                      <div className="text-sm text-gray-400">هیچ وظیفه‌ای تعریف نشده</div>
                    ) : (
                      <div className="text-sm text-gray-300">
                        {pending + overdue > 0 ? `${pending + overdue} وظیفه باقی‌مانده` : 'همه وظایف انجام شدند'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Add Task Modal - Outside of any container */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-8 p-6">
          <div className="w-full max-w-2xl backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">افزودن وظیفه جدید</h2>
              <button 
                onClick={() => setShowAddTask(false)} 
                className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">عنوان وظیفه</label>
                <input 
                  type="text"
                  value={newTask.title} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} 
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                  placeholder="عنوان وظیفه را وارد کنید"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">مرتبط با لید</label>
                <select 
                  value={newTask.leadId || ''} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, leadId: e.target.value || undefined }))} 
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="">- انتخاب کنید -</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">تاریخ و ساعت</label>
                  <input 
                    type="datetime-local" 
                    value={newTask.due} 
                    onChange={(e) => setNewTask(prev => ({ ...prev, due: e.target.value }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">وضعیت</label>
                  <select 
                    value={newTask.status} 
                    onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as any }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  >
                    <option value="pending">در انتظار</option>
                    <option value="done">انجام شد</option>
                    <option value="overdue">عقب‌افتاده</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">یادداشت</label>
                <textarea 
                  value={newTask.note || ''} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, note: e.target.value }))} 
                  className="w-full h-24 px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none" 
                  placeholder="یادداشت اختیاری..."
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={!!newTask.remind} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, remind: e.target.checked }))} 
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800/50 text-purple-500 focus:ring-purple-500 focus:ring-2" 
                />
                <label className="text-sm text-gray-300">یادآوری قبل از موعد</label>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-700/50 bg-gray-900/50">
              <button 
                onClick={() => setShowAddTask(false)} 
                className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={addTask} 
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white rounded-xl font-medium shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
              >
                ذخیره وظیفه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal - Outside of any container */}
      {editTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-8 p-6">
          <div className="w-full max-w-2xl backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">ویرایش وظیفه</h2>
              <button 
                onClick={() => setEditTask(null)} 
                className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">عنوان وظیفه</label>
                <input 
                  type="text"
                  value={editTask.title} 
                  onChange={(e) => setEditTask(prev => prev ? { ...prev, title: e.target.value } : prev)} 
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                  placeholder="عنوان وظیفه را وارد کنید"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">مرتبط با لید</label>
                <select 
                  value={editTask.leadId || ''} 
                  onChange={(e) => setEditTask(prev => prev ? { ...prev, leadId: e.target.value || undefined } : prev)} 
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="">- انتخاب کنید -</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">تاریخ و ساعت</label>
                  <input 
                    type="datetime-local" 
                    value={new Date(editTask.due).toISOString().slice(0,16)} 
                    onChange={(e) => setEditTask(prev => prev ? { ...prev, due: new Date(e.target.value).toISOString() } : prev)} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">وضعیت</label>
                  <select 
                    value={editTask.status} 
                    onChange={(e) => setEditTask(prev => prev ? { ...prev, status: e.target.value as any } : prev)} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  >
                    <option value="pending">در انتظار</option>
                    <option value="done">انجام شد</option>
                    <option value="overdue">عقب‌افتاده</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">یادداشت</label>
                <textarea 
                  value={editTask.note || ''} 
                  onChange={(e) => setEditTask(prev => prev ? { ...prev, note: e.target.value } : prev)} 
                  className="w-full h-24 px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none" 
                  placeholder="یادداشت اختیاری..."
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-700/50 bg-gray-900/50">
              <button 
                onClick={() => deleteTask(editTask.id)} 
                className="px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
              >
                حذف
              </button>
              <button 
                onClick={() => setEditTask(null)} 
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={saveEditedTask} 
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white rounded-xl font-medium shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Profile / AI Modal */}
      {showLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex">
          <div className="backdrop-blur-xl rounded-3xl w-full max-w-md mx-auto my-3 h-[calc(100vh-24px)] overflow-hidden border border-gray-700/60 shadow-2xl flex flex-col" style={{ backgroundColor: '#10091c' }}>
            <div className="p-4 border-b border-gray-700/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2c189a] to-[#5a189a] flex items-center justify-center text-white font-bold shadow-lg">
                  {showLead.name?.charAt(0) || 'L'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate max-w-[10rem]">{showLead.name}</h3>
                    <StatusBadge status={showLead.status} />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{showLead.phone || showLead.email}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-300 mt-1">
                    <span>💰</span>
                    <span className="font-bold text-white">{formatCurrency(showLead.estimatedValue)}</span>
                  </div>
                </div>
                <button onClick={() => setShowLead(null)} className="p-2 rounded-xl hover:bg-white/10"><X size={18} className="text-gray-400" /></button>
              </div>

              {/* Status switcher */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                <button onClick={() => setShowLead(prev => prev ? { ...prev, status: 'cold' } : prev)} className={`py-2 rounded-lg border ${showLead.status==='cold' ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-800/60 text-gray-300 border-gray-700/60'}`}>سرد</button>
                <button onClick={() => setShowLead(prev => prev ? { ...prev, status: 'warm' } : prev)} className={`py-2 rounded-lg border ${showLead.status==='warm' ? 'bg-yellow-600/30 text-yellow-200 border-yellow-500/40' : 'bg-gray-800/60 text-gray-300 border-gray-700/60'}`}>نیمه‌گرم</button>
                <button onClick={() => setShowLead(prev => prev ? { ...prev, status: 'hot' } : prev)} className={`py-2 rounded-lg border ${showLead.status==='hot' ? 'bg-emerald-700/30 text-emerald-200 border-emerald-600/40' : 'bg-gray-800/60 text-gray-300 border-gray-700/60'}`}>آماده خرید</button>
              </div>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto flex-1 pb-24">
              {/* Quick actions row */}
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => callNumber(showLead.phone)} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center justify-center gap-1 border border-gray-700/60">
                  <Phone size={16} />
                  <span>تماس</span>
                </button>
                <button onClick={() => openWhatsApp(`سلام ${showLead.name} عزیز! من از مانیتایزAI هستم. دوست دارید یک گفت‌وگوی کوتاه داشته باشیم؟`, showLead.phone)} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex flex-col items-center justify-center gap-1 border border-emerald-600/60">
                  <Send size={16} />
                  <span>واتساپ</span>
                </button>
                <button onClick={() => smsNumber(showLead.phone)} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-indigo-600/60 to-indigo-700/60 text-white flex flex-col items-center justify-center gap-1 border border-indigo-500/60">
                  <MessageCircle size={16} />
                  <span>پیامک</span>
                </button>
                <button onClick={() => copyNumber(showLead.phone)} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center justify-center gap-1 border border-gray-700/60">
                  <CopyIcon />
                  <span>کپی</span>
                </button>
              </div>

              {/* Notes input and history */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400">یادداشت</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="اینجا بنویس چه قراری گذاشتی یا چی گفت" className="w-full h-20 px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-600/50 text-xs text-white"></textarea>
                {showLead.notes && showLead.notes.length > 0 && (
                  <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-3">
                    <div className="text-[11px] text-gray-400 mb-2">تاریخچه یادداشت‌ها</div>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {[...showLead.notes].reverse().map((n, i) => (
                        <div key={i} className="text-[11px] text-gray-300">
                          <span className="text-gray-400">{n.timestamp} • </span>
                          {n.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactions: done and upcoming */}
              <div className="grid grid-cols-1 gap-3">
                {/* Completed interactions */}
                <div className="backdrop-blur-xl rounded-2xl p-3 border border-gray-700/60" style={{ backgroundColor: '#0f0a18' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">تعاملات انجام‌شده</span>
                    <button onClick={() => setShowLead(prev => prev ? { ...prev, interactions: [...(prev.interactions || []), { type: 'call', text: 'تعامل ثبت شد', timestamp: new Date().toLocaleString('fa-IR') }] } : prev)} className="text-[11px] px-2 py-1 rounded-lg bg-gray-800/60 text-gray-200 border border-gray-700/60">ثبت سریع</button>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {(showLead.interactions || []).length === 0 && (
                      <div className="text-[11px] text-gray-500">تعامل ثبت نشده است.</div>
                    )}
                    {(showLead.interactions || []).slice().reverse().map((it, idx) => (
                      <div key={idx} className="text-[11px] text-gray-300 flex items-center gap-1">
                        <span className="text-gray-400">{it.timestamp} •</span>
                        <span>{it.type === 'call' ? 'تماس' : it.type === 'whatsapp' ? 'واتساپ' : it.type === 'sms' ? 'پیامک' : 'جلسه'}</span>
                        <span>— {it.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming interactions */}
                <div className="backdrop-blur-xl rounded-2xl p-3 border border-gray-700/60" style={{ backgroundColor: '#0f0a18' }}>
                  <div className="text-xs font-bold text-white mb-2">تعاملات آینده</div>
                  <UpcomingForm setShowLead={setShowLead} />
                  <div className="space-y-1 max-h-28 overflow-y-auto mt-2">
                    {(showLead.upcoming || []).length === 0 && (
                      <div className="text-[11px] text-gray-500">موردی ثبت نشده است.</div>
                    )}
                    {(showLead.upcoming || []).slice().reverse().map((up, revIdx) => {
                      const realIdx = (showLead.upcoming || []).length - 1 - revIdx;
                      return (
                        <label key={revIdx} className="text-[11px] text-gray-300 flex items-center justify-between gap-2 cursor-pointer">
                          <div className="flex items-center gap-1 min-w-0">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800/60 text-emerald-500 focus:ring-emerald-500"
                              onChange={(e) => {
                                if (!e.target.checked) return;
                                const now = new Date().toLocaleString('fa-IR');
                                setShowLead(prev => {
                                  if (!prev) return prev;
                                  const upcoming = [...(prev.upcoming || [])];
                                  const done = upcoming[realIdx];
                                  if (!done) return prev;
                                  upcoming.splice(realIdx, 1);
                                  const interactions = [
                                    ...(prev.interactions || []),
                                    { type: done.type, text: done.text, timestamp: now }
                                  ];
                                  return { ...prev, upcoming, interactions };
                                });
                              }}
                            />
                            <span className="text-gray-400 whitespace-nowrap">{new Date(up.due).toLocaleString('fa-IR')} •</span>
                            <span className="whitespace-nowrap">{up.type === 'call' ? 'تماس' : up.type === 'whatsapp' ? 'واتساپ' : up.type === 'sms' ? 'پیامک' : 'جلسه'}</span>
                            <span className="truncate">— {up.text}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-700/60 pt-3">
                <button onClick={() => { if (showLead) { const ts = new Date().toLocaleString('fa-IR'); const updated = note.trim() ? { ...showLead, notes: [...(showLead.notes || []), { text: note.trim(), timestamp: ts }] } : showLead; setNote(''); setLeads(prev => prev.map(l => l.id === updated.id ? updated : l)); setShowLead(null); } }} className="px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-sm font-bold border border-white/10">ذخیره تغییرات</button>
                <button onClick={() => setShowLead(null)} className="px-4 py-3 bg-gray-800/70 text-gray-200 rounded-xl text-sm font-bold border border-gray-700/60">بستن</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-8">
          <div className="w-full max-w-2xl backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            {/* Header */}
            <div className="p-6 border-b border-gray-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">افزودن لید جدید</h3>
                <p className="text-sm text-gray-300">اطلاعات لید جدید را وارد کنید</p>
            </div>
              <button 
                onClick={() => setShowAdd(false)} 
                className="p-3 rounded-2xl text-gray-200 hover:scale-[1.05] active:scale-[0.95] transition-all backdrop-blur-xl border border-gray-700/60 shadow-lg" 
                style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="newLeadName" className="block text-sm font-medium text-gray-300 mb-2">نام و نام خانوادگی</label>
                  <input 
                    type="text" 
                    id="newLeadName" 
                    value={newLead.name} 
                    onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-xl" 
                    placeholder="نام کامل لید را وارد کنید"
                  />
                </div>
                <div>
                  <label htmlFor="newLeadPhone" className="block text-sm font-medium text-gray-300 mb-2">شماره تماس</label>
                  <input 
                    type="text" 
                    id="newLeadPhone" 
                    value={newLead.phone} 
                    onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-xl" 
                    placeholder="شماره تماس"
                  />
                </div>
                <div>
                  <label htmlFor="newLeadEmail" className="block text-sm font-medium text-gray-300 mb-2">ایمیل</label>
                  <input 
                    type="email" 
                    id="newLeadEmail" 
                    value={newLead.email} 
                    onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-xl" 
                    placeholder="آدرس ایمیل"
                  />
                </div>
                <div>
                  <label htmlFor="newLeadCountry" className="block text-sm font-medium text-gray-300 mb-2">کشور</label>
                  <select 
                    id="newLeadCountry" 
                    value={newLead.country} 
                    onChange={(e) => setNewLead(prev => ({ ...prev, country: e.target.value }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-xl"
                  >
                    <option value="IR">ایران</option>
                    <option value="US">آمریکا</option>
                    <option value="UK">بریتانیا</option>
                    <option value="DE">آلمان</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newLeadEstimatedValue" className="block text-sm font-medium text-gray-300 mb-2">ارزش تخمینی (تومان)</label>
                  <input 
                    type="number" 
                    id="newLeadEstimatedValue" 
                    value={newLead.estimatedValue} 
                    onChange={(e) => setNewLead(prev => ({ ...prev, estimatedValue: e.target.value }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-xl" 
                    placeholder="ارزش تخمینی"
                  />
                </div>
                <div>
                  <label htmlFor="newLeadStatus" className="block text-sm font-medium text-gray-300 mb-2">وضعیت لید</label>
                  <select 
                    id="newLeadStatus" 
                    value={newLead.status} 
                    onChange={(e) => setNewLead(prev => ({ ...prev, status: e.target.value as LeadStatus }))} 
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-xl"
                  >
                    <option value="cold">سرد</option>
                    <option value="warm">نیمه‌گرم</option>
                    <option value="hot">آماده خرید</option>
                  </select>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => setShowAdd(false)} 
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-medium text-gray-200 border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl shadow-lg" 
                  style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                >
                  انصراف
                </button>
                <button 
                  onClick={addLead} 
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#8A00FF] to-[#C738FF] border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                >
                افزودن لید
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const CopyIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const MiniLineChart: React.FC = () => {
  // Dual-series micro chart (no deps) – earlier simpler version
  const labels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const leads = [12, 18, 15, 22, 20, 28, 25];
  const sales = [3, 5, 4, 9, 7, 12, 10];

  const width = 280;
  const height = 130;
  const margin = { top: 10, right: 10, bottom: 24, left: 28 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxY = Math.max(...leads, ...sales);
  const yMax = Math.ceil(maxY * 1.2) || 1;

  const xAt = (i: number) => (i / (labels.length - 1)) * innerW + margin.left;
  const yAt = (v: number) => margin.top + innerH - (v / yMax) * innerH;

  const toPath = (arr: number[]) => arr
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`)
    .join(' ');

  const leadsPath = toPath(leads);
  const salesPath = toPath(sales);

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [clickedIdx, setClickedIdx] = React.useState<number | null>(null);
  
  const handleMove: React.MouseEventHandler<SVGRectElement> = (e) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const step = innerW / (labels.length - 1);
    const idx = Math.max(0, Math.min(labels.length - 1, Math.round(x / step)));
    setHoverIdx(idx);
  };
  
  const handleLeave = () => setHoverIdx(null);
  
  const handleClick: React.MouseEventHandler<SVGRectElement> = (e) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const step = innerW / (labels.length - 1);
    const idx = Math.max(0, Math.min(labels.length - 1, Math.round(x / step)));
    setClickedIdx(clickedIdx === idx ? null : idx);
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
      <path d={leadsPath} fill="none" stroke="#7c3aed" strokeWidth={2.6} strokeLinecap="round" />
      <path d={salesPath} fill="none" stroke="#22c55e" strokeWidth={2.6} strokeLinecap="round" />

      {/* Points */}
      {leads.map((v, i) => (
        <circle 
          key={`l-${i}`} 
          cx={xAt(i)} 
          cy={yAt(v)} 
          r={clickedIdx === i ? 4.5 : hoverIdx === i ? 3.8 : 2.6} 
          fill="#7c3aed" 
          opacity={clickedIdx === i ? 1 : hoverIdx === i ? 1 : 0.95}
          className="cursor-pointer transition-all duration-200"
        />
      ))}
      {sales.map((v, i) => (
        <circle 
          key={`s-${i}`} 
          cx={xAt(i)} 
          cy={yAt(v)} 
          r={clickedIdx === i ? 4.5 : hoverIdx === i ? 3.8 : 2.6} 
          fill="#22c55e" 
          opacity={clickedIdx === i ? 1 : hoverIdx === i ? 1 : 0.95}
          className="cursor-pointer transition-all duration-200"
        />
      ))}

      {/* Clicked point tooltip (persistent) */}
      {clickedIdx !== null && (
        <g>
          <line x1={xAt(clickedIdx)} x2={xAt(clickedIdx)} y1={margin.top} y2={margin.top + innerH} stroke="#8B5CF6" strokeWidth={2} strokeDasharray="4 4" />
          {(() => {
            const x = xAt(clickedIdx);
            const valueY = yAt(Math.max(leads[clickedIdx], sales[clickedIdx]));
            const boxW = 140;
            const boxH = 50;
            const minX = margin.left;
            const maxX = margin.left + innerW - boxW;
            const minY = margin.top;
            const maxY = margin.top + innerH - boxH;
            let boxX = x - boxW / 2;
            let boxY = valueY - boxH - 8;
            if (boxY < minY) {
              boxY = valueY + 8;
            }
            boxX = Math.max(minX, Math.min(maxX, boxX));
            boxY = Math.max(minY, Math.min(maxY, boxY));
            return (
              <g>
                <rect x={boxX} y={boxY} rx={12} ry={12} width={boxW} height={boxH} fill="#1e1b4b" stroke="#8B5CF6" strokeWidth={1.5} />
                {(() => {
                  const cx = boxX + boxW / 2;
                  const y1 = boxY + 18;
                  const y2 = boxY + 34;
                  return (
                    <>
                      <text x={cx} y={y1} fontSize={11} textAnchor="middle" fill="#A78BFA" fontWeight="bold">
                        {labels[clickedIdx]} - {leads[clickedIdx]} لید
                      </text>
                      <text x={cx} y={y2} fontSize={11} textAnchor="middle" fill="#10B981" fontWeight="bold">
                        {sales[clickedIdx]} فروش
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })()}
        </g>
      )}

      {/* Hover crosshair and tooltip */}
      {hoverIdx !== null && hoverIdx !== clickedIdx && (
        <g>
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={margin.top} y2={margin.top + innerH} stroke="#6B7280" strokeDasharray="3 3" />
          {(() => {
            const x = xAt(hoverIdx);
            const valueY = yAt(Math.max(leads[hoverIdx], sales[hoverIdx]));
            const boxW = 120;
            const boxH = 46;
            const minX = margin.left;
            const maxX = margin.left + innerW - boxW;
            const minY = margin.top;
            const maxY = margin.top + innerH - boxH;
            // try above the point first
            let boxX = x - boxW / 2;
            let boxY = valueY - boxH - 8;
            // if exceeds top, flip below the point
            if (boxY < minY) {
              boxY = valueY + 8;
            }
            // final clamp to keep fully inside
            boxX = Math.max(minX, Math.min(maxX, boxX));
            boxY = Math.max(minY, Math.min(maxY, boxY));
            return (
              <g>
                <rect x={boxX} y={boxY} rx={10} ry={10} width={boxW} height={boxH} fill="#0f172a" stroke="#334155" />
                {(() => {
                  const cx = boxX + boxW / 2;
                  const y1 = boxY + 18;
                  const y2 = boxY + 34;
                  return (
                    <g>
                      <text direction="rtl" x={cx} y={y1} textAnchor="middle" fontSize={12} fill="#E5E7EB">{`لید: ${leads[hoverIdx]}`}</text>
                      <text direction="rtl" x={cx} y={y2} textAnchor="middle" fontSize={12} fill="#E5E7EB">{`فروش: ${sales[hoverIdx]}`}</text>
                    </g>
                  );
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

const UpcomingForm: React.FC<{ setShowLead: React.Dispatch<React.SetStateAction<Lead | null>> }> = ({ setShowLead }) => {
  const [type, setType] = React.useState<'call' | 'whatsapp' | 'sms' | 'meeting'>('whatsapp');
  const [due, setDue] = React.useState<string>(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [text, setText] = React.useState<string>('');

  return (
    <div className="grid grid-cols-1 gap-2 text-[11px]">
      <div className="grid grid-cols-3 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="px-2 py-2 rounded-lg bg-gray-800/60 text-gray-200 border border-gray-700/60">
          <option value="call">تماس</option>
          <option value="whatsapp">واتساپ</option>
          <option value="sms">پیامک</option>
          <option value="meeting">جلسه</option>
        </select>
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="px-2 py-2 rounded-lg bg-gray-800/60 text-gray-200 border border-gray-700/60" />
        <button onClick={() => { if (!text.trim()) return; setShowLead(prev => prev ? { ...prev, upcoming: [...(prev.upcoming || []), { type, due, text }] } : prev); setText(''); }} className="rounded-lg bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white px-3">افزودن</button>
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="شرح تعامل آینده (مثلاً: پیگیری قیمت)" className="px-3 py-2 rounded-lg bg-gray-800/60 text-gray-200 border border-gray-700/60" />
    </div>
  );
};

export default CRM;


