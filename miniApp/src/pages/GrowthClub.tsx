import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { 
  ArrowRight, 
  Plus, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Image, 
  Video, 
  FileText, 
  BarChart3, 
  Users, 
  Search, 
  Filter, 
  Crown, 
  CheckCircle, 
  Send, 
  Smile, 
  Camera, 
  Mic, 
  MapPin, 
  Link, 
  Hash, 
  AtSign, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  Star, 
  Zap, 
  Target, 
  Briefcase, 
  Code, 
  Palette, 
  PenTool, 
  Headphones, 
  Globe, 
  Smartphone, 
  Monitor, 
  Database, 
  Settings, 
  Bell, 
  Mail, 
  Phone, 
  MessageSquare, 
  UserPlus, 
  X, 
  ChevronDown, 
  Eye, 
  ThumbsUp, 
  Repeat2, 
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Edit3,
  Trash2,
  Flag,
  AlertCircle,
  Info,
  Tag
} from 'lucide-react';

interface Post {
  id: number;
  author: {
    id: number;
    name: string;
    avatar: string;
    isPremium: boolean;
    isVerified: boolean;
    title?: string;
  };
  content: string;
  type: 'text' | 'image' | 'video' | 'poll' | 'project';
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  poll?: {
    question: string;
    options: { id: number; text: string; votes: number }[];
    totalVotes: number;
    userVoted?: number;
  };
  project?: {
    title: string;
    budget: string;
    deadline: string;
    skills: string[];
  };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isShared: boolean;
}

interface Member {
  id: number;
  name: string;
  avatar: string;
  isPremium: boolean;
  isVerified: boolean;
  title: string;
  tags: string[];
  joinDate: string;
  lastSeen: string;
  isOnline: boolean;
}

interface Project {
  id: number;
  type: 'service_request' | 'project_offer';
  title: string;
  description: string;
  budget: string;
  duration: string;
  applicants: number;
  publisher: {
    name: string;
    avatar: string;
    isPremium: boolean;
  };
  skills: string[];
  deadline: string;
  category: string;
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
}

