import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, Flame, TrendingUp, Filter, Download, Plus, Search,
  Mail, MessageCircle, Gift, CheckCircle, Clock, Star, ChevronRight,
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
};

const mockLeads: Lead[] = [
  { id: 'L-1001', name: 'علی محمدی', phone: '0912xxxxxxx', email: 'ali@example.com', country: 'IR', status: 'hot', lastInteraction: '۲ ساعت پیش', estimatedValue: 12000000, score: 5 },
  { id: 'L-1002', name: 'سارا احمدی', phone: '0935xxxxxxx', email: 'sara@example.com', country: 'IR', status: 'warm', lastInteraction: 'دیروز', estimatedValue: 6000000, score: 4 },
  { id: 'L-1003', name: 'محمد رضایی', phone: '0990xxxxxxx', email: 'mr@example.com', country: 'IR', status: 'cold', lastInteraction: '۳ روز پیش', estimatedValue: 2000000, score: 2 },
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

  const [selectedTab, setSelectedTab] = React.useState<'overview' | 'leads' | 'automation'>('overview');
  const [leads, setLeads] = React.useState<Lead[]>(mockLeads);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | LeadStatus>('all');
  const [showLead, setShowLead] = React.useState<Lead | null>(null);
  const [note, setNote] = React.useState('');
  const [aiMessageType, setAiMessageType] = React.useState<'open' | 'follow' | 'gift' | 'direct'>('open');

  const filteredLeads = leads.filter(l => {
    const matchesQuery = !query || l.name.includes(query) || l.phone?.includes(query) || l.email?.includes(query);
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summary = React.useMemo(() => ({
    salesThisMonth: 32000000,
    leadsCount: leads.length,
    newToday: 3,
    hotLeads: leads.filter(l => l.status === 'hot').length,
  }), [leads]);

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
      .replaceAll('{{name}}', lead.name)
      .replaceAll('{{topic}}', 'رشد فروش')
      .replaceAll('{{gift}}', 'PDF ارزشمند')
      .replaceAll('{{benefit}}', 'افزایش تبدیل')
      .replaceAll('{{offer}}', 'پکیج شروع سریع');
  };

  const openWhatsApp = (text: string, phone?: string) => {
    const msg = encodeURIComponent(text);
    const number = phone ? phone.replace(/^0/, '98') : '';
    const url = number ? `https://wa.me/${number}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

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
            <button onClick={() => setSelectedTab('overview')} className={`py-2 rounded-xl border ${selectedTab==='overview' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>نمای کلی</button>
            <button onClick={() => setSelectedTab('leads')} className={`py-2 rounded-xl border ${selectedTab==='leads' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>مدیریت لیدها</button>
            <button onClick={() => setSelectedTab('automation')} className={`py-2 rounded-xl border ${selectedTab==='automation' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-800/60 border-gray-700/60 text-gray-300'}`}>اتوماسیون</button>
          </div>
        </div>
      </div>

      <div className="pt-28 max-w-md mx-auto p-4 space-y-6">
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
                  <span className="text-white text-xs">نمایش</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-xs rounded-lg bg-gray-800/60 text-gray-300 border border-gray-700/60">لیدها</button>
                  <button className="px-2 py-1 text-xs rounded-lg bg-gray-800/60 text-gray-300 border border-gray-700/60">فروش</button>
                  <button className="px-2 py-1 text-xs rounded-lg bg-gray-800/60 text-gray-300 border border-gray-700/60">تبدیل</button>
                </div>
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
              <button className="px-3 py-2 rounded-xl border border-gray-700/60 bg-gray-800/60 text-xs text-gray-200 flex items-center gap-1">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl w-full max-w-sm overflow-hidden border border-white/20 dark:border-gray-700/20 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{showLead.name}</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{showLead.phone || showLead.email}</div>
              </div>
              <button onClick={() => setShowLead(null)} className="p-2 rounded-lg hover:bg-gray-100/70 dark:hover:bg-gray-700/50"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={showLead.status} />
                <div className="text-xs text-gray-500">ارزش: <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(showLead.estimatedValue)}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openWhatsApp(generateAiText(showLead), showLead.phone)} className="px-3 py-2 rounded-xl text-xs bg-emerald-600/80 text-white flex items-center justify-center gap-1"><Send size={14} /> واتساپ</button>
                <button onClick={() => navigator.clipboard.writeText(generateAiText(showLead))} className="px-3 py-2 rounded-xl text-xs bg-gray-800/80 text-white flex items-center justify-center gap-1"><CopyIcon /> کپی متن</button>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">نوع پیام AI</div>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  <button onClick={() => setAiMessageType('open')} className={`py-2 rounded-lg border ${aiMessageType==='open' ? 'bg-purple-600/80 text-white border-purple-500/60' : 'bg-gray-800/60 text-gray-200 border-gray-700/60'}`}>شروع</button>
                  <button onClick={() => setAiMessageType('follow')} className={`py-2 rounded-lg border ${aiMessageType==='follow' ? 'bg-purple-600/80 text-white border-purple-500/60' : 'bg-gray-800/60 text-gray-200 border-gray-700/60'}`}>پیگیری</button>
                  <button onClick={() => setAiMessageType('gift')} className={`py-2 rounded-lg border ${aiMessageType==='gift' ? 'bg-purple-600/80 text-white border-purple-500/60' : 'bg-gray-800/60 text-gray-200 border-gray-700/60'}`}>هدیه</button>
                  <button onClick={() => setAiMessageType('direct')} className={`py-2 rounded-lg border ${aiMessageType==='direct' ? 'bg-purple-600/80 text-white border-purple-500/60' : 'bg-gray-800/60 text-gray-200 border-gray-700/60'}`}>فروش مستقیم</button>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">پیشنهاد AI</div>
                <textarea readOnly className="w-full h-28 px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-purple-300/50 dark:border-purple-600/50 text-xs text-gray-900 dark:text-white">
{generateAiText(showLead)}
                </textarea>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">یادداشت</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: گفت بعد عید تماس بگیرم" className="w-full h-20 px-3 py-2 bg-white/80 dark:bg-gray-700/70 rounded-xl border border-gray-300/40 dark:border-gray-600/50 text-xs text-gray-900 dark:text-white"></textarea>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openWhatsApp(generateAiText(showLead), showLead.phone)} className="px-3 py-2 rounded-xl text-xs bg-emerald-600/80 text-white flex items-center justify-center gap-1"><Phone size={14} /> واتساپ</button>
                <button onClick={() => navigator.clipboard.writeText(generateAiText(showLead))} className="px-3 py-2 rounded-xl text-xs bg-gray-800/80 text-white flex items-center justify-center gap-1"><CopyIcon /> کپی</button>
                <button onClick={() => setShowLead(null)} className="px-3 py-2 rounded-xl text-xs bg-red-600/80 text-white">بستن</button>
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

export default CRM;


