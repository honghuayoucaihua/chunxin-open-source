import React from 'react';

export const WeChatBadge: React.FC<{ count?: number, dot?: boolean }> = ({ count, dot }) => {
  if (dot) return <div className="wechat-badge wechat-badge-dot w-2.5 h-2.5 bg-danger rounded-full border border-white dark:border-black"></div>;
  if (!count || count <= 0) return null;
  return (
    <div className="wechat-badge min-w-[18px] h-[18px] bg-danger rounded-full flex items-center justify-center px-1 text-white text-[10px] font-bold border border-white dark:border-black">
      {count > 99 ? '99+' : count}
    </div>
  );
};

export const WeChatCell: React.FC<{ 
  icon?: string, 
  color?: string, 
  image?: string,
  label: string, 
  onClick?: () => void,
  rightContent?: React.ReactNode,
  showArrow?: boolean,
  noBorder?: boolean,
  subtitle?: string,
  labelClassName?: string
}> = ({ icon, color, image, label, onClick, rightContent, showArrow = true, noBorder = false, subtitle, labelClassName = "" }) => (
  <div
    className={`wechat-cell flex items-center px-4 render-bg-secondary cursor-pointer transition-colors ${!noBorder ? 'border-b render-border-subtle' : ''}`}
    style={{
      minHeight: 'var(--render-list-item-min-height, 56px)',
      paddingTop: 'var(--render-list-item-padding-y, var(--app-cell-padding-y))',
      paddingBottom: 'var(--render-list-item-padding-y, var(--app-cell-padding-y))'
    }}
    onClick={onClick}
  >
    {image ? (
      <img src={image} className="wechat-cell-avatar w-10 h-10 mr-3 object-cover render-bg-tertiary" style={{ borderRadius: 'var(--app-card-radius)' }} />
    ) : icon ? (
      <div className={`wechat-cell-icon wechat-cell-icon-${icon} w-9 h-9 rounded flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`} style={{ backgroundColor: color }}>
        <i className={`fa-solid ${icon} text-white text-[18px]`}></i>
      </div>
    ) : null}
    <div className="wechat-cell-content flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
      <span className={`wechat-cell-label text-base render-text-primary font-normal leading-tight truncate ${labelClassName}`}>{label}</span>
      {subtitle && <span className="wechat-cell-subtitle text-sm text-gray-400 mt-0.5 truncate">{subtitle}</span>}
    </div>
    <div className="wechat-cell-right flex items-center text-[#B2B2B2] flex-shrink-0 ml-2 gap-2">
      <div className="wechat-cell-extra text-sm text-gray-400 dark:text-gray-500 flex-shrink-0">{rightContent}</div>
      {showArrow && <i className="wechat-cell-arrow fa-solid fa-chevron-right text-[10px] opacity-50 flex-shrink-0"></i>}
    </div>
  </div>
);

