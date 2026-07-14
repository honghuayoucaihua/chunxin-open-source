import React from 'react';

interface VoiceBubbleProps {
  content: string;
  estimatedVoiceSec: number;
  isVoicePlaying: boolean;
  isMe: boolean;
  onPlay: () => void;
}

const VoiceWaveIcon: React.FC<{ mirrored?: boolean; animated?: boolean }> = ({ mirrored = false, animated = false }) => (
  <svg
    viewBox="0 0 18 14"
    className={`w-[17px] h-[13px] ${animated ? 'animate-pulse' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g transform={mirrored ? 'translate(18,0) scale(-1,1)' : undefined}>
      <rect x="2.2" y="5.25" width="1.9" height="3.5" rx="0.95" fill="currentColor" />
      <path d="M6.2 4.4 C8.2 5.7 8.2 8.3 6.2 9.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 2.6 C12.2 4.8 12.2 9.2 9 11.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </g>
  </svg>
);

const VoiceBubble: React.FC<VoiceBubbleProps> = ({ content, estimatedVoiceSec, isVoicePlaying, isMe, onPlay }) => {
  const clampedSec = Math.max(1, Math.min(60, Number(estimatedVoiceSec) || 1));
  const text = String(content || '').trim();

  return (
    <button
      type="button"
      className="block w-auto max-w-full bg-transparent text-inherit text-left outline-none"
      onClick={(e) => { e.stopPropagation(); onPlay(); }}
    >
      <div className={`flex items-center ${isMe ? 'justify-end' : 'justify-start'} gap-2 leading-none`}>
        {!isMe && (
          <>
            <VoiceWaveIcon animated={isVoicePlaying} />
            <span className="text-[16px] font-medium">{clampedSec}"</span>
          </>
        )}
        {isMe && (
          <>
            <span className="text-[16px] font-medium">{clampedSec}"</span>
            <VoiceWaveIcon mirrored animated={isVoicePlaying} />
          </>
        )}
      </div>

      <div className={`mt-1 text-[12px] opacity-80 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${isMe ? 'text-right' : 'text-left'}`}>
        {text || '（语音文本为空）'}
      </div>
    </button>
  );
};

export default VoiceBubble;
