import React from 'react';
import { X } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuide: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, onStartGuide }) => {
  console.log('GuideModal render - isOpen:', isOpen);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a0f2e] rounded-2xl shadow-2xl max-w-sm w-full border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all"
        >
          <X size={18} className="text-white/70" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          
          {/* Emoji Icon */}
          <div className="text-5xl mb-4">
            🤖
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-3">
            هنوز همه قابلیت‌ها رو کشف نکردی؟
          </h2>

          {/* Subtitle */}
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            فقط تو چند دقیقه یاد بگیر چطور با MonetizeAI بیزینس خودتو بسازی.
          </p>

          {/* CTA Button */}
          <button
            onClick={onStartGuide}
            className="w-full px-5 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white text-base font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/10"
          >
            شروع راهنما
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
