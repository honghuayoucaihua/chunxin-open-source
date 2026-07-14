import React from 'react';
import type { PlayerTrack } from './musicCommon';

export const MusicStatusCard: React.FC<{
  title: string;
  desc: string;
  avatars?: string[];
  placeholderIcon?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, desc, avatars = [], placeholderIcon = 'fa-user', className = '', children }) => (
  <div className={`app-surface-panel app-surface-panel--music-card p-4 ${className}`.trim()}>
    {children}
    <div className="flex items-center justify-between pt-2 render-border">
      <div>
        <div className="text-sm render-text-primary">{title}</div>
        <div className="text-xs render-text-tertiary mt-0.5">{desc}</div>
      </div>
      <div className="flex items-center -space-x-1.5">
        {avatars.length > 0 ? (
          avatars.map((avatar, index) => (
            <img key={`${avatar}-${index}`} src={avatar} loading="lazy" decoding="async" className="w-7 h-7 rounded-full object-cover render-border" />
          ))
        ) : (
          <div className="w-7 h-7 rounded-full render-bg-tertiary render-border flex items-center justify-center">
            <i className={`fa-solid ${placeholderIcon} text-xs render-text-tertiary`}></i>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const MusicTrackActionRow: React.FC<{
  track: PlayerTrack;
  onPrimary: () => void | Promise<void>;
  onSecondary?: () => void | Promise<void>;
  primaryIcon?: string;
  secondaryIcon?: string;
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}> = ({
  track,
  onPrimary,
  onSecondary,
  primaryIcon = 'fa-play',
  secondaryIcon = 'fa-plus',
  active = false,
  removable = false,
  onRemove
}) => (
  <div className={`app-list-item app-list-item--soft music-track-row ${active ? 'is-active' : ''}`}>
    <div className="w-11 h-11 rounded-lg render-bg-tertiary flex items-center justify-center flex-shrink-0 overflow-hidden">
      {track.cover ? (
        <img src={track.cover} loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <i className="fa-solid fa-music render-text-tertiary"></i>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm truncate render-text-primary" style={active ? { color: 'var(--app-accent-color)' } : undefined}>{track.name}</div>
      <div className="text-xs render-text-tertiary truncate mt-0.5">{track.artist}{track.album ? ` · ${track.album}` : ''}</div>
    </div>
    {active ? (
      <div className="flex items-end gap-0.5 h-4 mr-1">
        <span className="w-0.5 h-2 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ backgroundColor: 'var(--app-accent-color)' }}></span>
        <span className="w-0.5 h-3 rounded-full animate-[bounce_0.6s_ease-in-out_0.1s_infinite]" style={{ backgroundColor: 'var(--app-accent-color)' }}></span>
        <span className="w-0.5 h-2 rounded-full animate-[bounce_0.6s_ease-in-out_0.2s_infinite]" style={{ backgroundColor: 'var(--app-accent-color)' }}></span>
      </div>
    ) : null}
    {onSecondary ? (
      <button
        className="app-icon-button w-9 h-9 rounded-full render-text-tertiary hover:render-text-primary render-bg-tertiary transition-colors"
        onClick={onSecondary}
        title="次操作"
      >
        <i className={`fa-solid ${secondaryIcon}`}></i>
      </button>
    ) : null}
    <button
      className="app-button app-button-primary w-9 h-9 rounded-full min-h-0 flex items-center justify-center text-white transition-colors"
      onClick={onPrimary}
      title="主操作"
    >
      <i className={`fa-solid ${primaryIcon} text-sm`}></i>
    </button>
    {removable && onRemove ? (
      <button
        className="app-icon-button w-8 h-8 rounded-full render-text-tertiary hover:text-red-400 transition-colors"
        onClick={onRemove}
        title="移除"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    ) : null}
  </div>
);
