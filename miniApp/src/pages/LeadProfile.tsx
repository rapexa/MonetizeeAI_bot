import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowRight, Phone, MessageCircle, Send, Star, Calendar, 
  MapPin, Mail, DollarSign, TrendingUp, Clock, CheckCircle,
  X, Plus, Edit3, Trash2, Eye, Download, Copy, Save
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
  score: number;
  notes?: Array<{ text: string; timestamp: string }>;
  interactions?: Array<{ type: 'call' | 'whatsapp' | 'sms' | 'meeting'; text: string; timestamp: string }>;
  upcoming?: Array<{ type: 'call' | 'whatsapp' | 'sms' | 'meeting'; due: string; text: string }>;
};

const LeadProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lead: Lead = location.state?.lead;

  const [showAddNote, setShowAddNote] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');
  const [showAddTask, setShowAddTask] = React.useState(false);
  const [newTask, setNewTask] = React.useState({ title: '', due: '', status: 'pending' as const, note: '' });
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedLead, setEditedLead] = React.useState(lead);

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-white py-20">
            <h1 className="text-2xl font-bold mb-4">لید یافت نشد</h1>
            <button 
              onClick={() => navigate('/crm')}
              className="px-6 py-3 bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white rounded-xl font-medium"
            >
              بازگشت به CRM
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'hot': return 'text-emerald-300 bg-emerald-600/20 border-emerald-500/30';
      case 'warm': return 'text-yellow-300 bg-yellow-600/20 border-yellow-500/30';
      case 'cold': return 'text-gray-300 bg-gray-700/40 border-gray-600/50';
    }
  };

  const getStatusText = (status: LeadStatus) => {
    switch (status) {
      case 'hot': return 'آماده خرید';
      case 'warm': return 'نیمه‌گرم';
      case 'cold': return 'سرد';
    }
  };

  const callNumber = (phone?: string) => {
    if (phone) window.open(`tel:${phone}`, '_self');
  };

  const smsNumber = (phone?: string) => {
    if (phone) window.open(`sms:${phone}`, '_self');
  };

  const openWhatsApp = (text: string, phone?: string) => {
    const msg = encodeURIComponent(text);
    const number = phone ? phone.replace(/^0/, '98') : '';
    const url = number ? `https://wa.me/${number}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/crm')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 text-gray-200 hover:bg-gray-700/60 transition-colors"
            >
              <ArrowRight size={18} className="rotate-180" />
              <span className="text-sm font-medium">بازگشت</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <h1 className="text-lg font-bold text-white">{editedLead.name}</h1>
                <p className="text-xs text-gray-400">پروفایل لید</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <select 
                  value={editedLead.status}
                  onChange={(e) => setEditedLead(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                  className="px-3 py-1 rounded-full text-xs border bg-gray-800/50 text-white border-gray-600/50"
                >
                  <option value="cold">سرد</option>
                  <option value="warm">نیمه‌گرم</option>
                  <option value="hot">آماده خرید</option>
                </select>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(editedLead.status)}`}>
                  {getStatusText(editedLead.status)}
                </span>
              )}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-lg bg-gray-800/60 text-gray-200 hover:bg-gray-700/60 transition-colors"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <h2 className="text-lg font-bold text-white mb-4">اقدامات سریع</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              onClick={() => callNumber(lead.phone)}
              className="p-4 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 text-white flex flex-col items-center gap-2 border border-gray-700/60 hover:scale-105 transition-transform"
            >
              <Phone size={20} />
              <span className="text-xs font-medium">تماس</span>
            </button>
            <button 
              onClick={() => openWhatsApp(`سلام ${editedLead.name} عزیز! من از مانیتایزAI هستم. دوست دارید یک گفت‌وگوی کوتاه داشته باشیم؟`, editedLead.phone)}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex flex-col items-center gap-2 border border-emerald-600/60 hover:scale-105 transition-transform"
            >
              <Send size={20} />
              <span className="text-xs font-medium">واتساپ</span>
            </button>
            <button 
              onClick={() => smsNumber(editedLead.phone)}
              className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600/60 to-indigo-700/60 text-white flex flex-col items-center gap-2 border border-indigo-500/60 hover:scale-105 transition-transform"
            >
              <MessageCircle size={20} />
              <span className="text-xs font-medium">پیامک</span>
            </button>
            <button 
              onClick={() => setShowAddTask(true)}
              className="p-4 rounded-2xl bg-gradient-to-br from-[#8A00FF] to-[#C738FF] text-white flex flex-col items-center gap-2 border border-white/10 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(139,0,255,0.35)]"
            >
              <Plus size={20} />
              <span className="text-xs font-medium">وظیفه</span>
            </button>
          </div>
        </div>

        {/* Lead Information */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">اطلاعات لید</h2>
            {isEditing && (
              <button 
                onClick={() => {
                  // Save changes logic here
                  setIsEditing(false);
                }}
                className="px-3 py-1 rounded-lg text-xs bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white border border-white/10"
              >
                <Save size={14} className="inline ml-1" />
                ذخیره
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
                <Phone size={16} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">شماره تماس</p>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editedLead.phone || ''}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      placeholder="شماره تماس"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white">{editedLead.phone || 'ثبت نشده'}</p>
                      {editedLead.phone && (
                        <button 
                          onClick={() => navigator.clipboard.writeText(editedLead.phone || '')}
                          className="p-1 rounded hover:bg-gray-700/50 transition-colors"
                        >
                          <Copy size={12} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
                <Mail size={16} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">ایمیل</p>
                  {isEditing ? (
                    <input 
                      type="email"
                      value={editedLead.email || ''}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      placeholder="ایمیل"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white">{editedLead.email || 'ثبت نشده'}</p>
                      {editedLead.email && (
                        <button 
                          onClick={() => navigator.clipboard.writeText(editedLead.email || '')}
                          className="p-1 rounded hover:bg-gray-700/50 transition-colors"
                        >
                          <Copy size={12} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
                <DollarSign size={16} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">ارزش تخمینی</p>
                  {isEditing ? (
                    <input 
                      type="number"
                      value={editedLead.estimatedValue}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, estimatedValue: parseInt(e.target.value) || 0 }))}
                      className="w-full mt-1 px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      placeholder="ارزش تخمینی"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white">{formatCurrency(editedLead.estimatedValue)}</p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(editedLead.estimatedValue.toString())}
                        className="p-1 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        <Copy size={12} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
                <Star size={16} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">امتیاز</p>
                  {isEditing ? (
                    <select 
                      value={editedLead.score}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                      className="w-full mt-1 px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    >
                      <option value={1}>1 ستاره</option>
                      <option value={2}>2 ستاره</option>
                      <option value={3}>3 ستاره</option>
                      <option value={4}>4 ستاره</option>
                      <option value={5}>5 ستاره</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={12} className={i <= editedLead.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Management */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">وظایف و پیگیری‌ها</h2>
            <button 
              onClick={() => setShowAddTask(true)}
              className="px-3 py-1 rounded-lg text-xs bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white border border-white/10"
            >
              افزودن وظیفه
            </button>
          </div>
          <div className="space-y-3">
            {lead.upcoming && lead.upcoming.length > 0 ? (
              lead.upcoming.map((task, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8A00FF] to-[#C738FF] flex items-center justify-center">
                    <Clock size={14} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{task.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(task.due).toLocaleString('fa-IR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-[10px] rounded-full border bg-purple-600/20 text-purple-200 border-purple-500/30">
                      {task.type === 'call' ? 'تماس' : task.type === 'whatsapp' ? 'واتساپ' : task.type === 'sms' ? 'پیامک' : 'جلسه'}
                    </span>
                    <button className="p-1 rounded hover:bg-gray-700/50 transition-colors">
                      <Edit3 size={12} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">هیچ وظیفه‌ای ثبت نشده است</p>
                <p className="text-xs mt-1">برای شروع، یک وظیفه جدید اضافه کنید</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">یادداشت‌ها</h2>
            <button 
              onClick={() => setShowAddNote(true)}
              className="px-3 py-1 rounded-lg text-xs bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white border border-white/10"
            >
              افزودن
            </button>
          </div>
          <div className="space-y-3">
            {lead.notes && lead.notes.length > 0 ? (
              lead.notes.map((note, index) => (
                <div key={index} className="p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
                  <p className="text-sm text-white">{note.text}</p>
                  <p className="text-xs text-gray-400 mt-2">{note.timestamp}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">هیچ یادداشتی ثبت نشده است</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-8 p-6">
          <div className="w-full max-w-md backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700/60">
              <h3 className="text-lg font-bold text-white">افزودن یادداشت</h3>
              <button 
                onClick={() => setShowAddNote(false)} 
                className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none" 
                placeholder="یادداشت خود را وارد کنید..."
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddNote(false)} 
                  className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button 
                  onClick={() => {
                    // Add note logic here
                    setShowAddNote(false);
                    setNewNote('');
                  }} 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white rounded-xl font-medium shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-8 p-6">
          <div className="w-full max-w-md backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700/60">
              <h3 className="text-lg font-bold text-white">افزودن وظیفه</h3>
              <button 
                onClick={() => setShowAddTask(false)} 
                className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">عنوان وظیفه</label>
                <input 
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                  placeholder="عنوان وظیفه را وارد کنید"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">تاریخ و ساعت</label>
                <input 
                  type="datetime-local" 
                  value={newTask.due}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">وضعیت</label>
                <select 
                  value={newTask.status}
                  onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="pending">در انتظار</option>
                  <option value="done">انجام شد</option>
                  <option value="overdue">عقب‌افتاده</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">یادداشت</label>
                <textarea 
                  value={newTask.note}
                  onChange={(e) => setNewTask(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full h-20 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none" 
                  placeholder="یادداشت اختیاری..."
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddTask(false)} 
                  className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button 
                  onClick={() => {
                    // Add task logic here - this should also add to main CRM tasks
                    setShowAddTask(false);
                    setNewTask({ title: '', due: '', status: 'pending', note: '' });
                  }} 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white rounded-xl font-medium shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadProfile;
