import React, { useEffect, useRef, useState } from 'react';
import { globalAudioManager } from '../services/globalAudio';
import {
  searchMusicTracks,
  resolveMusicTrackCover,
  resolveMusicTrackUrl
} from './musicCommon';
import type { MusicSource, MusicState, PlayerTrack } from './musicCommon';
import { LocalMusicModal, initialLocalMusicModalState } from './LocalMusicModal';
import type { LocalMusicModalState } from './LocalMusicModal';
import { MusicTrackActionRow } from './MusicPrimitives';
import {
  captureMusicRuntimeResetEpoch,
  isMusicRuntimeResetEpochStale
} from '../services/musicRuntimeResetGuard.ts';

// 音乐搜索页面（独立子页面）
export const MusicSearchView: React.FC<{
  onBack: () => void;
  onBackToMusic?: () => void;
  musicState?: MusicState;
  onMusicStateChange?: (state: Partial<MusicState>) => void;
}> = ({ onBack, onBackToMusic, musicState, onMusicStateChange }) => {
  const [source, setSource] = useState<MusicSource>('netease');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayerTrack[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const searchRequestSeqRef = useRef(0);
  const latestSearchContextRef = useRef({ source, keyword: '' });

  // 本地音乐上传模态窗状态
  const [localMusicModal, setLocalMusicModal] = useState<LocalMusicModalState>(initialLocalMusicModalState);

  const queue = musicState?.queue || [];
  const currentIndex = musicState?.currentIndex || 0;
  const joinedIds = musicState?.joinedIds || [];
  const togetherStartAt = musicState?.togetherStartAt || null;

  useEffect(() => {
    latestSearchContextRef.current = { source, keyword: searchKeyword.trim() };
  }, [source, searchKeyword]);

  const beginSearchRequest = (keyword: string) => {
    const requestId = searchRequestSeqRef.current + 1;
    searchRequestSeqRef.current = requestId;
    return {
      requestId,
      epoch: captureMusicRuntimeResetEpoch(),
      source,
      keyword
    };
  };

  const isSearchRequestStale = (request: {
    requestId: number;
    epoch: number;
    source: MusicSource;
    keyword: string;
  }): boolean => {
    if (isMusicRuntimeResetEpochStale(request.epoch)) return true;
    if (searchRequestSeqRef.current !== request.requestId) return true;
    return latestSearchContextRef.current.source !== request.source
      || latestSearchContextRef.current.keyword !== request.keyword;
  };

  const resolvePlayableTrack = async (track: PlayerTrack, epoch: number): Promise<PlayerTrack | null> => {
    const url = await resolveMusicTrackUrl(source, track);
    if (isMusicRuntimeResetEpochStale(epoch)) return null;
    if (!url) return null;
    let cover = track.cover || '';
    if (!cover) {
      cover = await resolveMusicTrackCover(source, track);
      if (isMusicRuntimeResetEpochStale(epoch)) return null;
    }
    return { ...track, url, cover };
  };

  const onSearch = async () => {
    const q = searchKeyword.trim();
    if (!q) return;
    const request = beginSearchRequest(q);
    setLoading(true);
    try {
      const normalized = await searchMusicTracks(source, q);
      if (isSearchRequestStale(request)) return;
      setSearchResults(normalized);
    } catch {
      if (isSearchRequestStale(request)) return;
      setSearchResults([]);
    } finally {
      if (!isSearchRequestStale(request)) {
        setLoading(false);
      }
    }
  };

  const addToQueue = async (track: PlayerTrack) => {
    const epoch = captureMusicRuntimeResetEpoch();
    const normalized = await resolvePlayableTrack(track, epoch);
    if (isMusicRuntimeResetEpochStale(epoch)) return;
    if (!normalized) return;
    if (onMusicStateChange) {
      onMusicStateChange({ queue: [...queue, normalized] });
    }
  };

  const playTrack = async (track: PlayerTrack, append = true) => {
    const epoch = captureMusicRuntimeResetEpoch();
    const normalized = await resolvePlayableTrack(track, epoch);
    if (isMusicRuntimeResetEpochStale(epoch)) return;
    if (!normalized?.url) return;

    if (!append) {
      if (onMusicStateChange) {
        onMusicStateChange({ queue: [normalized], currentIndex: 0, isPlaying: true });
      }
      globalAudioManager.setSrc(normalized.url);
      globalAudioManager.play().catch(() => {});
    } else {
      const newQueue = [...queue, normalized];
      if (onMusicStateChange) {
        onMusicStateChange({ queue: newQueue, currentIndex: newQueue.length - 1, isPlaying: true });
      }
      globalAudioManager.setSrc(normalized.url);
      globalAudioManager.play().catch(() => {});
    }

    if (joinedIds.length > 0 && !togetherStartAt) {
      if (onMusicStateChange) {
        onMusicStateChange({ togetherStartAt: Date.now() });
      }
    }

    onBack();
  };

  // 处理文件选择 - 打开模态窗
  const handleFileSelect = (file?: File) => {
    if (!file) return;

    // 从文件名提取歌曲名（去掉扩展名）
    const fileName = file.name.replace(/\.[^.]+$/, '');

    setLocalMusicModal({
      visible: true,
      file,
      name: fileName,
      artist: '本地歌手',
      cover: '',
      coverFile: null
    });
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 render-bg-primary">
      {/* 本地音乐上传模态窗 */}
      <LocalMusicModal
        modalState={localMusicModal}
        setModalState={setLocalMusicModal}
        queue={queue}
        joinedIds={joinedIds}
        togetherStartAt={togetherStartAt}
        onMusicStateChange={onMusicStateChange}
        onBack={onBack}
        onBackToMusic={onBackToMusic}
      />

      <div className="px-4 pb-3 render-border flex items-center gap-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button className="app-icon-button w-8 h-8 rounded-full render-bg-tertiary render-text-primary" onClick={onBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <div className="text-sm font-medium render-text-primary">搜索音乐</div>
      </div>

      <div className="px-4 pt-4">
        <div className="app-search-shell">
          <i className="fa-solid fa-magnifying-glass render-text-tertiary text-sm"></i>
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索歌曲/歌手/专辑"
            className="app-search-shell-input"
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <button className="app-button app-button-primary px-3 py-1.5 text-xs whitespace-nowrap min-h-0 rounded-full" onClick={onSearch}>
            {loading ? '搜索中' : '搜索'}
          </button>
        </div>

        <div className="app-chip-group mt-3 overflow-x-auto pb-1">
          {['netease', 'kuwo', 'joox', 'bilibili'].map((s) => (
            <button
              key={s}
              className={`app-chip ${source === s ? 'app-chip--active' : ''}`}
              onClick={() => setSource(s as MusicSource)}
            >
              {s === 'netease' ? '网易云' : s === 'kuwo' ? '酷我' : s === 'joox' ? 'JOOX' : 'B站'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="app-surface-panel app-surface-panel--soft p-3 !rounded-[1rem]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm render-text-primary">本地上传</div>
              <div className="text-xs render-text-tertiary mt-0.5">选择本地音频文件，长期保存</div>
            </div>
            <button
              className="app-button app-button-primary px-3 py-2 text-sm"
              onClick={() => uploadRef.current?.click()}
            >
              选择文件
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-4">
        <div className="px-4 pb-2 text-xs render-text-tertiary">搜索结果</div>
        {searchResults.length === 0 ? (
          <div className="px-4 py-10 text-sm render-text-tertiary flex flex-col items-center">
            <i className="fa-solid fa-compact-disc text-3xl mb-3 opacity-50"></i>
            <div>暂无结果，试试输入关键词</div>
          </div>
        ) : (
          searchResults.map((track) => (
            <MusicTrackActionRow
              key={`${track.source}-${track.id}`}
              track={track}
              onSecondary={async () => { await addToQueue(track); }}
              onPrimary={async () => { await playTrack(track, true); }}
            />
          ))
        )}
      </div>

      <input
        ref={uploadRef}
        type="file"
        className="hidden"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          if (e.target) e.target.value = '';
        }}
      />
    </div>
  );
};