export const WeChatSwitch: React.FC<{ active: boolean, onChange: () => void }> = ({ active, onChange }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`wechat-switch w-11 h-6 rounded-full relative transition-colors cursor-pointer ${active ? 'wechat-switch-on' : 'bg-gray-200 dark:bg-[#333]'}`}
    style={active ? { backgroundColor: 'var(--app-accent-color)' } : {}}
  >
    <div className={`wechat-switch-thumb absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ left: 0 }}></div>
  </div>
);

export const SectionDivider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="wechat-divider render-bg-primary flex-shrink-0">
    {label ? <div className="wechat-divider-label px-4 py-1.5 text-[12px] text-gray-500 font-medium uppercase tracking-wider">{label}</div> : <div className="h-2"></div>}
  </div>
);

export const MobileHeader: React.FC<{
  title: string,
  subtitle?: string,
  onBack?: () => void,
  actions?: React.ReactNode,
  className?: string,
  backIcon?: React.ReactNode,
  backgroundImage?: string,
  avatarSrc?: string,
  avatarGroupSrcs?: string[],
  onTitleClick?: () => void,
  onAvatarClick?: () => void
}> = ({ title, subtitle, onBack, actions, className = "", backIcon, backgroundImage, avatarSrc, avatarGroupSrcs = [], onTitleClick, onAvatarClick }) => {
  const hasGroupAvatar = avatarGroupSrcs.length > 1;
  const hasAvatar = hasGroupAvatar || !!avatarSrc;
  const hasLeftSlot = Boolean(onBack || hasAvatar);
  const hasRightSlot = Boolean(actions || hasAvatar);
  const resolvedBackgroundImage = backgroundImage
    ? `url(${backgroundImage})`
    : 'var(--app-header-image, none)';

  const renderHeaderAvatar = (extraClassName = '') => {
    if (hasGroupAvatar) {
      const list = avatarGroupSrcs.slice(0, 9);
      return (
        <div
          className={`render-header-avatar render-header-avatar-group w-7 h-7 grid grid-cols-3 grid-rows-3 gap-[1px] overflow-hidden app-avatar-radius ${extraClassName} ${onAvatarClick ? 'cursor-pointer' : ''}`}
          onClick={(e) => { e.stopPropagation(); onAvatarClick?.(); }}
        >
          {Array.from({ length: 9 }).map((_, idx) => {
            const src = list[idx];
            return (
              <div key={idx} className="w-full h-full render-bg-tertiary overflow-hidden">
                {src ? <img src={src} className="w-full h-full object-cover" /> : null}
              </div>
            );
          })}
        </div>
      );
    }
    if (!avatarSrc) return null;
    return <img src={avatarSrc} className={`render-header-avatar w-7 h-7 object-cover app-avatar-radius ${extraClassName} ${onAvatarClick ? 'cursor-pointer' : ''}`} onClick={(e) => { e.stopPropagation(); onAvatarClick?.(); }} />;
  };

  return (
    <header
      className={`wechat-header flex items-center px-4 sticky top-0 z-[60] flex-shrink-0 w-full border-b render-border ${className}`}
      style={{
        paddingTop: 'var(--app-safe-top-offset, var(--safe-top, 0px))',
        height: 'calc(var(--header-height, 48px) + var(--app-safe-top-offset, var(--safe-top, 0px)))',
        backgroundImage: resolvedBackgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div
        className="wechat-header-left render-header-left flex items-center justify-start flex-shrink-0 gap-2"
        style={{ width: hasLeftSlot ? 'auto' : 0, minWidth: hasLeftSlot ? 32 : 0 }}
      >
        {onBack && (
          <button onClick={onBack} className="wechat-header-btn render-header-text text-lg transition-opacity">
            {backIcon || <i className="wechat-header-btn fa-solid fa-chevron-left"></i>}
          </button>
        )}
        {hasAvatar && renderHeaderAvatar('render-header-avatar-left')}
      </div>
      <div
        className={`wechat-header-center render-header-center flex-1 flex flex-col justify-center items-center overflow-hidden min-w-0 px-2 ${onTitleClick ? 'cursor-pointer' : ''}`}
        onClick={onTitleClick}
      >
        {hasAvatar && renderHeaderAvatar('render-header-avatar-center mb-1')}
        <h1 className="wechat-header-title render-header-text text-base font-bold truncate leading-tight max-w-full">{title}</h1>
        {subtitle && <span className="wechat-header-subtitle text-[11px] mt-0.5 truncate max-w-full" style={{ display: 'block' }}>{subtitle}</span>}
      </div>
      <div
        className="wechat-header-right render-header-right ml-auto flex items-center justify-end render-header-text flex-shrink-0 gap-2"
        style={{ width: hasRightSlot ? 'auto' : 0, minWidth: hasRightSlot ? 32 : 0 }}
      >
        {hasAvatar && renderHeaderAvatar('render-header-avatar-right')}
        {actions}
      </div>
    </header>
  );
};
