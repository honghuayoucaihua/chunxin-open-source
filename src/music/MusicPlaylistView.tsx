import React from 'react';
import { globalAudioManager } from '../services/globalAudio';
import { bumpMusicRuntimeResetEpoch } from '../services/musicRuntimeResetGuard.ts';
import type { MusicState } from './musicCommon';
import { MusicTrackActionRow } from './MusicPrimitives';

// 音乐播放列表页面（独立子页面）
export const MusicPlaylistView: React.FC<{
  onBack: () => void;
  musicState?: MusicState;
  onMusicStateChange?: (state: Partial<MusicState>) => void;
}> = ({ onBack, musicState, onMusicStateChange }) => {
  const queue = musicState?.queue || [];
  const currentIndex = musicState?.currentIndex || 0;
  const isPlaying = musicState?.isPlaying || false;

  const handlePlayTrack = (index: number) => {
    const track = queue[index];
    if (track?.url) {
      globalAudioManager.setSrc(track.url);
      globalAudioManager.play().catch(() => {});
      if (onMusicStateChange) {
        onMusicStateChange({ currentIndex: index, isPlaying: true });
      }
    }
    onBack();
  };

  const handleRemoveTrack = (index: number) => {
    const newQueue = queue.filter((_, i) => i !== index);
    let newIndex = currentIndex;

    if (index < currentIndex) {
      newIndex = currentIndex - 1;
    } else if (index === currentIndex) {
      if (newQueue.length > 0) {
        newIndex = Math.min(currentIndex, newQueue.length - 1);
        const nextUrl = newQueue[newIndex]?.url;
        if (nextUrl) {
          globalAudioManager.setSrc(nextUrl);
        }
      } else {
        globalAudioManager.stop();
        if (onMusicStateChange) {
          onMusicStateChange({ queue: [], currentIndex: 0, isPlaying: false });
        }
        return;
      }
    }

    if (onMusicStateChange) {
      onMusicStateChange({ queue: newQueue, currentIndex: newIndex });
    }
  };

  const clearPlaylist = () => {
    bumpMusicRuntimeResetEpoch();
    globalAudioManager.stop();
    if (onMusicStateChange) {
      onMusicStateChange({ queue: [], currentIndex: 0, isPlaying: false });
    }
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 render-bg-primary">
      <div className="px-4 pb-3 render-border flex items-center gap-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button className="app-icon-button w-8 h-8 rounded-full render-bg-tertiary flex items-center justify-center render-text-primary" onClick={onBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <div className="text-base font-medium render-text-primary">播放列表 ({queue.length})</div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full render-text-tertiary">
            <i className="fa-solid fa-music text-4xl mb-3"></i>
            <div>播放列表为空</div>
          </div>
        ) : (
          queue.map((track, index) => (
            <div
              key={`${track.source}-${track.id}-${index}`}
              onClick={() => handlePlayTrack(index)}
            >
              <MusicTrackActionRow
                track={track}
                active={index === currentIndex && isPlaying}
                removable
                primaryIcon="fa-play"
                onPrimary={() => handlePlayTrack(index)}
                onRemove={() => handleRemoveTrack(index)}
              />
            </div>
          ))
        )}
      </div>

      {queue.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#111] dark:via-[#111]/95 dark:to-transparent pt-8">
          <button
            className="app-button app-button-danger w-full"
            onClick={clearPlaylist}
          >
            <i className="fa-solid fa-trash mr-2"></i>
            清除播放列表
          </button>
        </div>
      )}
    </div>
  );
};
