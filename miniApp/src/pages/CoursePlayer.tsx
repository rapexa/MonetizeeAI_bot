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
      { id: 's1', title: 'شروع سریع و اصول طراحی', duration: '09:30', src: 'https://www.w3schools.com/html/mov_bbb.mp4' },
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
      <div className="bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center p-4 max-w-md mx-auto">
          <div className="flex-1 text-right">
            <h1 className="text-base font-extrabold text-white tracking-tight">{course.title}</h1>
          </div>
          <button onClick={() => navigate(-1)} className="ml-2 p-2 rounded-xl hover:bg-white/10">
            <ArrowLeft size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="pt-4 max-w-md mx-auto p-4 space-y-4">
        {/* Video Player Card */}
        <div className="backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-lg overflow-hidden" style={{ backgroundColor: '#10091c' }}>
          <div className="relative">
            <video
              key={current?.id}
              controls
              playsInline
              className="w-full h-48 bg-black"
              controlsList="nodownload"
              disablePictureInPicture
              // @ts-ignore - non-standard but supported in Chromium
              disableRemotePlayback
              onContextMenu={(e) => e.preventDefault()}
            >
              <source src={current?.src} type="video/mp4" />
            </video>
            <div className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full border border-white/20">
              {current?.title}
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-white text-sm font-bold truncate">{current?.title}</div>
              <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={12} />{current?.duration}</span>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-lg p-4 space-y-2" style={{ backgroundColor: '#10091c' }}>
          <div className="text-white text-sm font-bold mb-2">جلسات دوره</div>
          {course.sessions.map((s, idx) => {
            const isActive = current?.id === s.id;
            const isDone = completed[s.id];
            return (
              <button
                key={s.id}
                onClick={() => setCurrent(s)}
                className={`w-full text-right px-3 py-3 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                  isActive ? 'bg-white/10 border-white/20' : 'bg-gray-800/40 border-gray-700/60 hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-[#2c189a] to-[#5a189a]' : 'bg-gray-700/60'}`}>
                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>{s.title}</div>
                    <div className="text-[10px] text-gray-400">{s.duration}</div>
                  </div>
                </div>
                <label
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompleted(prev => ({ ...prev, [s.id]: !prev[s.id] }));
                  }}
                  className={`cursor-pointer w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                    isDone
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400 ring-1 ring-emerald-300/60 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'bg-transparent border-gray-600 hover:border-emerald-400/60'
                  }`}
                >
                  {isDone && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </label>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;


