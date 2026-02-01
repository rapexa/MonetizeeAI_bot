import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { useAbout } from '../core/hooks';

const Desktop: React.FC = () => {
  const navigate = useNavigate();
  const { loaded, refresh } = useAbout();

  return (
    <div className="min-h-screen bg-[#0e0817] text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">درباره ما (دسکتاپ)</h1>
      </div>
      <div className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/60 space-y-4">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-violet-400" />
          <h2 className="text-xl font-bold">MonetizeAI</h2>
        </div>
        <p className="text-gray-300">پلتفرم پولسازی هوشمند با دستیار AI.</p>
        <p className="text-gray-400 text-sm">loaded: {String(loaded)}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm"
          type="button"
        >
          بروزرسانی
        </button>
      </div>
    </div>
  );
};

export default Desktop;