const GrowthClub: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'projects' | 'messages'>('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'text' | 'poll' | 'project'>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPostAuthor, setSelectedPostAuthor] = useState<Member | null>(null);

  // Sample data
  const posts: Post[] = [
    {
      id: 1,
      author: {
        id: 1,
        name: 'علی محمدی',
        avatar: 'AM',
        isPremium: true,
        isVerified: true,
        title: 'توسعه‌دهنده فول‌استک'
      },
      content: 'امروز پروژه جدیدی رو شروع کردم که قراره تو حوزه هوش مصنوعی باشه. کسی تجربه کار با TensorFlow داره؟ نیاز به مشاوره دارم 🚀',
      type: 'text',
      timestamp: '۲ ساعت پیش',
      likes: 24,
      comments: 8,
      shares: 3,
      bookmarks: 12,
      isLiked: false,
      isBookmarked: true,
      isShared: false
    },
    {
      id: 2,
      author: {
        id: 2,
        name: 'سارا احمدی',
        avatar: 'SA',
        isPremium: false,
        isVerified: true,
        title: 'طراح UI/UX'
      },
      content: 'نظرسنجی: بهترین ابزار برای پروتوتایپ سازی چیه؟',
      type: 'poll',
      poll: {
        question: 'بهترین ابزار برای پروتوتایپ سازی چیه؟',
        options: [
          { id: 1, text: 'Figma', votes: 45 },
          { id: 2, text: 'Adobe XD', votes: 23 },
          { id: 3, text: 'Sketch', votes: 18 },
          { id: 4, text: 'Framer', votes: 12 }
        ],
        totalVotes: 98,
        userVoted: 1
      },
      timestamp: '۴ ساعت پیش',
      likes: 18,
      comments: 12,
      shares: 5,
      bookmarks: 8,
      isLiked: true,
      isBookmarked: false,
      isShared: false
    },
    {
      id: 3,
      author: {
        id: 3,
        name: 'محمد رضایی',
        avatar: 'MR',
        isPremium: true,
        isVerified: false,
        title: 'مارکتر دیجیتال'
      },
      content: 'پروژه جدید: نیاز به یک برنامه‌نویس React داریم',
      type: 'project',
      project: {
        title: 'توسعه پنل ادمین React',
        budget: '۱۵-۲۵ میلیون تومان',
        deadline: '۳ هفته',
        skills: ['React', 'TypeScript', 'Tailwind CSS']
      },
      timestamp: '۶ ساعت پیش',
      likes: 32,
      comments: 15,
      shares: 8,
      bookmarks: 20,
      isLiked: false,
      isBookmarked: true,
      isShared: true
    }
  ];

  const members: Member[] = [
    {
      id: 1,
      name: 'علی محمدی',
      avatar: 'AM',
      isPremium: true,
      isVerified: true,
      title: 'توسعه‌دهنده فول‌استک',
      tags: ['React', 'Node.js', 'Python', 'AI'],
      joinDate: '۱۴۰۲/۰۸/۱۵',
      lastSeen: 'آنلاین',
      isOnline: true
    },
    {
      id: 2,
      name: 'سارا احمدی',
      avatar: 'SA',
      isPremium: false,
      isVerified: true,
      title: 'طراح UI/UX',
      tags: ['Figma', 'Adobe XD', 'Design System'],
      joinDate: '۱۴۰۲/۰۷/۲۳',
      lastSeen: '۱۰ دقیقه پیش',
      isOnline: false
    },
    {
      id: 3,
      name: 'محمد رضایی',
      avatar: 'MR',
      isPremium: true,
      isVerified: false,
      title: 'مارکتر دیجیتال',
      tags: ['SEO', 'Google Ads', 'Analytics'],
      joinDate: '۱۴۰۲/۰۶/۱۰',
      lastSeen: '۲ ساعت پیش',
      isOnline: false
    },
    {
      id: 4,
      name: 'فاطمه کریمی',
      avatar: 'FK',
      isPremium: false,
      isVerified: false,
      title: 'کپی‌رایتر',
      tags: ['Content Writing', 'SEO Writing', 'Social Media'],
      joinDate: '۱۴۰۲/۰۹/۰۵',
      lastSeen: 'آنلاین',
      isOnline: true
    }
  ];

  const projects: Project[] = [
    {
      id: 1,
      type: 'service_request',
      title: 'طراحی لوگو و هویت بصری',
      description: 'نیاز به طراحی لوگو و هویت بصری کامل برای استارتاپ فناوری داریم',
      budget: '۵-۱۰ میلیون تومان',
      duration: '۲ هفته',
      applicants: 12,
      publisher: {
        name: 'شرکت تکنو',
        avatar: 'ST',
        isPremium: true
      },
      skills: ['Graphic Design', 'Brand Identity', 'Adobe Illustrator'],
      deadline: '۱۴۰۲/۱۰/۲۰',
      category: 'طراحی',
      status: 'open',
      createdAt: '۱ روز پیش'
    },
    {
      id: 2,
      type: 'project_offer',
      title: 'توسعه اپلیکیشن موبایل',
      description: 'پروژه توسعه اپلیکیشن موبایل برای سفارش غذا با React Native',
      budget: '۳۰-۵۰ میلیون تومان',
      duration: '۳ ماه',
      applicants: 8,
      publisher: {
        name: 'علی محمدی',
        avatar: 'AM',
        isPremium: true
      },
      skills: ['React Native', 'Node.js', 'MongoDB'],
      deadline: '۱۴۰۲/۱۱/۱۵',
      category: 'برنامه‌نویسی',
      status: 'open',
      createdAt: '۳ روز پیش'
    },
    {
      id: 3,
      type: 'service_request',
      title: 'تولید محتوای شبکه‌های اجتماعی',
      description: 'نیاز به تولید محتوای منظم برای اینستاگرام و لینکدین',
      budget: '۸-۱۵ میلیون تومان',
      duration: '۱ ماه',
      applicants: 15,
      publisher: {
        name: 'آژانس دیجیتال',
        avatar: 'AD',
        isPremium: false
      },
      skills: ['Content Creation', 'Social Media', 'Copywriting'],
      deadline: '۱۴۰۲/۱۰/۳۰',
      category: 'محتوا',
      status: 'open',
      createdAt: '۵ روز پیش'
    }
  ];

  const handleCreatePost = () => {
    if (newPostContent.trim()) {
      // Add new post logic here
      setNewPostContent('');
      setShowCreatePost(false);
    }
  };

  const handleLike = (postId: number) => {
    // Handle like logic
  };

  const handleBookmark = (postId: number) => {
    // Handle bookmark logic
  };

  const handleShare = (postId: number) => {
    // Handle share logic
  };

  const handleVote = (postId: number, optionId: number) => {
    // Handle poll vote logic
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const handleMessageMember = (memberId: number) => {
    navigate('/messages', { state: { selectedMember: members.find(m => m.id === memberId) } });
  };

  const handlePostAuthorClick = (authorId: number) => {
    const member = members.find(m => m.id === authorId);
    if (member) {
      setSelectedPostAuthor(member);
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredProjects = projects.filter(project => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'requests') return project.type === 'service_request';
    if (selectedFilter === 'offers') return project.type === 'project_offer';
    return true;
  }).filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderFeed = () => (
    <div className="space-y-4">
      {/* Create Post Button */}
      <button
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-24 left-4 w-14 h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-40 border-2 border-white/20"
      >
        <Plus size={24} />
      </button>

      {/* Posts */}
      {posts.map((post) => (
        <Card key={post.id}>
          {/* Post Header */}
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="relative cursor-pointer group"
              onClick={() => handlePostAuthorClick(post.author.id)}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                {post.author.avatar}
              </div>
              {post.author.isPremium && (
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Crown size={12} className="text-white" />
                </div>
              )}
            </div>
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => handlePostAuthorClick(post.author.id)}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white">{post.author.name}</h3>
                {post.author.isVerified && (
                  <CheckCircle size={16} className="text-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{post.author.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{post.timestamp}</p>
            </div>
            <button className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300">
              <MoreHorizontal size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Post Content */}
          <div className="mb-4">
            <p className="text-gray-900 dark:text-white leading-relaxed mb-3">{post.content}</p>

            {/* Poll */}
            {post.type === 'poll' && post.poll && (
              <div className="bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-4 backdrop-blur-sm">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{post.poll.question}</h4>
                <div className="space-y-2">
                  {post.poll.options.map((option) => {
                    const percentage = Math.round((option.votes / post.poll!.totalVotes) * 100);
                    const isVoted = post.poll!.userVoted === option.id;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleVote(post.id, option.id)}
                        className={`w-full text-right p-3 rounded-lg transition-all duration-300 relative overflow-hidden ${
                          isVoted 
                            ? 'bg-blue-100/70 dark:bg-blue-900/30 border border-blue-300/50' 
                            : 'bg-white/70 dark:bg-gray-600/70 hover:bg-gray-100/70 dark:hover:bg-gray-600/70 border border-gray-200/50 dark:border-gray-500/50'
                        }`}
                      >
                        <div 
                          className={`absolute inset-0 ${isVoted ? 'bg-blue-200/30' : 'bg-gray-200/30'} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="text-sm font-medium">{option.text}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{percentage}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{post.poll.totalVotes} رای</p>
              </div>
            )}

            {/* Project */}
            {post.type === 'project' && post.project && (
              <div className="bg-gradient-to-r from-purple-50/70 to-blue-50/70 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-sm">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{post.project.title}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">بودجه:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400 mr-1">{post.project.budget}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">مهلت:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 mr-1">{post.project.deadline}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.project.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-100/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Post Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200/20 dark:border-gray-700/20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  post.isLiked 
                    ? 'bg-red-100/70 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                    : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/70 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Heart size={18} className={post.isLiked ? 'fill-current' : ''} />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100/70 dark:hover:bg-gray-700/70 text-gray-600 dark:text-gray-400 transition-all duration-300">
                <MessageCircle size={18} />
                <span className="text-sm font-medium">{post.comments}</span>
              </button>
              
              <button
                onClick={() => handleShare(post.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  post.isShared 
                    ? 'bg-green-100/70 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/70 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Share2 size={18} />
                <span className="text-sm font-medium">{post.shares}</span>
              </button>
            </div>
            
            <button
              onClick={() => handleBookmark(post.id)}
              className={`p-2 rounded-lg transition-all duration-300 ${
                post.isBookmarked 
                  ? 'bg-yellow-100/70 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
                  : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/70 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Bookmark size={18} className={post.isBookmarked ? 'fill-current' : ''} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderMembers = () => (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="جستجو در اعضا..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 shadow-lg"
        />
      </div>

      {/* Members List */}
      {filteredMembers.map((member) => (
        <div
          key={member.id} 
          className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] rounded-xl p-3"
          onClick={() => handleMemberClick(member)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                {member.avatar}
              </div>
              {member.isPremium && (
                <div className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Crown size={10} className="text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">{member.name}</h3>
                {member.isVerified && (
                  <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{member.title}</p>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMessageMember(member.id);
              }}
              className="p-2 bg-gradient-to-r from-blue-500 to-[#5a0ecc] text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 flex-shrink-0"
            >
              <MessageSquare size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو در پروژه‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 shadow-lg"
          />
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 shadow-lg"
        >
          <option value="all">همه</option>
          <option value="requests">درخواست خدمات</option>
          <option value="offers">پیشنهاد پروژه</option>
        </select>
      </div>

      {/* Projects */}
      {filteredProjects.map((project) => (
        <div
          key={project.id} 
          className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] rounded-2xl p-6"
          onClick={() => handleProjectClick(project)}
        >
          {/* Project Type Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              project.type === 'service_request' 
                ? 'bg-blue-100/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'bg-green-100/70 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            }`}>
              {project.type === 'service_request' ? 'درخواست خدمات' : 'پیشنهاد پروژه'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{project.createdAt}</span>
          </div>
          
          {/* Project Title */}
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-xl leading-tight">{project.title}</h3>
          
          {/* Brief Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed line-clamp-2">{project.description}</p>
          
          {/* Large Pricing Display */}
          <div className="text-center mb-4 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {project.budget}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">بودجه پروژه</div>
          </div>
          
          {/* Essential Info Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-2">
              <Clock size={16} className="text-gray-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-900 dark:text-white">{project.duration}</div>
            </div>
            <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-2">
              <Users size={16} className="text-gray-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-900 dark:text-white">{project.applicants} متقاضی</div>
            </div>
            <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-2">
              <Calendar size={16} className="text-gray-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-900 dark:text-white">{project.deadline}</div>
            </div>
          </div>
          
          {/* Publisher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {project.publisher.avatar}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">توسط {project.publisher.name}</span>
              {project.publisher.isPremium && (
                <Crown size={12} className="text-yellow-500" />
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Create Project Button */}
      <button
        onClick={() => setShowCreateProject(true)}
        className="fixed bottom-24 left-4 w-14 h-14 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-40 border-2 border-white/20"
      >
        <Plus size={24} />
      </button>
    </div>
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
      {/* Header */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-3xl border-b border-white/20 dark:border-gray-700/20 px-4 py-4 sticky top-0 z-10 transition-colors duration-300 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">سوشال رشد</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">شبکه حرفه‌ای کسب‌وکار</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-green-100/70 dark:bg-green-900/30 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Users size={16} className="text-green-500" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400 transition-colors duration-300">{members.length}</span>
            </div>
            <button className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm">
              <Bell size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 bg-gray-100/60 dark:bg-gray-700/60 p-1 rounded-xl backdrop-blur-sm">
          {[
            { id: 'feed', label: 'فید', icon: BarChart3 },
            { id: 'members', label: 'اعضا', icon: Users },
            { id: 'projects', label: 'پروژه‌ها', icon: Briefcase }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-600 text-purple-700 dark:text-purple-300 shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'projects' && renderProjects()}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-end justify-center p-6 z-50">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-t-2xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">ایجاد پست جدید</h3>
                <button 
                  onClick={() => setShowCreatePost(false)}
                  className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Post Type Selector */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'text', label: 'متن', icon: FileText },
                  { id: 'poll', label: 'نظرسنجی', icon: BarChart3 },
                  { id: 'project', label: 'پروژه', icon: Briefcase }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setNewPostType(type.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      newPostType === type.id
                        ? 'bg-purple-100/70 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        : 'bg-gray-100/70 dark:bg-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-purple-50/70 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    <type.icon size={16} />
                    {type.label}
                  </button>
                ))}
              </div>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="چه چیز جدیدی می‌خواهید به اشتراک بگذارید؟"
                className="w-full h-32 p-4 bg-gray-50/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 resize-none backdrop-blur-sm"
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300">
                    <Image size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300">
                    <Video size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300">
                    <MapPin size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim()}
                  className={`px-6 py-2 rounded-xl font-bold transition-all duration-300 ${
                    newPostContent.trim()
                      ? 'bg-gradient-to-r from-[#5a0ecc] to-blue-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  انتشار
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">جزئیات عضو</h3>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                    {selectedMember.avatar}
                  </div>
                  {selectedMember.isPremium && (
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                      <Crown size={16} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedMember.name}</h2>
                  {selectedMember.isVerified && (
                    <CheckCircle size={20} className="text-blue-500" />
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedMember.title}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                    <div className="font-bold text-gray-900 dark:text-white">عضویت</div>
                    <div className="text-gray-600 dark:text-gray-300">{selectedMember.joinDate}</div>
                  </div>
                  <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                    <div className="font-bold text-gray-900 dark:text-white">آخرین بازدید</div>
                    <div className="text-gray-600 dark:text-gray-300">{selectedMember.lastSeen}</div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">مهارت‌ها و علاقه‌مندی‌ها</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMember.tags.map((tag, index) => (
                    <span key={index} className="bg-purple-100/70 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleMessageMember(selectedMember.id);
                    setSelectedMember(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  ارسال پیام
                </button>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">جزئیات پروژه</h3>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    selectedProject.type === 'service_request' 
                      ? 'bg-blue-100/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'bg-green-100/70 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  }`}>
                    {selectedProject.type === 'service_request' ? 'درخواست خدمات' : 'پیشنهاد پروژه'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{selectedProject.createdAt}</span>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{selectedProject.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{selectedProject.description}</p>
                
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {selectedProject.budget}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">بودجه پروژه</div>
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                  <Clock size={20} className="text-gray-500 mx-auto mb-1" />
                  <div className="font-bold text-gray-900 dark:text-white">{selectedProject.duration}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">مدت زمان</div>
                </div>
                <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                  <Users size={20} className="text-gray-500 mx-auto mb-1" />
                  <div className="font-bold text-gray-900 dark:text-white">{selectedProject.applicants}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">متقاضی</div>
                </div>
                <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                  <Calendar size={20} className="text-gray-500 mx-auto mb-1" />
                  <div className="font-bold text-gray-900 dark:text-white">{selectedProject.deadline}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">مهلت</div>
                </div>
                <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                  <Tag size={20} className="text-gray-500 mx-auto mb-1" />
                  <div className="font-bold text-gray-900 dark:text-white">{selectedProject.category}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">دسته‌بندی</div>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">مهارت‌های مورد نیاز</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.skills.map((skill, index) => (
                    <span key={index} className="bg-purple-100/70 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Publisher */}
              <div className="mb-6 p-4 bg-gray-50/70 dark:bg-gray-700/70 rounded-xl backdrop-blur-sm">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">منتشر کننده</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedProject.publisher.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{selectedProject.publisher.name}</span>
                      {selectedProject.publisher.isPremium && (
                        <Crown size={14} className="text-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300">
                  درخواست همکاری
                </button>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Author Profile Modal */}
      {selectedPostAuthor && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">پروفایل کاربر</h3>
                <button 
                  onClick={() => setSelectedPostAuthor(null)}
                  className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                    {selectedPostAuthor.avatar}
                  </div>
                  {selectedPostAuthor.isPremium && (
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                      <Crown size={16} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPostAuthor.name}</h2>
                  {selectedPostAuthor.isVerified && (
                    <CheckCircle size={20} className="text-blue-500" />
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedPostAuthor.title}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                    <div className="font-bold text-gray-900 dark:text-white">عضویت</div>
                    <div className="text-gray-600 dark:text-gray-300">{selectedPostAuthor.joinDate}</div>
                  </div>
                  <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm">
                    <div className="font-bold text-gray-900 dark:text-white">آخرین بازدید</div>
                    <div className="text-gray-600 dark:text-gray-300">{selectedPostAuthor.lastSeen}</div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">مهارت‌ها و علاقه‌مندی‌ها</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPostAuthor.tags.map((tag, index) => (
                    <span key={index} className="bg-purple-100/70 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleMessageMember(selectedPostAuthor.id);
                    setSelectedPostAuthor(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  ارسال پیام
                </button>
                <button 
                  onClick={() => setSelectedPostAuthor(null)}
                  className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthClub;