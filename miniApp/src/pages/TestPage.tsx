import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TestPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('🧪 TestPage component is rendering');

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">صفحه تست</h1>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">✅ صفحه تست کار می‌کند!</h2>
          <p className="text-gray-300">
            اگر این صفحه را می‌بینید، یعنی routing کار می‌کند.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
