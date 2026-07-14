import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { globalAudioManager } from '../../services/globalAudio';
import {
  getAudioFromDB,
  getCurrentLyricIndex,
  parseLyric,
  saveAudioToDB,
  savePersistedPlaylist,
  loadPersistedPlaylist,
  resolveMusicTrackCover,
  resolveMusicTrackUrl,
  fetchMusicTrackLyric
} from '../musicCommon';
import type { MusicSource, MusicState, PlayMode, PlayerTrack } from '../musicCommon';
import {
  bumpMusicRuntimeResetEpoch,
  captureMusicRuntimeResetEpoch,
  isMusicRuntimeResetEpochStale
} from '../../services/musicRuntimeResetGuard.ts';
import { revokeBlobUrls, revokeMusicBlobUrls } from '../musicBlobUrlCleanup.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readAudioEventNumber = (data: unknown, key: string): number | null => {
  if (!isRecord(data)) return null;
  const parsed = Number(data[key]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const useMusicPlayer = (
  musicState: MusicState | undefined,
  onMusicStateChange: ((state: Partial<MusicState>) => void) | undefined
) => {
  // 从持久化存储恢复播放列表
  const persistedData = useMemo(() => loadPersistedPlaylist(), []);

  const [queue, setQueue] = useState<PlayerTrack[]>(musicState?.queue?.length ? musicState.queue : persistedData.queue);
  const [currentIndex, setCurrentIndex] = useState(musicState?.queue?.length ? musicState.currentIndex : persistedData.currentIndex);
  const [isPlaying, setIsPlaying] = useState(musicState?.isPlaying || false);
  const [currentTime, setCurrentTime] = useState(musicState?.currentTime || 0);
  const [duration, setDuration] = useState(musicState?.duration || 0);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>(musicState?.joinedIds || []);
  const [togetherStartAt, setTogetherStartAt] = useState<number | null>(musicState?.togetherStartAt || null);
  const [togetherElapsed, setTogetherElapsed] = useState(musicState?.togetherElapsed || 0);
  const [togetherMode, setTogetherMode] = useState<'together' | 'distance'>(musicState?.togetherMode || 'together');
  const [distanceKm, setDistanceKm] = useState<number>(musicState?.distanceKm || 0);
  const [distanceInput, setDistanceInput] = useState(String(musicState?.distanceKm || ''));
  const [clockNow, setClockNow] = useState(Date.now());
  const [playMode, setPlayMode] = useState<PlayMode>(musicState?.playMode || 'sequence');
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const lyricRef = useRef<HTMLDivElement>(null);
  const lyricRequestSeqRef = useRef(0);
  const restoreQueueRequestSeqRef = useRef(0);
  const latestTrackIdRef = useRef<string>('');

  const currentTrack = queue[currentIndex] || null;
  const latestQueueRef = useRef(queue);
  latestQueueRef.current = queue;

  useEffect(() => {
    latestTrackIdRef.current = String(currentTrack?.id || '');
  }, [currentTrack?.id]);

  const resolveTrackSource = (track: PlayerTrack): MusicSource => {
    const candidate = String(track.source || '').trim();
    if (candidate === 'kuwo' || candidate === 'joox' || candidate === 'bilibili') return candidate;
    return 'netease';
  };

  const resolvePlayableTrack = async (track: PlayerTrack, epoch: number): Promise<PlayerTrack | null> => {
    if (track.isLocal) {
      const localUrl = track.url || '';
      return localUrl ? { ...track, url: localUrl } : null;
    }
    const resolvedSource = resolveTrackSource(track);
    const url = await resolveMusicTrackUrl(resolvedSource, track);
    if (isMusicRuntimeResetEpochStale(epoch)) return null;
    if (!url) return null;
    let cover = track.cover || '';
    if (!cover) {
      cover = await resolveMusicTrackCover(resolvedSource, track);
      if (isMusicRuntimeResetEpochStale(epoch)) return null;
    }
    return { ...track, url, cover };
  };

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

  // 恢复本地音乐的 URL（从 IndexedDB 加载）
  useEffect(() => {
    const restoreLocalMusicUrls = async () => {
      const requestId = restoreQueueRequestSeqRef.current + 1;
      restoreQueueRequestSeqRef.current = requestId;
      const epoch = captureMusicRuntimeResetEpoch();
      const queueSnapshot = queue;
      const createdBlobUrls: string[] = [];
      let needsUpdate = false;
      const updatedQueue = await Promise.all(queue.map(async (track) => {
        if (track.isLocal && track.audioDataId && (!track.url || track.url.startsWith('blob:'))) {
          const audioBlob = await getAudioFromDB(track.audioDataId);
          if (audioBlob) {
            needsUpdate = true;
            const url = URL.createObjectURL(audioBlob);
            createdBlobUrls.push(url);
            return { ...track, url };
          }
        }
        return track;
      }));

      if (needsUpdate) {
        if (isMusicRuntimeResetEpochStale(epoch) || restoreQueueRequestSeqRef.current !== requestId) {
          revokeBlobUrls(createdBlobUrls);
          return;
        }
        setQueue(prev => (prev === queueSnapshot ? updatedQueue : prev));
      }
    };

    if (queue.some(track => track.isLocal && track.audioDataId && (!track.url || track.url.startsWith('blob:')))) {
      restoreLocalMusicUrls();
    }
  }, [queue]);

  useEffect(() => {
    if (queue.length > 0) {
      const isAudioPlaying = globalAudioManager.isPlaying;
      const audioTime = globalAudioManager.currentTime;
      const audioDuration = globalAudioManager.duration;

      if (isAudioPlaying !== isPlaying) setIsPlaying(isAudioPlaying);
      if (audioTime > 0 && Math.abs(audioTime - currentTime) > 1) setCurrentTime(audioTime);
      if (audioDuration > 0 && audioDuration !== duration) setDuration(audioDuration);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = globalAudioManager.subscribe((event, data) => {
      switch (event) {
        case 'timeupdate': {
          const nextTime = readAudioEventNumber(data, 'currentTime');
          if (nextTime !== null) setCurrentTime(nextTime);
          break;
        }
        case 'loadedmetadata': {
          const nextDuration = readAudioEventNumber(data, 'duration');
          if (nextDuration !== null) setDuration(nextDuration);
          break;
        }
        case 'ended':
          handleTrackEnded();
          break;
        case 'play':
          setIsPlaying(true);
          break;
        case 'pause':
          setIsPlaying(false);
          if (togetherStartAt && joinedIds.length > 0) {
            const sessionTime = Math.floor((Date.now() - togetherStartAt) / 1000);
            setTogetherElapsed(prev => prev + sessionTime);
            setTogetherStartAt(null);
          }
          break;
      }
    });
    return unsubscribe;
  }, [queue, currentIndex, playMode, togetherStartAt, joinedIds]);

  const handleTrackEnded = useCallback(() => {
    if (queue.length === 0) return;

    let nextIndex = currentIndex;

    switch (playMode) {
      case 'single':
        break;
      case 'loop':
        nextIndex = currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'shuffle':
        nextIndex = Math.floor(Math.random() * queue.length);
        break;
      default:
        if (currentIndex >= queue.length - 1) {
          setIsPlaying(false);
          return;
        }
        nextIndex = currentIndex + 1;
    }

    setCurrentIndex(nextIndex);
    const nextTrack = queue[nextIndex];
    if (nextTrack?.url) {
      globalAudioManager.setSrc(nextTrack.url);
      globalAudioManager.play().catch(() => {});
    }
  }, [queue, currentIndex, playMode]);

  useEffect(() => {
    if (onMusicStateChange) {
      onMusicStateChange({
        queue,
        currentIndex,
        isPlaying,
        currentTime,
        duration,
        joinedIds,
        togetherStartAt,
        togetherElapsed,
        togetherMode,
        distanceKm,
        audioUrl: currentTrack?.url || null,
        playMode
      });
    }
  }, [queue, currentIndex, isPlaying, currentTime, duration, joinedIds, togetherStartAt, togetherElapsed, togetherMode, distanceKm, currentTrack?.url, playMode]);

  // 持久化播放列表
  useEffect(() => {
    savePersistedPlaylist(queue, currentIndex);
  }, [queue, currentIndex]);

  useEffect(() => {
    if (currentTrack?.url) {
      const audioUrl = globalAudioManager.currentUrl;
      if (audioUrl !== currentTrack.url) {
        globalAudioManager.setSrc(currentTrack.url);
        if (isPlaying) {
          globalAudioManager.play().catch(() => setIsPlaying(false));
        }
      }
    }
    if (currentTrack && !currentTrack.isLocal) {
      void fetchLyric(currentTrack);
    } else {
      lyricRequestSeqRef.current += 1;
      setLyrics([]);
    }
  }, [currentTrack?.url, currentTrack?.id]);

  const fetchLyric = async (track: PlayerTrack) => {
    const requestId = lyricRequestSeqRef.current + 1;
    lyricRequestSeqRef.current = requestId;
    const epoch = captureMusicRuntimeResetEpoch();
    const trackId = String(track.id || '');
    try {
      const lrc = await fetchMusicTrackLyric(resolveTrackSource(track), track.id);
      if (isMusicRuntimeResetEpochStale(epoch)) return;
      if (lyricRequestSeqRef.current !== requestId) return;
      if (latestTrackIdRef.current !== trackId) return;
      setLyrics(parseLyric(lrc));
    } catch {
      if (isMusicRuntimeResetEpochStale(epoch)) return;
      if (lyricRequestSeqRef.current !== requestId) return;
      if (latestTrackIdRef.current !== trackId) return;
      setLyrics([]);
    }
  };

  useEffect(() => {
    if (isPlaying && currentTrack?.url) {
      globalAudioManager.play().catch(() => setIsPlaying(false));
    }
  }, []);

  useEffect(() => {
    // 前一个队列的引用（在 cleanup 时 latestQueueRef.current 已更新为新队列）
    const prevQueue = queue;
    return () => {
      const currentQueue = latestQueueRef.current;
      const keepUrls = new Set(currentQueue.map((item) => item.url || '').filter(Boolean));
      revokeMusicBlobUrls(prevQueue, keepUrls);
    };
  }, [queue]);

  useEffect(() => () => {
    revokeMusicBlobUrls(latestQueueRef.current);
  }, []);

  useEffect(() => {
    if (lyricRef.current && showLyrics) {
      const activeIndex = getCurrentLyricIndex(lyrics, currentTime);
      const activeElement = lyricRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, lyrics, showLyrics]);

  const addToQueue = async (track: PlayerTrack) => {
    const epoch = captureMusicRuntimeResetEpoch();
    const normalized = await resolvePlayableTrack(track, epoch);
    if (isMusicRuntimeResetEpochStale(epoch)) return;
    if (!normalized) return;
    setQueue(prev => [...prev, normalized]);
  };

  const playTrack = async (track: PlayerTrack, append = true) => {
    const epoch = captureMusicRuntimeResetEpoch();
    const normalized = await resolvePlayableTrack(track, epoch);
    if (isMusicRuntimeResetEpochStale(epoch)) return;
    if (!normalized?.url) return;

    if (!append) {
      setQueue([normalized]);
      setCurrentIndex(0);
    } else {
      setQueue((prev) => {
        const next = [...prev, normalized];
        setCurrentIndex(next.length - 1);
        return next;
      });
    }

    setIsPlaying(true);
    globalAudioManager.setSrc(normalized.url);
    globalAudioManager.play().catch(() => setIsPlaying(false));

    if (joinedIds.length > 0 && !togetherStartAt) {
      setTogetherStartAt(Date.now());
    }
  };

  const handleInvite = () => {
    if (selectedInviteIds.length === 0) return;
    const isNewPerson = !joinedIds.includes(selectedInviteIds[0]);
    if (isNewPerson) {
      setTogetherStartAt(null);
      setTogetherElapsed(0);
    }
    setJoinedIds(selectedInviteIds.slice(0, 1));
    if (currentTrack && isPlaying) {
      setTogetherStartAt(Date.now());
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    const audioDataId = `local-audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await saveAudioToDB(audioDataId, file);
    } catch {
      // 保存失败时继续允许临时播放，但不保证重启后可恢复
    }
    const url = URL.createObjectURL(file);
    const localTrack: PlayerTrack = {
      id: `local-${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, '') || '本地音频',
      artist: '本地文件',
      album: '本地上传',
      source: 'local',
      url,
      isLocal: true,
      audioDataId
    };
    playTrack(localTrack, true).catch((error) => {
      console.warn('[MusicPlayer] 播放本地曲目失败:', error);
    });
  };

  const togglePlay = () => {
    if (!currentTrack?.url) return;
    if (isPlaying) {
      setIsPlaying(false);
      globalAudioManager.pause();
    } else {
      setIsPlaying(true);
      globalAudioManager.play().catch(() => setIsPlaying(false));
      if (joinedIds.length > 0 && !togetherStartAt) {
        setTogetherStartAt(Date.now());
      }
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    globalAudioManager.setCurrentTime(time);
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      globalAudioManager.setCurrentTime(0);
      setCurrentTime(0);
      return;
    }
    const next = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    setCurrentIndex(next);
    const prevTrack = queue[next];
    if (prevTrack?.url) {
      globalAudioManager.setSrc(prevTrack.url);
      globalAudioManager.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    let nextIndex: number;
    if (playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;
    }
    setCurrentIndex(nextIndex);
    const nextTrack = queue[nextIndex];
    if (nextTrack?.url) {
      globalAudioManager.setSrc(nextTrack.url);
      globalAudioManager.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(true);
  };

  const cyclePlayMode = () => {
    const modes: PlayMode[] = ['sequence', 'loop', 'single', 'shuffle'];
    const currentModeIndex = modes.indexOf(playMode);
    setPlayMode(modes[(currentModeIndex + 1) % modes.length]);
  };

  const getPlayModeIcon = () => {
    switch (playMode) {
      case 'single': return 'fa-repeat';
      case 'loop': return 'fa-repeat';
      case 'shuffle': return 'fa-shuffle';
      default: return 'fa-list';
    }
  };

  const clearPlaylist = () => {
    bumpMusicRuntimeResetEpoch();
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    globalAudioManager.stop();
    setLyrics([]);
  };

  const currentLyricIndex = getCurrentLyricIndex(lyrics, currentTime);

  return {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    selectedInviteIds,
    joinedIds,
    togetherStartAt,
    togetherElapsed,
    togetherMode,
    distanceKm,
    distanceInput,
    clockNow,
    playMode,
    lyrics,
    showLyrics,
    currentTrack,
    totalTogetherTime,
    currentLyricIndex,

    // Refs
    uploadRef,
    lyricRef,

    // Setters
    setSelectedInviteIds,
    setTogetherMode,
    setDistanceKm,
    setDistanceInput,
    setShowLyrics,

    // Actions
    addToQueue,
    playTrack,
    handleInvite,
    handleUpload,
    togglePlay,
    handleSeek,
    handlePrev,
    handleNext,
    cyclePlayMode,
    getPlayModeIcon,
    clearPlaylist,
  };
};
