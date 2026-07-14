import React from 'react';

type DesktopPageIndicatorProps = {
  currentPage: number;
  totalPages: number;
  isEditMode: boolean;
  accentColor: string;
  isDark: boolean;
  onPageChange?: (pageIndex: number) => void;
};

export const DesktopPageIndicator: React.FC<DesktopPageIndicatorProps> = ({
  currentPage,
  totalPages,
  isEditMode,
  accentColor,
  isDark,
  onPageChange,
}) => {
  if (totalPages <= 1 && !isEditMode && currentPage === 0) return null;

  return (
    <div className="relative z-10 shrink-0 flex justify-center items-center gap-2 py-2">
      {Array.from({ length: totalPages }).map((_, idx) => (
        <div key={idx} className="relative flex items-center">
          <button
            className={`w-5 h-5 flex items-center justify-center rounded-full transition-all`}
            onClick={() => onPageChange?.(idx)}
            aria-label={`切换到第${idx + 1}页`}
          >
            <span
              className={`rounded-full transition-all ${idx === currentPage ? 'w-2.5 h-2.5' : 'w-2 h-2 opacity-50'}`}
              style={{
                backgroundColor: idx === currentPage
                  ? accentColor
                  : isDark
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(0,0,0,0.4)',
              }}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default DesktopPageIndicator;
