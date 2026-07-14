export type MusicSource = 'netease' | 'kuwo' | 'joox' | 'bilibili';
export type PlayMode = 'sequence' | 'loop' | 'single' | 'shuffle';

export type SearchTrack = {
  id: string;
  name: string;
  artist?: string | string[];
  album?: string;
  pic_id?: string;
  lyric_id?: string;
  source?: string;
};

export type PlayerTrack = {
  id: string;
  name: string;
  artist: string;
  album: string;
  source: string;
  picId?: string;
  cover?: string;
  url?: string;
  isLocal?: boolean;
  lyric?: string;
  audioDataId?: string;
};

export type MusicState = {
  queue: PlayerTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  joinedIds: string[];
  togetherStartAt: number | null;
  togetherElapsed: number;
  togetherMode: 'together' | 'distance';
  distanceKm: number;
  audioUrl: string | null;
  playMode: PlayMode;
};

const LOCAL_MUSIC_DB_NAME = 'localMusicDB';
const LOCAL_MUSIC_STORE_NAME = 'audioFiles';

const openLocalMusicDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_MUSIC_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(LOCAL_MUSIC_STORE_NAME)) {
        db.createObjectStore(LOCAL_MUSIC_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveAudioToDB = async (id: string, audioBlob: Blob): Promise<void> => {
  const db = await openLocalMusicDB();
  return new Promise((resolve, reject) => {
    const closeDb = () => {
      try {
        db.close();
      } catch {
        // ignore close failures
      }
    };
    const tx = db.transaction(LOCAL_MUSIC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(LOCAL_MUSIC_STORE_NAME);
    let requestError: unknown = null;
    const request = store.put({ id, blob: audioBlob, timestamp: Date.now() });
    request.onerror = () => {
      requestError = request.error;
    };
    tx.oncomplete = () => {
      closeDb();
      resolve();
    };
    tx.onerror = () => {
      closeDb();
      reject(tx.error || requestError || request.error);
    };
    tx.onabort = () => {
      closeDb();
      reject(tx.error || requestError || request.error || new Error('保存本地音乐已中断'));
    };
  });
};

export const getAudioFromDB = async (id: string): Promise<Blob | null> => {
  const db = await openLocalMusicDB();
  return new Promise((resolve, reject) => {
    const closeDb = () => {
      try {
        db.close();
      } catch {
        // ignore close failures
      }
    };
    const tx = db.transaction(LOCAL_MUSIC_STORE_NAME, 'readonly');
    const store = tx.objectStore(LOCAL_MUSIC_STORE_NAME);
    let result: Blob | null = null;
    let requestError: unknown = null;
    const request = store.get(id);
    request.onsuccess = () => {
      result = request.result?.blob || null;
    };
    request.onerror = () => {
      requestError = request.error;
    };
    tx.oncomplete = () => {
      closeDb();
      resolve(result);
    };
    tx.onerror = () => {
      closeDb();
      reject(tx.error || requestError || request.error);
    };
    tx.onabort = () => {
      closeDb();
      reject(tx.error || requestError || request.error || new Error('读取本地音乐已中断'));
    };
  });
};

export const deleteAudioFromDB = async (id: string): Promise<void> => {
  const db = await openLocalMusicDB();
  return new Promise((resolve, reject) => {
    const closeDb = () => {
      try {
        db.close();
      } catch {
        // ignore close failures
      }
    };
    const tx = db.transaction(LOCAL_MUSIC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(LOCAL_MUSIC_STORE_NAME);
    let requestError: unknown = null;
    const request = store.delete(id);
    request.onerror = () => {
      requestError = request.error;
    };
    tx.oncomplete = () => {
      closeDb();
      resolve();
    };
    tx.onerror = () => {
      closeDb();
      reject(tx.error || requestError || request.error);
    };
    tx.onabort = () => {
      closeDb();
      reject(tx.error || requestError || request.error || new Error('删除本地音乐已中断'));
    };
  });
};

export const getLocalAudioUrl = async (audioDataId: string): Promise<string | null> => {
  try {
    const blob = await getAudioFromDB(audioDataId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  } catch {
    return null;
  }
  return null;
};

export const MUSIC_API = '';
export const PLAYLIST_STORAGE_KEY = 'music_playlist_data';
export const MUSIC_REQUEST_TIMEOUT_MS = 12000;

export const fetchMusicJson = async (url: string, timeoutMs = MUSIC_REQUEST_TIMEOUT_MS): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new Error(`Music API timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Music API HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const safeArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export const normalizeArtist = (artist: string | string[] | undefined) => {
  if (!artist) return '未知歌手';
  if (Array.isArray(artist)) return artist.join(' / ');
  return String(artist);
};

export const normalizeSearchTrack = (
  item: SearchTrack,
  index: number,
  fallbackSource: MusicSource
): PlayerTrack => ({
  id: String(item.id || `${Date.now()}-${index}`),
  name: String(item.name || '未知歌曲'),
  artist: normalizeArtist(item.artist),
  album: String(item.album || '未知专辑'),
  source: String(item.source || fallbackSource),
  picId: item.pic_id
});

export const searchMusicTracks = async (
  source: MusicSource,
  keyword: string
): Promise<PlayerTrack[]> => {
  try {
    const params = new URLSearchParams({
      types: 'search',
      source,
      name: keyword,
      count: '12',
      pages: '1'
    });
    const data = await fetchMusicJson(`${MUSIC_API}?${params.toString()}`);
    const list = safeArray(data) as SearchTrack[];
    return list.map((item, index) => normalizeSearchTrack(item, index, source));
  } catch (error) {
    console.warn('[Music] 搜索音乐失败:', error);
    return [];
  }
};

export const resolveMusicTrackUrl = async (
  source: MusicSource,
  track: PlayerTrack
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      types: 'url',
      source: track.source || source,
      id: track.id,
      br: '320'
    });
    const data = await fetchMusicJson(`${MUSIC_API}?${params.toString()}`);
    return String(data?.url || '');
  } catch (error) {
    console.warn('[Music] 获取音乐 URL 失败:', error);
    return '';
  }
};

export const resolveMusicTrackCover = async (
  source: MusicSource,
  track: PlayerTrack
): Promise<string> => {
  try {
    if (!track.picId) return '';
    const params = new URLSearchParams({
      types: 'pic',
      source: track.source || source,
      id: track.picId,
      size: '500'
    });
    const data = await fetchMusicJson(`${MUSIC_API}?${params.toString()}`);
    return String(data?.url || '');
  } catch (error) {
    console.warn('[Music] 获取封面失败:', error);
    return '';
  }
};

export const fetchMusicTrackLyric = async (
  source: MusicSource,
  trackId: string
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      types: 'lrc',
      source,
      id: trackId
    });
    const data = await fetchMusicJson(`${MUSIC_API}?${params.toString()}`);
    return String(data?.lrc || data?.lyric || '');
  } catch (error) {
    console.warn('[Music] 获取歌词失败:', error);
    return '';
  }
};

export const formatTogetherTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec <= 0) return '0分钟';
  const totalMinutes = Math.floor(sec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  if (hours > 0) {
    return `${hours}小时`;
  }
  return `${minutes}分钟`;
};

export const secToTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec <= 0) return '00:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const parseLyric = (lrc: string): { time: number; text: string }[] => {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result: { time: number; text: string }[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        for (const match of matches) {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const ms = parseInt(match[3], 10);
          const time = min * 60 + sec + ms / (match[3].length === 3 ? 1000 : 100);
          result.push({ time, text });
        }
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
};

export const getCurrentLyricIndex = (lyrics: { time: number; text: string }[], currentTime: number): number => {
  if (!lyrics.length) return -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (lyrics[i].time <= currentTime) return i;
  }
  return 0;
};

export const loadPersistedPlaylist = (): { queue: PlayerTrack[]; currentIndex: number } => {
  try {
    const saved = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { queue: parsed.queue || [], currentIndex: parsed.currentIndex || 0 };
    }
  } catch {
    return { queue: [], currentIndex: 0 };
  }
  return { queue: [], currentIndex: 0 };
};

export const persistPlaylistFromMusicState = (musicState: Partial<MusicState> | null | undefined): void => {
  const queue = Array.isArray(musicState?.queue) ? musicState.queue : [];
  const currentIndex = Number.isFinite(Number(musicState?.currentIndex)) ? Number(musicState?.currentIndex) : 0;
  savePersistedPlaylist(queue, currentIndex);
};

export const savePersistedPlaylist = (queue: PlayerTrack[], currentIndex: number) => {
  try {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify({ queue, currentIndex }));
  } catch {
    return;
  }
};
