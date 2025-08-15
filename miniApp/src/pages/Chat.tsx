import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Send, Paperclip, Smile, MoreVertical, Search, Image, Mic, Plus, X, CheckCircle2, Crown } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file' | 'voice';
  fileUrl?: string;
  fileName?: string;
  replyTo?: Message;
  reactions?: string[];
}

interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
  verified?: boolean;
  premium?: boolean;
  bio?: string;
  joinDate?: string;
  phone?: string;
}

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sample users data
  const users: Record<string, User> = {
    '1': {
      id: '1',
      name: 'علی محمدی',
      avatar: 'AM',
      isOnline: true,
      verified: true,
      premium: true,
      bio: 'توسعه‌دهنده فول‌استک و علاقه‌مند به هوش مصنوعی 🚀\nبنیان‌گذار استارتاپ تکنولوژی',
      joinDate: 'عضو از: آذر ۱۴۰۲',
      phone: '09123456789'
    },
    '2': {
      id: '2', 
      name: 'سارا احمدی',
      avatar: 'SA',
      isOnline: false,
      lastSeen: '۳۰ دقیقه پیش',
      verified: true,
      bio: 'طراح UI/UX و مدیر محصول\nعاشق طراحی و کاربری بهتر ✨',
      joinDate: 'عضو از: آبان ۱۴۰۲'
    },
    '3': {
      id: '3',
      name: 'محمد رضایی', 
      avatar: 'MR',
      isOnline: true,
      verified: false,
      bio: 'بازاریاب دیجیتال و کارآفرین جوان 💼\nمتخصص در رسانه‌های اجتماعی',
      joinDate: 'عضو از: مهر ۱۴۰۲'
    },
    '4': {
      id: '4',
      name: 'مریم کریمی',
      avatar: 'MK',
      isOnline: false,
      lastSeen: '۲ ساعت پیش',
      verified: true,
      premium: true,
      bio: 'مشاور کسب‌وکار و مربی کارآفرینی 👩‍💼\nکمک به رشد کسب‌وکارهای نوپا',
      joinDate: 'عضو از: شهریور ۱۴۰۲'
    },
    '5': {
      id: '5',
      name: 'حسین نوری',
      avatar: 'HN',
      isOnline: true,
      verified: false,
      bio: 'دانشجوی مهندسی کامپیوتر 🎓\nعلاقه‌مند به یادگیری ماشین',
      joinDate: 'عضو از: دی ۱۴۰۲'
    }
  };

  // Initialize user and messages
  useEffect(() => {
    if (userId && users[userId]) {
      setUser(users[userId]);
      
      // Sample messages for each user
      const sampleMessages: Record<string, Message[]> = {
        '1': [
          {
            id: 1,
            text: 'سلام! چطوری؟ خوش اومدی به MonetizeAI 🎉',
            sender: 'other',
            time: '۱۰:۲۵',
            status: 'read',
            type: 'text',
            reactions: ['👍', '❤️']
          },
          {
            id: 2,
            text: 'سلام! ممنونم، خیلی خوشحالم که اینجام 😊\nواقعاً پلتفرم فوق‌العاده‌ای ساختین!',
            sender: 'me',
            time: '۱۰:۲۶',
            status: 'read',
            type: 'text'
          },
          {
            id: 3,
            text: 'پروژه جدیدت چطور پیش میره؟ شنیدم خیلی خوب کار می‌کنی 🚀',
            sender: 'other',
            time: '۱۰:۳۰',
            status: 'delivered',
            type: 'text'
          }
        ],
        '2': [
          {
            id: 4,
            text: 'سلام سارا! چطور می‌تونم کمکت کنم؟',
            sender: 'me',
            time: '۰۹:۱۰',
            status: 'read',
            type: 'text'
          },
          {
            id: 5,
            text: 'ممنون از راهنمایی‌هات! خیلی مفید بود 🙏\nواقعاً کمک زیادی کردی',
            sender: 'other',
            time: '۰۹:۱۵',
            status: 'read',
            type: 'text',
            reactions: ['🙏', '😊']
          }
        ],
        '3': [
          {
            id: 6,
            text: 'عکس پروژه رو میفرستم براتون',
            sender: 'other',
            time: 'دیروز',
            status: 'delivered',
            type: 'text'
          }
        ],
        '4': [
          {
            id: 7,
            text: 'فردا جلسه داریم؟ ساعت چند بهتره؟',
            sender: 'other',
            time: '۰۸:۳۰',
            status: 'read',
            type: 'text'
          }
        ],
        '5': [
          {
            id: 8,
            text: '👍',
            sender: 'other',
            time: '۲ روز پیش',
            status: 'read',
            type: 'text'
          }
        ]
      };

      setMessages(sampleMessages[userId] || []);
    }
  }, [userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: Date.now(),
      text: newMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text'
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMsg.id ? { ...msg, status: 'delivered' } : msg
        )
      );
    }, 1000);

    // Simulate typing and auto response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const autoResponse: Message = {
        id: Date.now() + 1,
        text: getAutoResponse(newMessage),
        sender: 'other',
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
        type: 'text'
      };
      setMessages(prev => [...prev, autoResponse]);
      
      // Mark as read after a delay
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMsg.id ? { ...msg, status: 'read' } : msg
          )
        );
      }, 2000);
    }, 1500);
  };

  const getAutoResponse = (message: string): string => {
    const responses = [
      'ممنون از پیامت! خیلی جالب بود 😊',
      'عالی! منم همین تجربه رو داشتم 👍',
      'واقعاً الهام‌بخش بود! ادامه بده 🚀',
      'خیلی خوب پیش میری! موفق باشی 💪',
      'این ایده فوق‌العاده است! بیشتر بگو 🤔',
      'دمت گرم! خیلی کمک کردی 🙏',
      'حتماً بررسی می‌کنم! مرسی 🔥'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = event.target.files?.[0];
    if (file) {
      const fileMsg: Message = {
        id: Date.now(),
        text: type === 'image' ? '' : file.name,
        sender: 'me',
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
        type: type === 'image' ? 'image' : 'file',
        fileUrl: URL.createObjectURL(file),
        fileName: file.name
      };

      setMessages(prev => [...prev, fileMsg]);
      setShowAttachments(false);
    }
  };

  const emojis = ['😀', '😂', '❤️', '👍', '👎', '😍', '🤔', '😢', '😡', '🎉', '🔥', '💯', '🙏', '😊', '🚀', '💪'];

  if (!user) {
    return (
              <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-50 dark:from-slate-950 dark:via-gray-950/90 dark:to-slate-950 z-50">
        <div className="text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">👤</span>
          </div>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">کاربر یافت نشد</h2>
          <button 
            onClick={() => navigate('/messages')}
            className="px-6 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            بازگشت به پیام‌ها
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-50 dark:from-slate-950 dark:via-gray-950/90 dark:to-slate-950 z-40">
      {/* Fixed Header */}
              <div className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl border-b border-white/20 dark:border-gray-700/20 px-4 py-3 shadow-[0_10px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgb(0,0,0,0.25)] z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/messages')}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300 hover:scale-110"
            >
              <ArrowRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowUserProfile(true)}>
              <div className="relative group">
                <div className="w-11 h-11 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-full flex items-center justify-center text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300">
                  {user.avatar}
                </div>
                {user.premium && (
                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-xs">👑</span>
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{user.name}</h2>
                  {user.verified && (
                    <CheckCircle2 size={16} className="text-blue-500" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.isOnline ? 'آنلاین' : `آخرین بازدید: ${user.lastSeen}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300 hover:scale-110">
              <Search size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300 hover:scale-110">
              <MoreVertical size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable with fixed positioning */}
      <div className="fixed top-16 bottom-28 left-0 right-0 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-1 pb-12">
          {messages.map((message, index) => {
            const isSameSender = index > 0 && messages[index - 1].sender === message.sender;
            const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender !== message.sender;
            
            return (
              <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'} group ${isSameSender ? 'mt-1' : 'mt-4'}`}>
                <div className={`max-w-xs lg:max-w-md relative ${message.sender === 'me' ? 'order-1' : 'order-2'}`}>
                  {/* Message Bubble */}
                  <div className={`px-4 py-2 rounded-2xl shadow-lg transition-all duration-300 group-hover:shadow-xl ${
                    message.sender === 'me' 
                      ? `bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white ${isLastInGroup ? 'rounded-br-md' : 'rounded-br-lg'}`
                      : `bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-xl ${isLastInGroup ? 'rounded-bl-md' : 'rounded-bl-lg'}`
                  }`}>
                    
                    {message.type === 'text' && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                    )}
                    
                    {message.type === 'image' && (
                      <div className="space-y-2">
                        <img 
                          src={message.fileUrl} 
                          alt="Shared image" 
                          className="rounded-lg max-w-full h-auto"
                        />
                        {message.text && <p className="text-sm">{message.text}</p>}
                      </div>
                    )}
                    
                    {message.type === 'file' && (
                      <div className="flex items-center gap-3 p-2 bg-black/10 dark:bg-white/10 rounded-lg">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <Paperclip size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileName}</p>
                          <p className="text-xs opacity-75">فایل</p>
                        </div>
                      </div>
                    )}

                    {/* Message Footer - Only show on last message in group or single messages */}
                    {isLastInGroup && (
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${
                          message.sender === 'me' ? 'text-blue-100 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {message.time}
                        </span>
                        {message.sender === 'me' && (
                          <div className={`text-xs flex items-center gap-1 ${
                            message.status === 'read' ? 'text-green-200' : 
                            message.status === 'delivered' ? 'text-blue-200' : 'text-gray-300'
                          }`}>
                            {message.status === 'sent' && '✓'}
                            {message.status === 'delivered' && '✓✓'}
                            {message.status === 'read' && '✓✓'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className={`flex gap-1 mt-1 ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-full px-2 py-1 shadow-lg border border-white/30 dark:border-gray-600/30">
                        <div className="flex items-center gap-1">
                          {message.reactions.map((reaction, idx) => (
                            <span key={idx} className="text-sm">{reaction}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start mt-4">
              <div className="bg-white/90 dark:bg-gray-700/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 px-4 py-3 rounded-2xl rounded-bl-md shadow-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Footer - Message Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-white/20 dark:border-gray-700/20 p-4 shadow-xl z-50">
        <div className="max-w-2xl mx-auto">
          {/* Attachments Panel */}
          {showAttachments && (
            <div className="mb-4 bg-white/90 dark:bg-gray-700/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <Image size={24} className="text-blue-500" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">عکس</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 bg-[#5a0ecc]/10 dark:bg-[#5a0ecc]/20 hover:bg-[#5a0ecc]/20 dark:hover:bg-[#5a0ecc]/30 rounded-lg transition-colors"
                >
                                      <Paperclip size={24} className="text-[#5a0ecc]" />
                    <span className="text-xs text-[#5a0ecc] dark:text-[#5a0ecc]/80">فایل</span>
                </button>
              </div>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="mb-4 bg-white/90 dark:bg-gray-700/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4 shadow-lg">
              <div className="grid grid-cols-8 gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg p-2 transition-colors hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAttachments(!showAttachments)}
              className={`p-3 rounded-full transition-all duration-300 hover:scale-110 ${
                showAttachments 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100/70 dark:bg-gray-700/70 hover:bg-gray-200/70 dark:hover:bg-gray-600/70 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Plus size={18} className={showAttachments ? 'rotate-45' : ''} style={{ transition: 'transform 0.3s' }} />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="پیام خود را بنویسید..."
                className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-3 rounded-full transition-all duration-300 hover:scale-110 ${
                showEmojiPicker 
                  ? 'bg-yellow-500 text-white shadow-lg' 
                  : 'bg-gray-100/70 dark:bg-gray-700/70 hover:bg-gray-200/70 dark:hover:bg-gray-600/70 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Smile size={18} />
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-3 bg-gradient-to-r from-blue-500 via-[#5a0ecc] to-pink-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-all duration-300 hover:scale-110 disabled:hover:scale-100"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {showUserProfile && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">اطلاعات کاربر</h3>
                <button 
                  onClick={() => setShowUserProfile(false)}
                  className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 via-[#5a0ecc] to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                    {user.avatar}
                  </div>
                  {user.premium && (
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                      <Crown size={16} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                  {user.verified && (
                    <CheckCircle2 size={20} className="text-blue-500" />
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed whitespace-pre-line">{user.bio}</p>
                
                <div className="space-y-3 text-sm mb-6">
                  <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                    <div className="font-bold text-gray-900 dark:text-white">وضعیت</div>
                    <div className="text-gray-600 dark:text-gray-300">
                      {user.isOnline ? 'آنلاین' : user.lastSeen || 'آفلاین'}
                    </div>
                  </div>
                  <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                    <div className="font-bold text-gray-900 dark:text-white">نوع حساب</div>
                    <div className="text-gray-600 dark:text-gray-300">
                      {user.premium ? 'Premium 👑' : 'رایگان'}
                    </div>
                  </div>
                  {user.joinDate && (
                    <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                      <div className="font-bold text-gray-900 dark:text-white">{user.joinDate}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <button 
                  onClick={() => setShowUserProfile(false)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-[#5a0ecc] text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  ادامه گفتگو
                </button>
                <button className="flex-1 bg-red-500/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-bold hover:bg-red-500/20 dark:hover:bg-red-900/30 transition-all duration-300">
                  گزارش کاربر
                </button>
              </div>
              
              <button 
                onClick={() => setShowUserProfile(false)}
                className="w-full bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={(e) => handleFileUpload(e, 'file')}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'image')}
        className="hidden"
      />
    </div>
  );
};

export default Chat; 