import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface StageCardProps {
  id: string;
  title: string;
  subtitle?: string;
  gradient: string; // tailwind gradient classes without "bg-gradient-to-r" prefix
  icon: React.ReactNode;
  completed: boolean;
  onToggle: (id: string) => void;
  children?: React.ReactNode;
}

/**
 * Generic wrapper for each step card (Video, Files, Build, Quiz).
 * Handles:
 *  • Gradient header with icon
 *  • "tick" button on the right side of header
 *  • Subtle outline that turns green when completed
 *  • Body content via children
 */
const StageCard: React.FC<StageCardProps> = ({
  id,
  title,
  subtitle,
  gradient,
  icon,
  completed,
  onToggle,
  children,
}) => {
  return (
    <div className="relative my-4">
      {/* Outline */}
      <div
        className={`absolute -inset-2 rounded-3xl border-2 transition-all duration-500 pointer-events-none ${
          completed
            ? 'border-green-400 shadow-lg shadow-green-400/25 opacity-100'
            : 'border-gray-300 dark:border-gray-600 opacity-30'
        }`}
      />

      {/* Main Card */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradient} p-6`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white">{title}</h3>
              {subtitle && (
                <p className="text-sm text-white/80 mt-1 line-clamp-2">{subtitle}</p>
              )}
            </div>
            {/* Tick Button */}
            <button
              onClick={() => onToggle(id)}
              title={completed ? 'علامت‌گذاری نشده' : 'علامت‌گذاری تکمیل'}
              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                completed
                  ? 'bg-green-500 border-green-400 text-white shadow-lg hover:bg-green-600'
                  : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
              }`}
            >
              {completed && <CheckCircle2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default StageCard;
