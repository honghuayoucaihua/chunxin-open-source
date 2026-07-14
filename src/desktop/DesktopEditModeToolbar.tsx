import React from 'react';

type DesktopEditModeToolbarProps = {
  isDark: boolean;
  canDeletePage: boolean;
  onAddWidget: () => void;
  onAddPage: () => void;
  onDeleteCurrentPage: () => void;
  onDone: () => void;
};

const handleTouchAction = (
  event: React.TouchEvent<HTMLButtonElement>,
  action: () => void
) => {
  event.preventDefault();
  action();
};

export const DesktopEditModeToolbar: React.FC<DesktopEditModeToolbarProps> = ({
  isDark,
  canDeletePage,
  onAddWidget,
  onAddPage,
  onDeleteCurrentPage,
  onDone,
}) => {
  const neutralButtonClassName = `px-3 py-1 rounded-full text-xs pointer-events-auto relative z-10 ${isDark ? 'bg-white/20' : 'bg-black/10'}`;
  const dangerButtonClassName = `px-3 py-1 rounded-full text-xs pointer-events-auto relative z-10 ${isDark ? 'bg-red-500/70 text-white' : 'bg-red-500 text-white'}`;

  return (
    <>
      <button
        className={neutralButtonClassName}
        onClick={onAddWidget}
        onTouchEnd={(event) => handleTouchAction(event, onAddWidget)}
      >
        +小组件
      </button>
      <button
        className={neutralButtonClassName}
        onClick={onAddPage}
        onTouchEnd={(event) => handleTouchAction(event, onAddPage)}
      >
        +页面
      </button>
      {canDeletePage && (
        <button
          className={dangerButtonClassName}
          onClick={onDeleteCurrentPage}
          onTouchEnd={(event) => handleTouchAction(event, onDeleteCurrentPage)}
        >
          删当前页
        </button>
      )}
      <button
        className={neutralButtonClassName}
        onClick={onDone}
        onTouchEnd={(event) => handleTouchAction(event, onDone)}
      >
        完成
      </button>
    </>
  );
};

export default DesktopEditModeToolbar;
