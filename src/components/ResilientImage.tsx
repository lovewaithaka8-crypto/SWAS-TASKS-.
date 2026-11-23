import { useState } from 'react';
import { Briefcase } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'SWAS TASKS',
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#eaf3ff] to-[#dce8f8] text-[#102d55] border border-[#e4eaf1] p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Briefcase className="w-8 h-8 text-[#1769d2] mb-2" strokeWidth={1.75} />
        <span className="text-xs font-semibold tracking-tight text-[#102d55]">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
