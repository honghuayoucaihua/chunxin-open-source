import React from 'react';
import SkinIcon from '../shell/SkinIcon';
import { UserProfile } from '../types';

type QQActionRow = {
  icon: string;
  label: string;
  rightText?: string;
  sub?: string;
  subStyle?: string;
  onClick?: (onSub: (v: any) => void) => void;
};

const QQ_ACTION_ROWS: QQActionRow[] = [
  { icon: 'fa-image', label: '相册', onClick: (onSub) => onSub('imageLibraryGroups') },
  { icon: 'fa-bookmark', label: '收藏', onClick: (onSub) => onSub('favorites') },
  { icon: 'fa-folder', label: '文件' },
  { icon: 'fa-wallet', label: '钱包', onClick: (onSub) => onSub('pay') },
  { icon: 'fa-crown', label: '会员中心', rightText: 'SVIP10回归', sub: '🐧', subStyle: 'text-lg' },
  { icon: 'fa-images', label: '相册', onClick: (onSub) => onSub('imageLibraryGroups') },
  { icon: 'fa-face-smile', label: '表情', onClick: (onSub) => onSub('emojiGroups') },
  { icon: 'fa-tower-cell', label: '免流量', rightText: '限时推广' },
  { icon: 'fa-gear', label: '设置', onClick: (onSub) => onSub('settings') }
];

const QQ_LEVEL_STEP = 4;

const parseNonNegativeInt = (raw: string | null): number | null => {
  if (raw === null) return null;
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return 0;
  return Math.max(0, Number.parseInt(digits, 10) || 0);
};

const buildQQLevelBadges = (level: number): string => {
  if (level <= 0) return '⭐';
  let rest = Math.floor(level);
  const stars = rest % QQ_LEVEL_STEP;
  rest = Math.floor(rest / QQ_LEVEL_STEP);
  const moons = rest % QQ_LEVEL_STEP;
  rest = Math.floor(rest / QQ_LEVEL_STEP);
  const suns = rest % QQ_LEVEL_STEP;
  const crowns = Math.floor(rest / QQ_LEVEL_STEP);
  const badge = `${'👑'.repeat(crowns)}${'☀️'.repeat(suns)}${'🌙'.repeat(moons)}${'⭐'.repeat(stars)}`;
  return badge || '⭐';
};

const QQProfileCard: React.FC<{
  user: UserProfile;
  onSub: (v: any) => void;
  levelBadge: string;
  likes: number;
  onEditLevel: () => void;
  onEditLikes: () => void;
}> = ({ user, onSub, levelBadge, likes, onEditLevel, onEditLikes }) => (
  <div className="mx-3 mt-2 mb-3 p-3 rounded-2xl border render-bg-secondary render-border-subtle render-qq-me-card" onClick={() => onSub('editProfile')}>
    <div className="flex items-start">
      <img src={user.avatar} className="w-14 h-14 rounded-full object-cover mr-3 render-bg-tertiary" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-[22px] leading-none font-semibold truncate">{user.name || '叙说用户'}</div>
          <i className="fa-solid fa-qrcode text-[14px] render-text-secondary"></i>
        </div>
        <div className="text-[13px] render-text-secondary mt-2 truncate">
          <i className="fa-solid fa-pen text-[11px] mr-1"></i>{user.signature.trim() || '编辑个签，展示我的独特态度。'}
        </div>
        <button
          type="button"
          className="mt-1.5 text-[12px] text-[#d6a63a] flex items-center gap-1 render-qq-level-button"
          onClick={(event) => {
            event.stopPropagation();
            onEditLevel();
          }}
        >
          <i className="fa-solid fa-medal text-[11px]"></i>
          <span>{levelBadge}</span>
          <span className="render-text-secondary">Lv.{Math.max(0, Math.floor(user.qqLevel || 0))}</span>
        </button>
      </div>
    </div>
    <div className="mt-2 text-[13px] render-text-secondary">+ 添加标签</div>
    <div className="mt-2 pt-2 border-t render-border-subtle flex items-center justify-between text-[14px]">
      <span><i className="fa-solid fa-plus mr-1.5 text-[12px]"></i>创建QQ秀</span>
      <span className="render-text-secondary flex items-center gap-2">
        <i className="fa-regular fa-bell"></i>通知
        <button
          type="button"
          className="render-qq-like-button"
          onClick={(event) => {
            event.stopPropagation();
            onEditLikes();
          }}
        >
          <i className="fa-regular fa-thumbs-up mr-1"></i>
        </button>
        <span className="render-qq-like-count">{likes}</span>
      </span>
    </div>
  </div>
);

const QQActionList: React.FC<{ onSub: (v: any) => void }> = ({ onSub }) => (
  <div className="mx-3 rounded-2xl overflow-hidden">
    {QQ_ACTION_ROWS.map((row) => (
      <button
        key={row.label}
        type="button"
        className="w-full px-1 py-0 bg-transparent border-0 border-b render-border-subtle last:border-b-0"
        onClick={() => row.onClick?.(onSub)}
      >
        <div className="flex items-center min-h-[52px] px-2">
          <div className={`wechat-cell-icon wechat-cell-icon-${row.icon} w-9 h-9 rounded flex items-center justify-center mr-3 flex-shrink-0 shadow-sm render-bg-tertiary`}>
            <SkinIcon icon={row.icon} className="text-[18px] render-text-secondary" />
          </div>
          <span className="text-[20px] scale-[0.7] origin-left leading-none">{row.label}</span>
          <div className="ml-auto flex items-center text-[12px] render-text-tertiary">
            {row.rightText && <span className="mr-1">{row.rightText}</span>}
            {row.sub && <span className={row.subStyle || ''}>{row.sub}</span>}
            <i className="fa-solid fa-chevron-right ml-2 text-[10px] opacity-50"></i>
          </div>
        </div>
      </button>
    ))}
  </div>
);

const MeTabQQView: React.FC<{
  user: UserProfile;
  setUser?: (updater: any) => void;
  onSub: (v: any) => void;
}> = ({ user, setUser, onSub }) => {
  const qqLevel = Math.max(0, Math.floor(user.qqLevel || 0));
  const qqLikes = Math.max(0, Math.floor(user.qqLikes || 0));
  const qqLevelBadge = React.useMemo(() => buildQQLevelBadges(qqLevel), [qqLevel]);

  const handleEditQQLevel = () => {
    if (!setUser) return;
    const value = parseNonNegativeInt(window.prompt('请输入QQ等级数字', String(qqLevel)));
    if (value === null) return;
    setUser((prev: UserProfile) => ({ ...prev, qqLevel: value }));
  };

  const handleEditQQLikes = () => {
    if (!setUser) return;
    const value = parseNonNegativeInt(window.prompt('请输入点赞数量', String(qqLikes)));
    if (value === null) return;
    setUser((prev: UserProfile) => ({ ...prev, qqLikes: value }));
  };

  return (
    <>
      <div className="render-qq-me-top-gap" />
      <QQProfileCard
        user={user}
        onSub={onSub}
        levelBadge={qqLevelBadge}
        likes={qqLikes}
        onEditLevel={handleEditQQLevel}
        onEditLikes={handleEditQQLikes}
      />
      <QQActionList onSub={onSub} />
    </>
  );
};

export default MeTabQQView;
