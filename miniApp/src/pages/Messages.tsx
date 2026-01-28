import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle2 } from 'lucide-react';

interface Member {
  id: number;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
  verified?: boolean;
  premium?: boolean;
}

interface Conversation {
  id: number;
  member: Member;
  lastMessage: string;
  time: string;
  unread: number;
  type: 'direct' | 'group';
}

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize conversations
  useEffect(() => {
    const initialConversations: Conversation[] = [
      {
        id: 1,
        member: {
          id: 1,
          name: 'علی محمدی',
          avatar: 'AM',
          isOnline: true,
          verified: true,
          premium: true
        },
        lastMessage: 'سلام! پروژه رو چطور پیش می‌بری؟',
        time: '۱۰:۳۰',
        unread: 2,
        type: 'direct'
      },
      {
        id: 2,
        member: {
          id: 2,
          name: 'سارا احمدی',
          avatar: 'SA',
          isOnline: false,
          lastSeen: '۳۰ دقیقه پیش',
          verified: true
        },
        lastMessage: 'ممنون از راهنمایی‌هات',
        time: '۰۹:۱۵',
        unread: 0,
        type: 'direct'
      },
      {
        id: 3,
        member: {
          id: 3,
          name: 'محمد رضایی',
          avatar: 'MR',
          isOnline: true,
          verified: false
        },
        lastMessage: 'عکس پروژه رو فرستادم',
        time: 'دیروز',
        unread: 1,
        type: 'direct'
      },
      {
        id: 4,
        member: {
          id: 4,
          name: 'مریم کریمی',
          avatar: 'MK',
          isOnline: false,
          lastSeen: '۲ ساعت پیش',
          verified: true,
          premium: true
        },
        lastMessage: 'فردا جلسه داریم؟',
        time: 'دیروز',
        unread: 0,
        type: 'direct'
      },
      {
        id: 5,
        member: {
          id: 5,
          name: 'حسین نوری',
          avatar: 'HN',
          isOnline: true,
          verified: false
        },
        lastMessage: '👍',
        time: '۲ روز پیش',
        unread: 0,
        type: 'direct'
      }
    ];

    setConversations(initialConversations);
  }, []);

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/chat/${conversation.member.id}`);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="p-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">پیام‌ها</h1>
            <div className="relative">
              <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="جستجو در مکالمات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5a0ecc]/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-lg"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation)}
                className="flex items-center gap-4 p-3 bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/70 rounded-xl cursor-pointer transition-all duration-300 border border-white/20 dark:border-gray-700/20 backdrop-blur-xl shadow-lg hover:scale-[1.02] hover:shadow-xl group"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5a0ecc] via-pink-600 to-blue-700 dark:from-[#5a0ecc] dark:via-pink-500 dark:to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg overflow-hidden ring-2 ring-white/20 dark:ring-gray-600/20 group-hover:ring-[#5a0ecc]/60 transition-all duration-300">
                    {conversation.member.avatar}
                  </div>
                  {conversation.member.premium && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">👑</span>
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-700 ${conversation.member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#5a0ecc] dark:group-hover:text-[#5a0ecc]/70 transition-colors">
                        {conversation.member.name}
                      </h3>
                      {conversation.member.verified && (
                        <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{conversation.time}</span>
                      {conversation.unread > 0 && (
                        <span className="bg-gradient-to-r from-[#5a0ecc] to-pink-700 dark:from-[#5a0ecc] dark:to-pink-600 text-white text-xs rounded-full px-2 py-0.5 shadow-lg animate-pulse">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                    {conversation.member.isOnline ? 'آنلاین' : conversation.member.lastSeen || 'آفلاین'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredConversations.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">هیچ مکالمه‌ای یافت نشد</h3>
              <p className="text-gray-600 dark:text-gray-300">کلمه کلیدی دیگری امتحان کنید</p>
            </div>
          )}
        </div>
      </div>
    );
  };

export default Messages;