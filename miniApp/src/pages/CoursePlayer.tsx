import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';

type Session = {
  id: string;
  title: string;
  duration: string;
  src: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  sessions: Session[];
};

const COURSES: Record<string, Course> = {
  'real-dollar-income': {
    id: 'real-dollar-income',
    title: 'دوره درآمد دلاری واقعی',
    description: 'مسیر عملی درآمد ارزی با نمونه سناریو',
    sessions: [
      { id: 's1', title: 'معرفی و نقشه راه', duration: '08:12', src: 'https://www.w3schools.com/html/mov_bbb.mp4' },
      { id: 's2', title: 'ستاپ حساب‌ها و ابزارها', duration: '12:47', src: 'https://www.w3schools.com/html/movie.mp4' },
      { id: 's3', title: 'نمونه پروژه و ارسال پیشنهاد', duration: '14:20', src: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    ]
  },
  'no-code-web-design': {
    id: 'no-code-web-design',
    title: 'دوره طراحی سایت بدون کدنویسی',
    description: 'ساخت وب‌سایت مدرن با ابزارهای No-Code',
    sessions: [
      { id: 's1', title: 'شروع سریع و اصول طراحی', duration: '09:30', src: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4' },
      { id: 's2', title: 'پیاده‌سازی صفحه فرود', duration: '11:05', src: 'https://www.w3schools.com/html/movie.mp4' },
      { id: 's3', title: 'اتصال فرم و اتوماسیون ساده', duration: '10:10', src: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    ]
  }
};

const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = courseId ? COURSES[courseId] : undefined;
  const [current, setCurrent] = React.useState<Session | null>(course ? course.sessions[0] : null);
  const [completed, setCompleted] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (course && (!current || !course.sessions.find(s => s.id === current.id))) {
      setCurrent(course.sessions[0]);
    }
  }, [courseId]);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#0e0817' }}>
        دوره یافت نشد
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="text-right flex-1 mr-4">
            <h1 className="text-xl font-bold text-white mb-1">{course.title}</h1>
            <p className="text-xs text-gray-300">{course.description}</p>
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="pt-24 max-w-md mx-auto p-4 space-y-6">
        {/* Video Player Card */}
        <div className="backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-lg overflow-hidden" style={{ backgroundColor: '#10091c' }}>
          <div className="relative">
            <video
              key={current?.id}
              controls
              playsInline
              className="w-full h-52 bg-black"
              controlsList="nodownload"
              disablePictureInPicture
              // @ts-ignore - non-standard but supported in Chromium
              disableRemotePlayback
              onContextMenu={(e) => e.preventDefault()}
            >
              <source src={current?.src} type="video/mp4" />
            </video>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20">
              {current?.title}
            </div>
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
              <Clock size={12} />
              {current?.duration}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">پیشرفت دوره</h3>
            <div className="text-sm text-gray-300">
              {Object.values(completed).filter(Boolean).length} از {course.sessions.length}
            </div>
          </div>
          <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF] transition-all duration-1000 rounded-full"
              style={{ width: `${(Object.values(completed).filter(Boolean).length / course.sessions.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-center mt-3">
            <span className="text-sm text-gray-300">
              {Math.round((Object.values(completed).filter(Boolean).length / course.sessions.length) * 100)}% تکمیل شده
            </span>
          </div>
        </div>

        {/* Sessions List */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">جلسات دوره</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF]"></div>
              <span className="text-xs text-gray-300">{course.sessions.length} جلسه</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {course.sessions.map((s, idx) => {
              const isActive = current?.id === s.id;
              const isDone = completed[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrent(s)}
                  className={`w-full p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#8A00FF]/20 to-[#C738FF]/20 border-[#8A00FF]/50 shadow-[0_0_20px_rgba(139,0,255,0.2)]' 
                      : 'bg-gray-800/40 border-gray-700/60 hover:border-gray-600/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-br from-[#8A00FF] to-[#C738FF] shadow-lg' 
                        : isDone 
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                          : 'bg-gray-700/60'
                    }`}>
                      {isDone ? (
                        <CheckCircle2 size={20} className="text-white" />
                      ) : (
                        <span className="text-white font-bold text-sm">{idx + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-right">
                      <div className={`text-base font-bold mb-1 ${isActive ? 'text-white' : 'text-gray-200'}`}>
                        {s.title}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock size={14} />
                        <span>{s.duration}</span>
                        {isActive && (
                          <span className="px-2 py-1 bg-[#8A00FF]/20 text-[#8A00FF] rounded-full text-xs font-medium">
                            در حال پخش
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <label
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompleted(prev => ({ ...prev, [s.id]: !prev[s.id] }));
                      }}
                      className={`cursor-pointer w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                        isDone
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'bg-transparent border-gray-600 hover:border-emerald-400/60'
                      }`}
                    >
                      {isDone && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </label>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;


