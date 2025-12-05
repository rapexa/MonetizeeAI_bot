import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Clock, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import apiService from '../services/api';

interface Ticket {
  id?: number;
  ID?: number;
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'answered' | 'closed';
  created_at?: string;
  CreatedAt?: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id?: number;
  ID?: number;
  sender_type: 'user' | 'admin';
  message: string;
  created_at?: string;
  CreatedAt?: string;
  is_read: boolean;
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // Create ticket form
  const [createForm, setCreateForm] = useState({
    subject: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    message: ''
  });
  
  // Reply form
  const [replyMessage, setReplyMessage] = useState('');

  // Helper function to get ticket ID from either format (id or ID)
  const getTicketId = (ticket: Ticket | any): number | undefined => {
    return ticket?.id || ticket?.ID;
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await apiService.getUserTickets();
      if (response.success && response.data) {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!createForm.subject.trim() || !createForm.message.trim()) {
      alert('لطفا موضوع و پیام را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.createTicket({
        subject: createForm.subject,
        priority: createForm.priority,
        message: createForm.message
      });

      if (response.success && response.data) {
        // Clear form first
        setCreateForm({ subject: '', priority: 'normal', message: '' });
        // Reload tickets to show the new ticket
        await loadTickets();
        // Stay on list view (already on 'create', so go back to 'list')
        setView('list');
      } else {
        alert(response.error || 'خطا در ایجاد تیکت');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('خطا در ایجاد تیکت');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
    // Load full ticket details
    try {
      const ticketId = getTicketId(ticket);
      if (ticketId) {
        const response = await apiService.getTicket(ticketId);
        if (response.success && response.data) {
          setSelectedTicket(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading ticket details:', error);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setLoading(true);
    try {
      const ticketId = getTicketId(selectedTicket);
      if (!ticketId) {
        alert('خطا: شناسه تیکت یافت نشد');
        setLoading(false);
        return;
      }
      
      const response = await apiService.replyTicket(ticketId, replyMessage);
      if (response.success) {
        // Clear reply message immediately
        setReplyMessage('');
        // Reload ticket details immediately to show the new message
        const ticketResponse = await apiService.getTicket(ticketId);
        if (ticketResponse.success && ticketResponse.data) {
          setSelectedTicket(ticketResponse.data);
        }
        // Reload tickets list to update status
        await loadTickets();
        // Stay on detail view to see the new message
      } else {
        alert(response.error || 'خطا در ارسال پاسخ');
      }
    } catch (error) {
      console.error('Error replying to ticket:', error);
      alert('خطا در ارسال پاسخ');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    
    if (!confirm('آیا مطمئن هستید که می‌خواهید این تیکت را ببندید؟')) {
      return;
    }

    setLoading(true);
    try {
      const ticketId = getTicketId(selectedTicket);
      if (!ticketId) {
        alert('خطا: شناسه تیکت یافت نشد');
        setLoading(false);
        return;
      }
      const response = await apiService.closeTicket(ticketId);
      if (response.success) {
        await loadTickets();
        setView('list');
        setSelectedTicket(null);
        alert('تیکت با موفقیت بسته شد!');
      } else {
        alert(response.error || 'خطا در بستن تیکت');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert('خطا در بستن تیکت');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'low': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'فوری';
      case 'high': return 'بالا';
      case 'normal': return 'عادی';
      case 'low': return 'پایین';
      default: return 'عادی';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'answered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'closed': return 'بسته شده';
      case 'answered': return 'پاسخ داده شده';
      case 'in_progress': return 'در حال بررسی';
      case 'open': return 'باز';
      default: return 'باز';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[10000]">
      <div 
        className="bg-gradient-to-br from-[#0F0817] via-[#10091c] to-[#0F0817] backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-700/60 shadow-2xl flex flex-col"
        style={{ minHeight: '500px' }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-700/60 bg-gradient-to-r from-[#2c189a]/20 to-[#5a189a]/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-xl flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">سیستم تیکت</h3>
                <p className="text-sm text-gray-300">
                  {view === 'list' && 'لیست تیکت‌های شما'}
                  {view === 'create' && 'ایجاد تیکت جدید'}
                  {view === 'detail' && selectedTicket?.subject}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110 border border-gray-700/60"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* List View */}
          {view === 'list' && (
            <div className="space-y-4">
              <button
                onClick={() => setView('create')}
                className="w-full bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white py-3 px-4 rounded-xl font-medium hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-all duration-300 shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <MessageSquare size={20} />
                ایجاد تیکت جدید
              </button>

              {loadingTickets ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin"></div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">شما هنوز تیکتی ایجاد نکرده‌اید</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={getTicketId(ticket) || Math.random()}
                      onClick={() => handleViewTicket(ticket)}
                      className="backdrop-blur-xl rounded-xl p-4 border border-gray-700/60 cursor-pointer hover:border-[#5a189a]/50 transition-all duration-300 hover:scale-[1.02]"
                      style={{ backgroundColor: '#10091c' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-white text-lg">{ticket.subject}</h4>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {ticket.messages && ticket.messages.length > 0 && ticket.messages[0].message.length > 100
                          ? ticket.messages[0].message.substring(0, 100) + '...'
                          : ticket.messages && ticket.messages.length > 0
                          ? ticket.messages[0].message
                          : 'بدون پیام'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(ticket.created_at || (ticket as any).CreatedAt || '')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create View */}
          {view === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">موضوع تیکت</label>
                <input
                  type="text"
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300"
                  placeholder="موضوع تیکت را وارد کنید"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">اولویت</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300"
                >
                  <option value="low">پایین</option>
                  <option value="normal">عادی</option>
                  <option value="high">بالا</option>
                  <option value="urgent">فوری</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">پیام</label>
                <textarea
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                  placeholder="پیام خود را وارد کنید"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setView('list');
                    setCreateForm({ subject: '', priority: 'normal', message: '' });
                  }}
                  className="flex-1 py-3 px-4 bg-gray-800/40 text-gray-300 rounded-xl font-medium hover:bg-gray-700/50 transition-all duration-300 border border-gray-700/40"
                >
                  انصراف
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={16} />
                      ایجاد تیکت
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Detail View */}
          {view === 'detail' && selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="backdrop-blur-xl rounded-xl p-4 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-white text-lg">{selectedTicket.subject}</h4>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(selectedTicket.priority)}`}>
                      {getPriorityLabel(selectedTicket.priority)}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{formatDate(selectedTicket.created_at || (selectedTicket as any).CreatedAt || '')}</p>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg, index) => (
                    <div
                      key={msg.id || (msg as any).ID || index}
                      className={`p-4 rounded-xl ${
                        msg.sender_type === 'user'
                          ? 'bg-gradient-to-r from-[#2c189a]/20 to-[#5a189a]/20 border border-[#5a189a]/30'
                          : 'bg-gray-800/40 border border-gray-700/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">
                          {msg.sender_type === 'user' ? 'شما' : 'پشتیبان'}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(msg.created_at || (msg as any).CreatedAt || '')}</span>
                      </div>
                      <p className="text-white whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">هنوز پیامی وجود ندارد</p>
                )}
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' && (
                <div className="space-y-3">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                    placeholder="پیام خود را وارد کنید..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseTicket}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-800/40 text-gray-300 rounded-xl font-medium hover:bg-gray-700/50 transition-all duration-300 border border-gray-700/40 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Lock size={16} />
                      بستن تیکت
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={loading || !replyMessage.trim()}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send size={16} />
                          ارسال پاسخ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 text-center">
                  <Lock size={24} className="text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">این تیکت بسته شده است</p>
                </div>
              )}

              <button
                onClick={() => {
                  setView('list');
                  setSelectedTicket(null);
                }}
                className="w-full py-3 px-4 bg-gray-800/40 text-gray-300 rounded-xl font-medium hover:bg-gray-700/50 transition-all duration-300 border border-gray-700/40"
              >
                بازگشت به لیست
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketModal;

