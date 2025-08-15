import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
  glass?: boolean;
  gradient?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = true,
  glass = false,
  gradient = false
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = glass 
    ? 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20' 
    : gradient
    ? 'bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-800/90 dark:via-gray-800/95 dark:to-gray-900/90 border border-blue-200/30 dark:border-gray-700/30'
    : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/20';

  const shadowClasses = shadow 
    ? 'shadow-lg hover:shadow-xl' 
    : '';

  return (
    <div className={`
      ${baseClasses}
      ${paddingClasses[padding]} 
      ${shadowClasses}
      rounded-2xl
      transition-all duration-500 ease-out
      hover:scale-[1.02] hover:-translate-y-1
      group
      ${className}
    `}>
      <div className="relative z-10">
        {children}
      </div>
      {(glass || gradient) && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-purple-500/5 dark:from-white/5 dark:via-transparent dark:to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
    </div>
  );
};

export default Card;