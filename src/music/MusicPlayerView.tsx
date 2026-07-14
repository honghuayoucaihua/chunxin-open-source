import React, { useMemo } from 'react';
import { Contact } from '../types';
import { formatTogetherTime, getCurrentLyricIndex, secToTime } from './musicCommon';
import type { MusicState } from './musicCommon';
import { useMusicPlayer } from './hooks/useMusicPlayer';
import { MusicStatusCard } from './MusicPrimitives';

export const MusicPlayerView: React.FC<{
  contacts: Contact[];
  userAvatar: string;
  onBack: () => void;
  onNavigate?: (subView: 'musicSearch' | 'musicInvite' | 'musicPlaylist') => void;
  musicState?: MusicState;
  onMusicStateChange?: (state: Partial<MusicState>) => void;
}> = ({ contacts, userAvatar, onBack, onNavigate, musicState, onMusicStateChange }) => {
  const player = useMusicPlayer(musicState, onMusicStateChange);

  const inviteCandidates = useMemo(
    () => contacts.filter((c) => !c.isGroup && c.id !== 'officialAccounts').slice(0, 20),
    [contacts]
  );

  const joinedContacts = useMemo(
    () => inviteCandidates.filter((c) => player.joinedIds.includes(c.id)).slice(0, 2),
    [inviteCandidates, player.joinedIds]
  );

  return (
    <div className="relative flex flex-col h-full animate-in slide-in-from-right duration-200 render-bg-primary">
      {/* 顶部导航栏 */}
      <div className="px-2 pb-2 flex items-center justify-between relative render-bg-secondary/80 backdrop-blur-sm" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button className="app-icon-button w-9 h-9 rounded-full render-bg-tertiary backdrop-blur-sm flex items-center justify-center flex-shrink-0 render-text-primary" onClick={onBack}>
          <i className="fa-solid fa-chevron-down"></i>
        </button>

        {/* 歌曲信息 - 绝对居中 */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center max-w-[50%]">
          <div className="text-base font-semibold truncate render-text-primary">{player.currentTrack?.name || '未播放歌曲'}</div>
          <div className="text-xs render-text-secondary truncate">{player.currentTrack?.artist || '—'}</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="app-icon-button w-9 h-9 rounded-full render-bg-tertiary backdrop-blur-sm flex items-center justify-center render-text-primary" onClick={() => onNavigate?.('musicInvite')}>
            <i className="fa-solid fa-user-plus text-sm"></i>
          </button>
          <button className="app-icon-button w-9 h-9 rounded-full render-bg-tertiary backdrop-blur-sm flex items-center justify-center render-text-primary" onClick={() => onNavigate?.('musicSearch')}>
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </button>
        </div>
      </div>

      {/* 一起听状态 */}
      {player.joinedIds.length > 0 && (
        <div className="px-4 pt-3">
          <MusicStatusCard
            title="一起听状态"
            desc={`${player.togetherMode === 'together' ? '在一起' : `相距 ${player.distanceKm} 公里`} · 一起听了 ${formatTogetherTime(player.totalTogetherTime)}`}
            avatars={[userAvatar, ...joinedContacts.map((c) => c.avatar)]}
            className="music-player-status-card"
          >
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 overflow-hidden border-2 border-white/30 dark:border-white/30 z-10 rounded-full">
                <img src={userAvatar} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              {joinedContacts.map((c, i) => (
                <div key={c.id} className="w-14 h-14 overflow-hidden border-2 border-white/30 dark:border-white/30 rounded-full" style={{ zIndex: 9 - i, marginLeft: '-12px' }}>
                  <img src={c.avatar} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-center render-text-secondary">
            {player.togetherMode === 'together' ? (
              <span style={{ color: 'var(--app-accent-color)' }}>在一起</span>
            ) : (
              <span className="text-blue-400">相距 {player.distanceKm} 公里</span>
            )}
            <span className="render-text-tertiary ml-1">· 一起听了 {formatTogetherTime(player.totalTogetherTime)}</span>
            </div>
          </MusicStatusCard>
        </div>
      )}

      {/* 黑胶唱片 */}
      <div className="flex-1 flex items-center justify-center py-4 relative">
        {/* 歌词层 */}
        {player.showLyrics && player.lyrics.length > 0 && (
          <div
            ref={player.lyricRef}
            className="absolute inset-0 z-10 overflow-y-auto px-6 py-8 bg-black/60 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => player.setShowLyrics(false)}
          >
            <div className="space-y-4 text-center">
              {player.lyrics.map((line, index) => (
                <div
                  key={index}
                  data-index={index}
                  className={`text-base transition-all duration-300 ${
                    index === player.currentLyricIndex
                      ? 'text-white text-lg font-semibold scale-105'
                      : 'text-white/40'
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="relative cursor-pointer"
          onClick={() => player.lyrics.length > 0 && player.setShowLyrics(!player.showLyrics)}
        >
          <div
            className={`w-[320px] h-[320px] rounded-full relative ${player.isPlaying ? 'animate-spin-vinyl' : ''}`}
            style={{
              background: `
                radial-gradient(circle at 50% 50%,
                  #1a1a1a 0%,
                  #0f0f0f 15%,
                  #1a1a1a 15.5%,
                  #0d0d0d 35%,
                  #1a1a1a 35.5%,
                  #0a0a0a 55%,
                  #1a1a1a 55.5%,
                  #0d0d0d 75%,
                  #1a1a1a 75.5%,
                  #0a0a0a 100%
                )
              `,
              boxShadow: `
                0 0 0 14px #0a0a0a,
                0 0 0 16px #2a2a2a,
                0 0 0 18px #1a1a1a,
                0 40px 80px -10px rgba(0,0,0,0.8),
                inset 0 0 80px rgba(0,0,0,0.3)
              `,
              animationDuration: '8s'
            }}
          >
            <div className="absolute inset-0 rounded-full" style={{
              background: 'repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 4px, rgba(40,40,40,0.3) 4px, rgba(40,40,40,0.3) 5px)',
            }}></div>
            <div className="absolute inset-0 rounded-full" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)',
            }}></div>

            {/* 中心专辑图 */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full overflow-hidden music-album-cover-shell"
              style={{
                background: 'linear-gradient(145deg, #c41e3a 0%, #8b0000 50%, #5c0000 100%)',
                boxShadow: 'inset 0 2px 12px rgba(255,255,255,0.2), inset 0 -2px 12px rgba(0,0,0,0.3)'
              }}
            >
              {player.currentTrack?.cover ? (
                <img src={player.currentTrack.cover} loading="lazy" decoding="async" className="w-full h-full object-cover music-album-cover-img" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fa-solid fa-music text-4xl text-white/30"></i>
                </div>
              )}
            </div>

            {/* 中心孔 */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
              style={{
                background: 'radial-gradient(circle, #0a0a0a 40%, #1a1a1a 100%)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)'
              }}
            ></div>
          </div>

          {player.lyrics.length > 0 && !player.showLyrics && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs render-text-tertiary">
              点击唱片查看歌词
            </div>
          )}
        </div>
      </div>

      {/* 进度条区域 */}
      <div className="mx-6 mb-2">
        {/* 顶部：歌词图标和时间 */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs render-text-secondary">{secToTime(player.currentTime)}</div>
          <button
            className={`app-icon-button w-8 h-8 rounded-full transition-colors ${player.showLyrics ? 'render-text-primary' : player.lyrics.length > 0 ? 'render-text-secondary hover:render-text-primary' : 'render-text-tertiary'}`}
            style={player.showLyrics ? { backgroundColor: 'rgba(var(--app-accent-color-rgb, 7, 193, 96), 0.3)' } : {}}
            onClick={() => player.setShowLyrics(!player.showLyrics)}
            disabled={player.lyrics.length === 0}
            title={player.lyrics.length > 0 ? '显示歌词' : '暂无歌词'}
          >
            <i className="fa-solid fa-language text-sm"></i>
          </button>
          <div className="text-xs render-text-secondary">{secToTime(player.duration)}</div>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(player.duration, 1)}
          step={0.1}
          value={Math.min(player.currentTime, player.duration || 1)}
          onChange={(e) => player.handleSeek(Number(e.target.value))}
          className="w-full h-1"
        />
      </div>

      {/* 播放控制 */}
      <div className="flex items-center justify-center gap-6 mb-4 px-4">
        <button
          className="app-icon-button w-10 h-10 rounded-full render-text-secondary hover:render-text-primary transition-colors relative"
          onClick={player.cyclePlayMode}
        >
          <i className={`fa-solid ${player.getPlayModeIcon()} text-lg`}></i>
          {player.playMode === 'single' && (
            <span className="absolute text-[8px] font-bold mt-0.5" style={{ color: 'var(--app-accent-color)' }}>1</span>
          )}
        </button>

        <button
          className="app-icon-button w-10 h-10 rounded-full render-text-primary hover:scale-105 transition-transform"
          onClick={player.handlePrev}
        >
          <i className="fa-solid fa-backward-step text-2xl"></i>
        </button>

        <button
          className="app-button app-button-primary w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          onClick={player.togglePlay}
        >
          <i className={`fa-solid ${player.isPlaying ? 'fa-pause' : 'fa-play'} text-xl ${player.isPlaying ? '' : 'ml-1'}`}></i>
        </button>

        <button
          className="app-icon-button w-10 h-10 rounded-full render-text-primary hover:scale-105 transition-transform"
          onClick={player.handleNext}
        >
          <i className="fa-solid fa-forward-step text-2xl"></i>
        </button>

        <button
          className="app-icon-button w-10 h-10 rounded-full render-text-secondary hover:render-text-primary transition-colors relative"
          onClick={() => onNavigate?.('musicPlaylist')}
        >
          <i className="fa-solid fa-bars-staggered text-lg"></i>
          {player.queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white" style={{ backgroundColor: 'var(--app-accent-color)' }}>
              {player.queue.length > 99 ? '99' : player.queue.length}
            </span>
          )}
        </button>
      </div>

    </div>
  );
};
