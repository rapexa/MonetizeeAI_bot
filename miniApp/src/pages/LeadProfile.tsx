import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowRight, Phone, MessageCircle, Send, Star, 
  DollarSign, Clock, X, Plus, Edit3, Trash2, 
  Copy, Save, PenLine, Mail
} from 'lucide-react';

type LeadStatus = 'cold' | 'warm' | 'hot';

type TaskStatus = 'pending' | 'done' | 'overdue';
type Task = {
  id: string;
  title: string;
  leadId?: string;
  due: string; // ISO
  status: TaskStatus;
  note?: string;
  remind?: boolean;
  type?: 'call' | 'whatsapp' | 'sms' | 'meeting';
  text?: string;
};

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

  const [newNote, setNewNote] = React.useState('');
  const [isSavingNote, setIsSavingNote] = React.useState(false);
  const [noteSaved, setNoteSaved] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showAddTask, setShowAddTask] = React.useState(false);
  const [newTask, setNewTask] = React.useState({ title: '', due: '', status: 'pending' as const, note: '', type: 'call' as const });
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedLead, setEditedLead] = React.useState(lead);
  const [editingTask, setEditingTask] = React.useState<number | null>(null);
  
  // Load tasks from localStorage
  const [tasks, setTasks] = React.useState<Task[]>(() => {
    if (!lead?.id) return [];
    const saved = localStorage.getItem(`crm-lead-tasks-${lead.id}`);
    if (saved) {
      return JSON.parse(saved);
    }
    // Convert lead.upcoming to Task format and add status
    return (lead.upcoming || []).map((task, index) => ({
      id: `task-${lead.id}-${index}`,
      title: task.text,
      leadId: lead.id,
      due: task.due,
      status: 'pending' as TaskStatus,
      type: task.type,
      text: task.text
    }));
  });
  
  // Load notes from localStorage
  const [notes, setNotes] = React.useState(() => {
    if (!lead?.id) return [];
    const saved = localStorage.getItem(`crm-lead-notes-${lead.id}`);
    return saved ? JSON.parse(saved) : (lead?.notes || []);
  });

  // Save tasks to localStorage whenever it changes
  React.useEffect(() => {
    if (lead?.id) {
      localStorage.setItem(`crm-lead-tasks-${lead.id}`, JSON.stringify(tasks));
    }
  }, [tasks, lead?.id]);

  // Save notes to localStorage whenever it changes
  React.useEffect(() => {
    if (lead?.id) {
      localStorage.setItem(`crm-lead-notes-${lead.id}`, JSON.stringify(notes));
    }
  }, [notes, lead?.id]);

  // Save lead changes to localStorage
  React.useEffect(() => {
    if (lead?.id && editedLead) {
      const savedLeads = localStorage.getItem('crm-leads');
      if (savedLeads) {
        const leads = JSON.parse(savedLeads);
        const updatedLeads = leads.map((l: Lead) => l.id === lead.id ? editedLead : l);
        localStorage.setItem('crm-leads', JSON.stringify(updatedLeads));
      }
    }
  }, [editedLead, lead?.id]);

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
    <div className="min-h-screen" style={{ backgroundColor: '#10091c' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-gray-700/50" style={{ backgroundColor: 'rgba(16, 9, 28, 0.8)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/crm', { state: { tab: 'leads' } })}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl border border-gray-700/60 shadow-lg" 
              style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
            >
              <ArrowRight size={18} className="rotate-180" />
              <span className="text-sm font-medium">بازگشت</span>
            </button>
            

            <div className="flex items-center gap-3">
              {isEditing ? (
                <select 
                  value={editedLead.status}
                  onChange={(e) => setEditedLead(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                  className="px-4 py-2 rounded-2xl text-sm border text-white backdrop-blur-xl border-gray-700/60 shadow-lg" 
                  style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                >
                  <option value="cold">سرد</option>
                  <option value="warm">نیمه‌گرم</option>
                  <option value="hot">آماده خرید</option>
                </select>
              ) : (
                <span className={`px-4 py-2 rounded-2xl text-sm border backdrop-blur-xl shadow-lg ${getStatusColor(editedLead.status)}`}>
                  {getStatusText(editedLead.status)}
                </span>
              )}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-3 rounded-2xl text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl border border-gray-700/60 shadow-lg" 
                style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
              >
                <Edit3 size={18} />
              </button>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="p-3 rounded-2xl text-red-300 hover:text-red-200 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl border border-red-500/30 shadow-lg hover:border-red-400/50" 
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                title="حذف لید"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <h2 className="text-lg font-bold text-white mb-6">اقدامات سریع</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => callNumber(lead.phone)}
              className="p-4 rounded-2xl text-white flex flex-col items-center gap-3 border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl shadow-lg" 
              style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
            >
              <Phone size={22} />
              <span className="text-sm font-medium">تماس</span>
            </button>
            <button 
              onClick={() => openWhatsApp(`سلام ${editedLead.name} عزیز! من از مانیتایزAI هستم. دوست دارید یک گفت‌وگوی کوتاه داشته باشیم؟`, editedLead.phone)}
              className="p-4 rounded-2xl text-white flex flex-col items-center gap-3 border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl shadow-lg" 
              style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
            >
              <Send size={22} />
              <span className="text-sm font-medium">واتساپ</span>
            </button>
            <button 
              onClick={() => smsNumber(editedLead.phone)}
              className="p-4 rounded-2xl text-white flex flex-col items-center gap-3 border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl shadow-lg" 
              style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
            >
              <MessageCircle size={22} />
              <span className="text-sm font-medium">پیامک</span>
            </button>
            <button 
              onClick={() => setShowAddTask(true)}
              className="p-4 rounded-2xl text-white flex flex-col items-center gap-3 border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl shadow-lg" 
              style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
            >
              <Plus size={22} />
              <span className="text-sm font-medium">وظیفه</span>
            </button>
          </div>
        </div>

        {/* Lead Information */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">اطلاعات لید</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-3 rounded-2xl text-gray-200 hover:scale-[1.02] active:scale-[0.99] transition-all backdrop-blur-xl border border-gray-700/60 shadow-lg" 
                style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
              >
                <PenLine size={18} />
              </button>
              {isEditing && (
                <button 
                  onClick={() => {
                    // Save changes to localStorage
                    const savedLeads = localStorage.getItem('crm-leads');
                    if (savedLeads) {
                      const leads = JSON.parse(savedLeads);
                      const updatedLeads = leads.map((l: Lead) => l.id === editedLead.id ? editedLead : l);
                      localStorage.setItem('crm-leads', JSON.stringify(updatedLeads));
                    }
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-2xl text-sm bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  ذخیره
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Lead Name */}
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8A00FF] to-[#C738FF] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{editedLead.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">نام و نام خانوادگی</p>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editedLead.name}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                      placeholder="نام کامل"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-base text-white font-medium">{editedLead.name}</p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(editedLead.name)}
                        className="p-2 rounded-xl hover:scale-[1.05] active:scale-[0.95] transition-all backdrop-blur-xl border border-gray-700/60" 
                        style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                      >
                        <Copy size={14} className="text-gray-300" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8A00FF] to-[#C738FF] flex items-center justify-center">
                  <Phone size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">شماره تماس</p>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editedLead.phone || ''}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                      placeholder="شماره تماس"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-base text-white font-medium">{editedLead.phone || 'ثبت نشده'}</p>
                      {editedLead.phone && (
                        <button 
                          onClick={() => navigator.clipboard.writeText(editedLead.phone || '')}
                          className="p-2 rounded-xl hover:scale-[1.05] active:scale-[0.95] transition-all backdrop-blur-xl border border-gray-700/60" 
                          style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                        >
                          <Copy size={14} className="text-gray-300" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Mail size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">ایمیل</p>
                  {isEditing ? (
                    <input 
                      type="email"
                      value={editedLead.email || ''}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                      placeholder="ایمیل"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-base text-white font-medium">{editedLead.email || 'ثبت نشده'}</p>
                      {editedLead.email && (
                        <button 
                          onClick={() => navigator.clipboard.writeText(editedLead.email || '')}
                          className="p-2 rounded-xl hover:scale-[1.05] active:scale-[0.95] transition-all backdrop-blur-xl border border-gray-700/60" 
                          style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                        >
                          <Copy size={14} className="text-gray-300" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <DollarSign size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">ارزش تخمینی</p>
                  {isEditing ? (
                    <input 
                      type="number"
                      value={editedLead.estimatedValue}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, estimatedValue: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                      placeholder="ارزش تخمینی"
                    />
                  ) : (
                    <p className="text-base text-white font-medium">{formatCurrency(editedLead.estimatedValue)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                  <Star size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">امتیاز</p>
                  {isEditing ? (
                    <select 
                      value={editedLead.score}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
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
                        <Star key={i} size={16} className={i <= editedLead.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">وظایف و پیگیری‌ها</h2>
            <button 
              onClick={() => setShowAddTask(true)}
              className="px-4 py-2 rounded-2xl text-sm bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white border border-white/10 shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              افزودن وظیفه
            </button>
          </div>
          <div className="space-y-4">
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg hover:scale-[1.01] transition-all" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8A00FF] to-[#C738FF] flex items-center justify-center">
                    <Clock size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base text-white font-medium">{task.title || task.text}</p>
                    <p className="text-sm text-gray-300 mt-1">{new Date(task.due).toLocaleString('fa-IR')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs rounded-full border backdrop-blur-xl shadow-lg ${
                      task.status === 'pending' ? 'bg-purple-600/20 text-purple-200 border-purple-500/30' :
                      task.status === 'done' ? 'bg-green-600/20 text-green-200 border-green-500/30' :
                      'bg-red-600/20 text-red-200 border-red-500/30'
                    }`}>
                      {task.status === 'pending' ? 'در انتظار' : 
                       task.status === 'done' ? 'انجام شد' : 'عقب افتاده'}
                    </span>
                    <button 
                      onClick={() => setEditingTask(index)}
                      className="p-2 rounded-xl hover:scale-[1.05] active:scale-[0.95] transition-all backdrop-blur-xl border border-gray-700/60" 
                      style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                    >
                      <Edit3 size={16} className="text-gray-300" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-gray-500" />
                </div>
                <p className="text-base">هیچ وظیفه‌ای ثبت نشده است</p>
                <p className="text-sm text-gray-500 mt-1">برای شروع، یک وظیفه جدید اضافه کنید</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <h2 className="text-lg font-bold text-white mb-6">یادداشت‌ها</h2>
          
          {/* Display existing notes */}
          {notes.length > 0 && (
            <div className="space-y-4 mb-6">
              {notes.map((note: { text: string; timestamp: string }, index: number) => (
                <div key={index} className="p-4 rounded-2xl border border-gray-700/60 backdrop-blur-xl shadow-lg" style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}>
                  <p className="text-white text-sm mb-2">{note.text}</p>
                  <p className="text-gray-400 text-xs">{note.timestamp}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-6">
            <div className="relative">
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full h-40 px-4 py-4 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none backdrop-blur-xl shadow-lg" 
                placeholder="یادداشت جدید خود را اینجا بنویسید..."
                style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
              />
            </div>
            <div className="flex justify-end">
              <button 
                onClick={async () => {
                  if (!newNote.trim()) return;
                  
                  setIsSavingNote(true);
                  setNoteSaved(false);
                  
                  // Simulate saving delay
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Add note to notes array
                  const newNoteObj = {
                    text: newNote.trim(),
                    timestamp: new Date().toLocaleString('fa-IR')
                  };
                  
                  setNotes((prev: { text: string; timestamp: string }[]) => [...prev, newNoteObj]);
                  setNewNote('');
                  
                  setIsSavingNote(false);
                  setNoteSaved(true);
                  
                  // Reset success state after 2 seconds
                  setTimeout(() => {
                    setNoteSaved(false);
                  }, 2000);
                }}
                disabled={isSavingNote || !newNote.trim()}
                className={`px-8 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                  noteSaved 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.35)] scale-105' 
                    : isSavingNote
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99]'
                }`}
              >
                {isSavingNote ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    در حال ذخیره...
                  </div>
                ) : noteSaved ? (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    ذخیره شد!
                  </div>
                ) : (
                  'ذخیره یادداشت'
                )}
              </button>
            </div>
          </div>
        </div>

      </div>


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
                <label className="block text-sm font-medium text-gray-300 mb-2">نوع وظیفه</label>
                <select 
                  value={newTask.type}
                  onChange={(e) => setNewTask(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="call">تماس</option>
                  <option value="whatsapp">واتساپ</option>
                  <option value="sms">پیامک</option>
                  <option value="meeting">جلسه</option>
                </select>
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
                  <option value="overdue">عقب افتاده</option>
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
                    if (newTask.title.trim() && newTask.due) {
                      const newTaskObj: Task = {
                        id: `task-${lead.id}-${Date.now()}`,
                        title: newTask.title.trim(),
                        leadId: lead.id,
                        due: new Date(newTask.due).toISOString(),
                        status: newTask.status,
                        note: newTask.note,
                        type: newTask.type,
                        text: newTask.title.trim()
                      };
                      setTasks(prev => [...prev, newTaskObj]);
                      setShowAddTask(false);
                      setNewTask({ title: '', due: '', status: 'pending', note: '', type: 'call' });
                    }
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

      {/* Edit Task Modal */}
      {editingTask !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-8 p-6">
          <div className="w-full max-w-md backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700/60">
              <h3 className="text-lg font-bold text-white">ویرایش وظیفه</h3>
              <button 
                onClick={() => setEditingTask(null)} 
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
                  value={tasks[editingTask]?.title || tasks[editingTask]?.text || ''}
                  onChange={(e) => {
                    const updatedTasks = [...tasks];
                    updatedTasks[editingTask] = { ...updatedTasks[editingTask], title: e.target.value, text: e.target.value };
                    setTasks(updatedTasks);
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                  placeholder="عنوان وظیفه را وارد کنید"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">تاریخ و ساعت</label>
                <input 
                  type="datetime-local" 
                  value={tasks[editingTask]?.due ? new Date(tasks[editingTask].due).toISOString().slice(0,16) : ''}
                  onChange={(e) => {
                    const updatedTasks = [...tasks];
                    updatedTasks[editingTask] = { ...updatedTasks[editingTask], due: new Date(e.target.value).toISOString() };
                    setTasks(updatedTasks);
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">نوع وظیفه</label>
                <select 
                  value={tasks[editingTask]?.type || 'call'}
                  onChange={(e) => {
                    const updatedTasks = [...tasks];
                    updatedTasks[editingTask] = { ...updatedTasks[editingTask], type: e.target.value as any };
                    setTasks(updatedTasks);
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="call">تماس</option>
                  <option value="whatsapp">واتساپ</option>
                  <option value="sms">پیامک</option>
                  <option value="meeting">جلسه</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">وضعیت</label>
                <select 
                  value={tasks[editingTask]?.status || 'pending'}
                  onChange={(e) => {
                    const updatedTasks = [...tasks];
                    updatedTasks[editingTask] = { ...updatedTasks[editingTask], status: e.target.value as any };
                    setTasks(updatedTasks);
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="pending">در انتظار</option>
                  <option value="done">انجام شد</option>
                  <option value="overdue">عقب افتاده</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">یادداشت</label>
                <textarea 
                  value={tasks[editingTask]?.note || ''}
                  onChange={(e) => {
                    const updatedTasks = [...tasks];
                    updatedTasks[editingTask] = { ...updatedTasks[editingTask], note: e.target.value };
                    setTasks(updatedTasks);
                  }}
                  className="w-full h-20 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none" 
                  placeholder="یادداشت (اختیاری)"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const updatedTasks = tasks.filter((_, index) => index !== editingTask);
                    setTasks(updatedTasks);
                    setEditingTask(null);
                  }} 
                  className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  حذف
                </button>
                <button 
                  onClick={() => setEditingTask(null)} 
                  className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button 
                  onClick={() => setEditingTask(null)} 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#8A00FF] to-[#C738FF] text-white rounded-xl font-medium shadow-[0_0_20px_rgba(139,0,255,0.35)] hover:shadow-[0_0_28px_rgba(199,56,255,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden" style={{ backgroundColor: '#10091c' }}>
            {/* Header */}
            <div className="p-6 border-b border-gray-700/60 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">حذف لید</h3>
              <p className="text-sm text-gray-300">آیا مطمئن هستید که می‌خواهید این لید را حذف کنید؟</p>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8A00FF] to-[#C738FF] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{editedLead.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{editedLead.name}</p>
                    <p className="text-sm text-gray-300">{editedLead.phone || editedLead.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mt-0.5">
                    <span className="text-amber-400 text-xs">!</span>
                  </div>
                  <div>
                    <p className="text-amber-200 text-sm font-medium mb-1">هشدار</p>
                    <p className="text-xs text-amber-300">این عمل قابل بازگشت نیست. تمام اطلاعات، وظایف و یادداشت‌های مربوط به این لید حذف خواهد شد.</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-medium text-gray-200 border border-gray-700/60 hover:scale-[1.02] active:scale-[0.99] transition backdrop-blur-xl shadow-lg" 
                  style={{ backgroundColor: 'rgba(16, 9, 28, 0.6)' }}
                >
                  انصراف
                </button>
                <button 
                  onClick={() => {
                    // Delete lead from localStorage
                    const savedLeads = localStorage.getItem('crm-leads');
                    if (savedLeads) {
                      const leads = JSON.parse(savedLeads);
                      const updatedLeads = leads.filter((l: Lead) => l.id !== editedLead.id);
                      localStorage.setItem('crm-leads', JSON.stringify(updatedLeads));
                    }
                    
                    // Delete lead-specific data
                    localStorage.removeItem(`crm-lead-tasks-${editedLead.id}`);
                    localStorage.removeItem(`crm-lead-notes-${editedLead.id}`);
                    
                    // Navigate back to CRM after deletion
                    navigate('/crm');
                  }}
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_28px_rgba(239,68,68,0.45)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                >
                  حذف لید
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
