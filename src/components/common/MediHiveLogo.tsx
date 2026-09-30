import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  textColor?: string;
  variant?: 'badge' | 'image-only';
}

export const MediHiveLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  showSubtitle = true,
  textColor = 'text-white',
  variant = 'badge',
}) => {
  const sizeMap = {
    sm: { 
      badge: 'w-8 h-8 p-0.5', 
      text: 'text-base font-extrabold', 
      sub: 'text-[8px]' 
    },
    md: { 
      badge: 'w-10 h-10 p-1', 
      text: 'text-lg font-extrabold', 
      sub: 'text-[9px]' 
    },
    lg: { 
      badge: 'w-12 h-12 p-1', 
      text: 'text-2xl font-extrabold', 
      sub: 'text-[11px]' 
    },
    xl: { 
      badge: 'w-16 h-16 p-1.5', 
      text: 'text-3xl font-extrabold', 
      sub: 'text-xs' 
    },
  };

  const currentSize = sizeMap[size];

  if (variant === 'image-only') {
    return (
      <img
        src="/medihive-logo.png"
        alt="MediHive Logo"
        className={`object-contain select-none ${currentSize.badge} ${className}`}
      />
    );
  }

  const isDarkText = textColor.includes('slate-') || textColor.includes('text-[#') || textColor.includes('black');

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon Badge with High Contrast White Backing */}
      <div className={`relative flex items-center justify-center shrink-0 bg-white rounded-xl shadow-xs border border-white/30 overflow-hidden ${currentSize.badge}`}>
        <img
          src="/medihive-logo.png"
          alt="MediHive Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`tracking-tight ${currentSize.text} ${textColor}`}>
            Medi<span className="text-sky-400">Hive</span>
          </span>
          {showSubtitle && (
            <span className={`uppercase tracking-wider font-semibold ${currentSize.sub} ${
              isDarkText ? 'text-slate-500' : 'text-sky-200/80'
            }`}>
              Clinic's Digital Ecosystem
            </span>
          )}
        </div>
      )}
    </div>
  );
};
