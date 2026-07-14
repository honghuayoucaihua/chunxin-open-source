import React, { useRef, useState } from 'react';
import { globalAudioManager } from '../services/globalAudio';
import { getAudioFromDB, saveAudioToDB } from './musicCommon';
import type { MusicState, PlayerTrack } from './musicCommon';

export type LocalMusicModalState = {
  visible: boolean;
  file: File | null;
  name: string;
  artist: string;
  cover: string;
  coverFile: File | null;
};

export const initialLocalMusicModalState: LocalMusicModalState = {
  visible: false,
  file: null,
  name: '',
  artist: '本地歌手',
  cover: '',
  coverFile: null
};

export const LocalMusicModal: React.FC<{
  modalState: LocalMusicModalState;
  setModalState: React.Dispatch<React.SetStateAction<LocalMusicModalState>>;
  queue: PlayerTrack[];
  joinedIds: string[];
  togetherStartAt: number | null;
  onMusicStateChange?: (state: Partial<MusicState>) => void;
  onBack: () => void;
  onBackToMusic?: () => void;
}> = ({ modalState, setModalState, queue, joinedIds, togetherStartAt, onMusicStateChange, onBack, onBackToMusic }) => {
  const coverRef = useRef<HTMLInputElement>(null);
  const [savingMusic, setSavingMusic] = useState(false);

  // 选择封面图片
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setModalState(prev => ({
        ...prev,
        cover: reader.result as string,
        coverFile: file
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 确认上传本地音乐
  const handleConfirmUpload = async () => {
    const { file, name, artist, cover, coverFile } = modalState;
    if (!file) return;

    setSavingMusic(true);

    try {
      // 生成唯一 ID
      const audioDataId = `local-audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 将音频文件保存到 IndexedDB
      await saveAudioToDB(audioDataId, file);

      // 如果有封面图片，也保存到 IndexedDB
      let coverDataId: string | undefined;
      if (coverFile) {
        coverDataId = `local-cover-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await saveAudioToDB(coverDataId, coverFile);
      }

      // 创建 track 对象
      const localTrack: PlayerTrack = {
        id: `local-${Date.now()}`,
        name: name || file.name.replace(/\.[^.]+$/, '') || '本地音频',
        artist: artist || '本地歌手',
        album: '本地上传',
        source: 'local',
        isLocal: true,
        audioDataId,
        cover: cover || undefined,
      };

      // 从 IndexedDB 获取音频并创建 blob URL
      const audioBlob = await getAudioFromDB(audioDataId);
      if (!audioBlob) {
        console.warn('[LocalMusic] 无法从 IndexedDB 读取音频:', audioDataId);
        return;
      }
      localTrack.url = URL.createObjectURL(audioBlob);

      // 本地文件直接添加到队列并播放
      const newQueue = [...queue, localTrack];
      const newIndex = newQueue.length - 1;

      if (onMusicStateChange) {
        onMusicStateChange({ queue: newQueue, currentIndex: newIndex, isPlaying: true });
      }

      if (localTrack.url) {
        globalAudioManager.setSrc(localTrack.url);
        globalAudioManager.play().catch(() => {});
      }

      if (joinedIds.length > 0 && !togetherStartAt) {
        if (onMusicStateChange) {
          onMusicStateChange({ togetherStartAt: Date.now() });
        }
      }

      // 关闭模态窗
      setModalState({
        visible: false,
        file: null,
        name: '',
        artist: '本地歌手',
        cover: '',
        coverFile: null
      });

      // 返回到听音乐主界面
      if (onBackToMusic) {
        onBackToMusic();
      } else {
        onBack();
      }
    } catch (error) {
      console.error('保存本地音乐失败:', error);
    } finally {
      setSavingMusic(false);
    }
  };

  if (!modalState.visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-[90%] max-w-[360px] app-surface-panel app-surface-panel--music-card overflow-hidden shadow-xl">
          <div className="app-surface-header">
            <div className="text-base font-medium text-center render-text-primary">编辑音乐信息</div>
          </div>

          <div className="p-4 space-y-4">
            {/* 封面图片 */}
            <div className="flex justify-center">
              <div
                className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed render-border hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                onClick={() => coverRef.current?.click()}
              >
                {modalState.cover ? (
                  <img src={modalState.cover} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center render-text-tertiary">
                    <i className="fa-solid fa-image text-2xl"></i>
                    <div className="text-xs mt-1">添加封面</div>
                  </div>
                )}
              </div>
            </div>

            {/* 歌曲名称 */}
            <div>
              <label className="text-xs render-text-secondary mb-1 block">歌曲名称</label>
              <input
                type="text"
                value={modalState.name}
                onChange={(e) => setModalState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入歌曲名称"
                className="app-field-input app-field-input--pill w-full px-3 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* 歌手名 */}
            <div>
              <label className="text-xs render-text-secondary mb-1 block">歌手名</label>
              <input
                type="text"
                value={modalState.artist}
                onChange={(e) => setModalState(prev => ({ ...prev, artist: e.target.value }))}
                placeholder="输入歌手名"
                className="app-field-input app-field-input--pill w-full px-3 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* 文件信息 */}
            <div className="text-xs render-text-tertiary text-center">
              {modalState.file && (
                <span>文件: {modalState.file.name}</span>
              )}
            </div>
          </div>

          <div className="app-surface-footer">
            <button
              className="app-button app-button-muted app-footer-button text-sm"
              onClick={() => setModalState(prev => ({ ...prev, visible: false }))}
              disabled={savingMusic}
            >
              取消
            </button>
            <button
              className="app-button app-button-primary app-footer-button text-sm font-medium"
              style={savingMusic ? { opacity: 0.6 } : undefined}
              onClick={handleConfirmUpload}
              disabled={savingMusic}
            >
              {savingMusic ? '保存中...' : '确认添加'}
            </button>
          </div>
        </div>
      </div>

      {/* 封面图片选择 */}
      <input
        ref={coverRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleCoverSelect}
      />
    </>
  );
};
