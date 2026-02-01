import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { useAbout } from '../core/hooks';

const Mobile: React.FC = () => {
  const navigate = useNavigate();
  const { loaded, refresh } = useAbout();

  return (
    <div className="min-h-screen bg-[#0e0817] text-white p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 min-w-[48px] min-h-[48px] bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors touch-manipulation"
          type="button"
          aria-label="بازگشت"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">درباره ما (موبایل)</h1>
      </div>
      <div className="bg-gray-800/80 rounded-2xl p-5 border border-gray-700/60 space-y-4">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-violet-400" />
          <h2 className="text-lg font-bold">MonetizeAI</h2>
        </div>
        <p className="text-gray-300">پلتفرم پولسازی هوشمند با دستیار AI.</p>
        <p className="text-gray-400 text-sm">loaded: {String(loaded)}</p>
        <button
          onClick={() => refresh()}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium touch-manipulation"
          type="button"
        >
          بروزرسانی
        </button>
      </div>
    </div>
  );
};

export default Mobile;
