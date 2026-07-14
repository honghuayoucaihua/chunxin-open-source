import React, { useEffect, useMemo, useState } from 'react';
import { Contact } from '../types';
import { formatTogetherTime } from './musicCommon';
import type { MusicState } from './musicCommon';
import { ContactSelectRow, SegmentedControl } from '../utils/SelectionPrimitives';
import { MusicStatusCard } from './MusicPrimitives';

// 音乐邀请一起听页面（独立子页面）
export const MusicInviteView: React.FC<{
  contacts: Contact[];
  userAvatar: string;
  onBack: () => void;
  musicState?: MusicState;
  onMusicStateChange?: (state: Partial<MusicState>) => void;
}> = ({ contacts, userAvatar, onBack, musicState, onMusicStateChange }) => {
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [togetherMode, setTogetherMode] = useState<'together' | 'distance'>(musicState?.togetherMode || 'together');
  const [distanceKm, setDistanceKm] = useState<number>(musicState?.distanceKm || 0);
  const [distanceInput, setDistanceInput] = useState(String(musicState?.distanceKm || ''));
  const [clockNow, setClockNow] = useState(Date.now());

  const joinedIds = musicState?.joinedIds || [];
  const togetherStartAt = musicState?.togetherStartAt || null;
  const togetherElapsed = musicState?.togetherElapsed || 0;
  const isPlaying = musicState?.isPlaying || false;
  const queue = musicState?.queue || [];
  const currentTrack = queue[musicState?.currentIndex || 0];

  const inviteCandidates = useMemo(
    () => contacts.filter((c) => !c.isGroup && c.id !== 'officialAccounts').slice(0, 20),
    [contacts]
  );

  const joinedContacts = useMemo(
    () => inviteCandidates.filter((c) => joinedIds.includes(c.id)).slice(0, 2),
    [inviteCandidates, joinedIds]
  );

  const totalTogetherTime = useMemo(() => {
    if (!togetherStartAt || !currentTrack || joinedIds.length === 0) return togetherElapsed;
    if (isPlaying) {
      return togetherElapsed + Math.max(0, Math.floor((clockNow - togetherStartAt) / 1000));
    }
    return togetherElapsed;
  }, [clockNow, togetherStartAt, currentTrack, isPlaying, joinedIds, togetherElapsed]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleInvite = () => {
    if (selectedInviteIds.length === 0) return;
    const isNewPerson = !joinedIds.includes(selectedInviteIds[0]);
    let newTogetherStartAt = togetherStartAt;
    let newTogetherElapsed = togetherElapsed;

    if (isNewPerson) {
      newTogetherStartAt = null;
      newTogetherElapsed = 0;
    }

    if (onMusicStateChange) {
      onMusicStateChange({
        joinedIds: selectedInviteIds.slice(0, 1),
        togetherStartAt: currentTrack && isPlaying ? Date.now() : newTogetherStartAt,
        togetherElapsed: newTogetherElapsed,
        togetherMode,
        distanceKm
      });
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 render-bg-primary">
      <div className="px-4 pb-3 render-border flex items-center gap-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button className="app-icon-button w-8 h-8 rounded-full render-bg-tertiary render-text-primary" onClick={onBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <div className="text-sm font-medium render-text-primary">邀请一起听</div>
      </div>

      <div className="px-4 pt-4">
        <MusicStatusCard
          title="一起听状态"
          desc={joinedIds.length > 0
            ? (totalTogetherTime > 0 ? `一起听了 ${formatTogetherTime(totalTogetherTime)}` : '等待播放')
            : '选择联系人后发起'}
          avatars={[userAvatar, ...joinedContacts.map((c) => c.avatar)]}
          className="p-4"
        >
          <div className="mb-4">
            <div className="text-xs render-text-secondary mb-2">选择状态</div>
            <SegmentedControl
              value={togetherMode}
              variant="pill"
              onChange={(next) => setTogetherMode(next as 'together' | 'distance')}
              options={[
                { key: 'together', label: '在一起', icon: 'fa-heart' },
                { key: 'distance', label: '距离', icon: 'fa-location-dot', activeStyle: { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff' } }
              ]}
            />
          </div>

          {togetherMode === 'distance' && (
            <div className="mb-4">
              <div className="text-xs render-text-secondary mb-1.5">输入相距公里数</div>
              <input
                type="number"
                value={distanceInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistanceInput(val);
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 0) {
                    setDistanceKm(num);
                  }
                }}
                placeholder="输入公里数"
                className="app-field-input app-field-input--pill w-full px-3 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          )}
        </MusicStatusCard>
      </div>

      <div className="flex-1 overflow-y-auto mt-4">
        <div className="px-4 pb-2 text-xs render-text-tertiary">选择联系人</div>
        <div className="mx-4 app-surface-panel app-surface-panel--music-card overflow-hidden">
          {inviteCandidates.map((c) => {
            const selected = selectedInviteIds.includes(c.id);
            const joined = joinedIds.includes(c.id);
            return (
              <ContactSelectRow
                key={c.id}
                avatar={c.avatar}
                avatarShape="circle"
                indicatorVariant="compact"
                name={c.remark?.trim() || c.name}
                desc={joined ? '已加入一起听' : selected ? '待邀请' : '未选择'}
                checked={selected}
                onClick={() => {
                  setSelectedInviteIds(selected ? [] : [c.id]);
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        <button className="app-button app-button-primary w-full whitespace-nowrap" onClick={handleInvite}>
          {joinedIds.length > 0 ? '更新邀请' : '邀请一起听'}
        </button>
        {joinedIds.length > 0 && (
          <button
            className="app-button w-full whitespace-nowrap render-bg-tertiary render-text-secondary border border-red-300/40 dark:border-red-700/40 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => {
              if (onMusicStateChange) {
                onMusicStateChange({
                  joinedIds: [],
                  togetherStartAt: null,
                  togetherElapsed: 0,
                });
              }
              onBack();
            }}
          >
            退出一起听
          </button>
        )}
      </div>
    </div>
  );
};
