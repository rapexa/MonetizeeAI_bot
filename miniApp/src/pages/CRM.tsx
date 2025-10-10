import React from 'react';
// import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, Flame, TrendingUp, Filter, Download, Plus, Search,
  MessageCircle, Gift, CheckCircle, Clock, Star, ChevronRight,
  Sparkles, Wand2, Send, X, Phone
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
  // const navigate = useNavigate();

  const [selectedTab, setSelectedTab] = React.useState<'overview' | 'leads' | 'automation'>('overview');
  const [leads, setLeads] = React.useState<Lead[]>(mockLeads);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | LeadStatus>('all');
  const [showLead, setShowLead] = React.useState<Lead | null>(null);
  const [note, setNote] = React.useState('');
  const [aiMessageType, setAiMessageType] = React.useState<'open' | 'follow' | 'gift' | 'direct'>('open');
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
    const salesThisMonth = hotLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    const avgValue = leadsCount ? Math.round(leads.reduce((a, l) => a + (l.estimatedValue || 0), 0) / leadsCount) : 0;
    return {
      salesThisMonth,
      leadsCount,
      newToday: 0,
      hotLeads: hotLeads.length,
      avgValue
    };
  }, [leads]);

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

  const aiTemplates: Record<typeof aiMessageType, string> = {
    open: 'سلام {{name}} عزیز! من از مانیتایزAI هستم. دیدم به موضوع {{topic}} علاقه دارید. دوست دارید یک گفت‌وگوی کوتاه داشته باشیم؟',
    follow: 'وقت بخیر {{name}} عزیز 🌟 فقط خواستم پیگیری کنم. اگر سوالی درباره {{topic}} دارید خوشحال می‌شم کمک کنم.',
    gift: 'سلام {{name}}! یه هدیه رایگان برات دارم: {{gift}}. می‌تونه بهت در {{benefit}} کمک کنه. دوست داری برات ارسال کنم؟',
    direct: 'سلام {{name}} عزیز، پیشنهادم اینه امروز با {{offer}} شروع کنیم. اگر موافقی همینجا اطلاع بده تا سریع راه‌اندازی کنیم.'
  };

  const generateAiText = (lead: Lead) => {
    const template = aiTemplates[aiMessageType];
    return template
      .split('{{name}}').join(lead.name)
      .split('{{topic}}').join('رشد فروش')
      .split('{{gift}}').join('PDF ارزشمند')
      .split('{{benefit}}').join('افزایش تبدیل')
      .split('{{offer}}').join('پکیج شروع سریع');
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
            <button onClick={() => setSelectedTab('automation')} className={`py-2 rounded-xl border ${selectedTab==='automation' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>اتوماسیون</button>
          </div>
        </div>
      </div>

      <div className="pt-40 max-w-md mx-auto p-4 space-y-6">
        {selectedTab === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-emerald-400" />
                  <span className="text-white text-xs">فروش این ماه</span>
                </div>
                <div className="text-white font-black text-xl">{formatCurrency(summary.salesThisMonth)}</div>
              </div>
              <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-blue-400" />
                  <span className="text-white text-xs">تعداد لیدها</span>
                </div>
                <div className="text-white font-black text-xl">{summary.leadsCount}</div>
                <div className="text-xs text-gray-300">+{summary.newToday} امروز</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={18} className="text-orange-400" />
                  <span className="text-white text-xs">لیدهای آماده خرید</span>
                </div>
                <div className="text-white font-black text-xl">{summary.hotLeads}</div>
                <div className="text-xs text-gray-300">{Math.round((summary.hotLeads / Math.max(summary.leadsCount,1)) * 100)}٪ از کل</div>
              </div>
              <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={18} className="text-purple-400" />
                  <span className="text-white text-xs">میانگین ارزش لید</span>
                </div>
                <div className="text-white font-black text-xl">{formatCurrency(summary.avgValue)}</div>
              </div>
            </div>

            {/* Pipeline Summary */}
            <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="text-center mb-3">
                <h3 className="text-white text-sm font-bold">پایپلاین خلاصه</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-xs text-gray-300 mb-1">سرد</div>
                  <div className="text-white font-bold text-lg">{pipeline.cold}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-yellow-300 mb-1">نیمه‌گرم</div>
                  <div className="text-white font-bold text-lg">{pipeline.warm}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-emerald-300 mb-1">آماده خرید</div>
                  <div className="text-white font-bold text-lg">{pipeline.hot}</div>
                </div>
              </div>
              <button onClick={() => setSelectedTab('leads')} className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-sm font-bold border border-white/10 flex items-center justify-center gap-1">
                مشاهده کامل <ChevronRight size={16} />
              </button>
            </div>

            {/* Chart Below Pipeline */}
            <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={18} className="text-violet-400" />
                <span className="text-white text-sm font-bold">روند هفتگی لید/فروش</span>
              </div>
              <MiniLineChart />
            </div>
          </>
        )}

        {selectedTab === 'leads' && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-800/60 border border-gray-700/60 rounded-xl px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو (نام، ایمیل، شماره)" className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none" />
              </div>
              <button onClick={() => setStatusFilter(s => s==='all' ? 'hot' : s==='hot' ? 'warm' : s==='warm' ? 'cold' : 'all')} className="px-3 py-2 rounded-xl border border-gray-700/60 bg-gray-800/60 text-xs text-gray-200 flex items-center gap-1">
                <Filter size={14} />
                {statusFilter==='all' ? 'همه' : statusFilter==='hot' ? 'آماده' : statusFilter==='warm' ? 'نیمه‌گرم' : 'سرد'}
              </button>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl border border-gray-700/60 bg-gray-800/60 text-xs text-gray-200 flex items-center gap-1">
                <Plus size={14} /> افزودن لید جدید
              </button>
              <button onClick={exportSimple} className="px-3 py-2 rounded-xl border border-gray-700/60 bg-gray-800/60 text-xs text-gray-200 flex items-center gap-1">
                <Download size={14} /> خروجی اکسل
              </button>
            </div>

            <div className="space-y-2">
              {filteredLeads.map(lead => (
                <div key={lead.id} className="backdrop-blur-xl rounded-2xl p-4 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-bold truncate max-w-[10rem]">{lead.name}</span>
                        <StatusBadge status={lead.status} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate">{lead.phone || lead.email}</div>
                      <div className="text-[10px] text-gray-500 mt-1">آخرین تعامل: {lead.lastInteraction}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm font-bold">{formatCurrency(lead.estimatedValue)}</div>
                      <div className="flex gap-0.5 justify-end mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} className={i < lead.score ? 'text-yellow-400' : 'text-gray-600'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => setShowLead(lead)} className="flex-1 px-3 py-2 rounded-lg text-xs bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white border border-white/10">پروفایل</button>
                    <button onClick={() => changeStatus(lead.id)} className="px-3 py-2 rounded-lg text-xs bg-gray-800/60 text-gray-200 border border-gray-700/60">تغییر وضعیت</button>
                    <button onClick={() => { setShowLead(lead); setAiMessageType('open'); }} className="px-3 py-2 rounded-lg text-xs bg-emerald-700/30 text-emerald-200 border border-emerald-600/40 flex items-center gap-1">
                      <Sparkles size={14} /> AI پیام
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedTab === 'automation' && (
          <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            <div className="text-center mb-3">
              <h3 className="text-white text-sm font-bold">اتوماسیون پیگیری هوشمند</h3>
            </div>
            <div className="space-y-3 text-xs text-gray-300">
              <div className="flex items-center gap-2"><Clock size={14} /> زمان‌بندی پیام پیگیری بعد از ۲۴ ساعت</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> علامت‌گذاری خودکار لیدهای پاسخ‌داده‌نشده</div>
              <div className="flex items-center gap-2"><Gift size={14} className="text-pink-400" /> پیشنهاد هدیه کم‌ریسک برای افزایش تبدیل</div>
              <div className="flex items-center gap-2"><Wand2 size={14} className="text-purple-400" /> تولید خودکار متن با AI بر اساس وضعیت لید</div>
            </div>
            <button onClick={() => setSelectedTab('leads')} className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-sm font-bold border border-white/10">
              پیکربندی روی لیدها
            </button>
          </div>
        )}
      </div>

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
                <button onClick={() => openWhatsApp(generateAiText(showLead), showLead.phone)} className="px-3 py-3 rounded-2xl text-xs bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex flex-col items-center justify-center gap-1 border border-emerald-600/60">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex">
          <div className="backdrop-blur-xl rounded-3xl w-full max-w-md mx-auto my-3 h-[calc(100vh-24px)] overflow-hidden border border-gray-700/60 shadow-2xl flex flex-col" style={{ backgroundColor: '#10091c' }}>
            <div className="p-4 border-b border-gray-700/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">افزودن لید جدید</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-white/10"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-24">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="newLeadName" className="text-xs text-gray-400">نام</label>
                  <input type="text" id="newLeadName" value={newLead.name} onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="newLeadPhone" className="text-xs text-gray-400">شماره تماس</label>
                  <input type="text" id="newLeadPhone" value={newLead.phone} onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="newLeadEmail" className="text-xs text-gray-400">ایمیل</label>
                  <input type="email" id="newLeadEmail" value={newLead.email} onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="newLeadCountry" className="text-xs text-gray-400">کشور</label>
                  <select id="newLeadCountry" value={newLead.country} onChange={(e) => setNewLead(prev => ({ ...prev, country: e.target.value }))} className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white">
                    <option value="IR">ایران</option>
                    <option value="US">آمریکا</option>
                    <option value="UK">بریتانیا</option>
                    <option value="DE">آلمان</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newLeadEstimatedValue" className="text-xs text-gray-400">ارزش پیش‌بینی شده</label>
                  <input type="number" id="newLeadEstimatedValue" value={newLead.estimatedValue} onChange={(e) => setNewLead(prev => ({ ...prev, estimatedValue: e.target.value }))} className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="newLeadStatus" className="text-xs text-gray-400">وضعیت لید</label>
                  <select id="newLeadStatus" value={newLead.status} onChange={(e) => setNewLead(prev => ({ ...prev, status: e.target.value as LeadStatus }))} className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white">
                    <option value="cold">سرد</option>
                    <option value="warm">نیمه‌گرم</option>
                    <option value="hot">آماده خرید</option>
                  </select>
                </div>
              </div>
              <button onClick={addLead} className="w-full px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl text-sm font-bold border border-white/10">
                افزودن لید
              </button>
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
  const handleMove: React.MouseEventHandler<SVGRectElement> = (e) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const step = innerW / (labels.length - 1);
    const idx = Math.max(0, Math.min(labels.length - 1, Math.round(x / step)));
    setHoverIdx(idx);
  };
  const handleLeave = () => setHoverIdx(null);

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
        <circle key={`l-${i}`} cx={xAt(i)} cy={yAt(v)} r={hoverIdx === i ? 3.8 : 2.6} fill="#7c3aed" opacity={hoverIdx === i ? 1 : 0.95} />
      ))}
      {sales.map((v, i) => (
        <circle key={`s-${i}`} cx={xAt(i)} cy={yAt(v)} r={hoverIdx === i ? 3.8 : 2.6} fill="#22c55e" opacity={hoverIdx === i ? 1 : 0.95} />
      ))}

      {/* Hover crosshair and tooltip */}
      {hoverIdx !== null && (
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


