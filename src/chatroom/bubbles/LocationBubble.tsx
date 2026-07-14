import React from 'react';

interface LocationBubbleProps {
  locationName?: string;
  locationAddress: string;
}

const LocationBubble: React.FC<LocationBubbleProps> = ({ locationName, locationAddress }) => {
  return (
    <div className="flex flex-col w-[236px] bg-white dark:bg-[#141E2A] overflow-hidden shadow-md border border-[#D8E4F2] dark:border-[#27415F] cursor-pointer active:brightness-95" style={{ borderRadius: 'var(--app-card-radius)' }}>
      <div className="p-3 pb-2">
        <div className="text-[15px] font-bold text-[#1A2A3A] dark:text-[#EAF4FF] truncate mb-1">{locationName || '位置信息'}</div>
        {locationAddress ? (
          <div className="text-[12px] text-[#4E6A86] dark:text-[#A7C3DF] truncate">{locationAddress}</div>
        ) : (
          <div className="text-[12px] text-[#4E6A86] dark:text-[#A7C3DF] truncate">点击查看地图位置</div>
        )}
      </div>
      <div className="h-24 relative overflow-hidden bg-gradient-to-br from-[#DDF7E9] via-[#E6F5FF] to-[#DCEAFF] dark:from-[#183326] dark:via-[#173248] dark:to-[#1C2F4C]">
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(35deg, transparent 0 42%, rgba(255,255,255,0.7) 42% 46%, transparent 46% 100%), linear-gradient(-20deg, transparent 0 58%, rgba(255,255,255,0.6) 58% 62%, transparent 62% 100%)' }}></div>
        <div className="absolute left-4 top-5 w-10 h-10 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent-color) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--app-accent-color) 30%, transparent)' }}>
          <i className="fa-solid fa-location-dot text-lg" style={{ color: 'var(--app-accent-color)' }}></i>
        </div>
      </div>
    </div>
  );
};

export default LocationBubble;
