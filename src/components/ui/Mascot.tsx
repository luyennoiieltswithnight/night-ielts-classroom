import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export type MascotMood = 'happy' | 'thinking' | 'encouraging' | 'neutral' | 'sad';

interface MascotProps {
  mood?: MascotMood;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Mascot = React.memo(({ mood = 'neutral', message, className, size = 'md' }: MascotProps) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const getMoodExpression = () => {
    switch (mood) {
      case 'happy':
        return (
          <g>
            {/* Happy eyes: curved lines */}
            <path d="M12 18c1-1 2-1 3 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M25 18c1-1 2-1 3 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Big smile */}
            <path d="M16 26c2 2 6 2 8 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'thinking':
        return (
          <g>
            {/* Thinking eyes: dots */}
            <circle cx="14" cy="19" r="1.5" fill="#4B2C20" />
            <circle cx="26" cy="19" r="1.5" fill="#4B2C20" />
            {/* Small straight mouth */}
            <path d="M18 26h4" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'encouraging':
        return (
          <g>
            {/* Encouraging eyes: wide open */}
            <circle cx="14" cy="19" r="2" fill="#4B2C20" />
            <circle cx="26" cy="19" r="2" fill="#4B2C20" />
            {/* Open smile */}
            <path d="M17 25c1.5 1.5 4.5 1.5 6 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'sad':
        return (
          <g>
            {/* Sad eyes: downward curves */}
            <path d="M12 19c1 1 2 1 3 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M25 19c1 1 2 1 3 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Small frown */}
            <path d="M18 28c1-1 3-1 4 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g>
            {/* Neutral eyes */}
            <circle cx="14" cy="19" r="1.5" fill="#4B2C20" />
            <circle cx="26" cy="19" r="1.5" fill="#4B2C20" />
            {/* Small smile */}
            <path d="M18 26c1 1 3 1 4 0" stroke="#4B2C20" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        );
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative px-4 py-2 bg-white border border-indigo-100 rounded-2xl shadow-sm text-sm font-medium text-indigo-600 mb-1 max-w-[180px] text-center"
        >
          {message}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-indigo-100 rotate-45" />
        </motion.div>
      )}
      
      <motion.div
        animate={mood === 'happy' ? {
          y: [0, -4, 0],
        } : {
          y: [0, -2, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={cn(sizeClasses[size], "relative")}
      >
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Antlers */}
          <path d="M10 8c-2-2-4 0-4 2s2 2 4 0M30 8c2-2 4 0 4 2s-2 2-4 0" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 10c-1-3-3-3-3-3M28 10c1-3 3-3 3-3" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Head */}
          <circle cx="20" cy="22" r="14" fill="#FDBA74" />
          
          {/* Face/Muzzle Area */}
          <ellipse cx="20" cy="26" rx="8" ry="6" fill="#FEF3C7" />
          
          {/* Ears */}
          <path d="M8 15c-3 0-4 4-2 6M32 15c3 0 4 4 2 6" fill="#FDBA74" />
          <path d="M9 16c-1.5 0-2 2-1 3M31 16c1.5 0 2 2 1 3" fill="#FECACA" />
          
          {/* Lily Flower on Head */}
          <g transform="translate(28, 10) rotate(15)">
            <circle cx="0" cy="0" r="1.5" fill="#FEF9C3" />
            <path d="M-3 -3c1-1 2-1 3 0s1 2 0 3-2 1-3 0-1-2 0-3z" fill="white" />
            <path d="M0 -4c1-1 2-1 3 0s1 2 0 3-2 1-3 0-1-2 0-3z" fill="white" transform="rotate(72)" />
            <path d="M0 -4c1-1 2-1 3 0s1 2 0 3-2 1-3 0-1-2 0-3z" fill="white" transform="rotate(144)" />
            <path d="M0 -4c1-1 2-1 3 0s1 2 0 3-2 1-3 0-1-2 0-3z" fill="white" transform="rotate(216)" />
            <path d="M0 -4c1-1 2-1 3 0s1 2 0 3-2 1-3 0-1-2 0-3z" fill="white" transform="rotate(288)" />
          </g>

          {/* Expression */}
          {getMoodExpression()}
          
          {/* Nose */}
          <circle cx="20" cy="24" r="1.5" fill="#4B2C20" />
          
          {/* Blush */}
          <circle cx="10" cy="24" r="2" fill="#FECACA" fillOpacity="0.6" />
          <circle cx="30" cy="24" r="2" fill="#FECACA" fillOpacity="0.6" />
        </svg>
      </motion.div>
    </div>
  );
});
