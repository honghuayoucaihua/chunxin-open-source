// 全局音频管理器 - 支持后台播放

type AudioEventData = unknown;
type AudioEventCallback = (event: string, data?: AudioEventData) => void;

class GlobalAudioManager {
  private audio: HTMLAudioElement;
  private listeners: Set<AudioEventCallback> = new Set();
  private _currentUrl: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener('timeupdate', () => {
      this.notify('timeupdate', { currentTime: this.audio.currentTime });
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.notify('loadedmetadata', { duration: this.audio.duration });
    });
    this.audio.addEventListener('ended', () => {
      this.notify('ended');
    });
    this.audio.addEventListener('play', () => {
      this.notify('play');
    });
    this.audio.addEventListener('pause', () => {
      this.notify('pause');
    });
    this.audio.addEventListener('error', (e) => {
      this.notify('error', e);
    });
  }

  subscribe(callback: AudioEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(event: string, data?: AudioEventData) {
    this.listeners.forEach(cb => cb(event, data));
  }

  get currentTime(): number {
    return this.audio.currentTime || 0;
  }

  get duration(): number {
    return this.audio.duration || 0;
  }

  get isPlaying(): boolean {
    return !this.audio.paused;
  }

  get currentUrl(): string | null {
    return this._currentUrl;
  }

  setSrc(url: string) {
    if (this.audio.src !== url) {
      this.audio.src = url;
      this._currentUrl = url;
    }
  }

  play(): Promise<void> {
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  setCurrentTime(time: number) {
    this.audio.currentTime = time;
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this._currentUrl = null;
  }
}

// 单例实例
export const globalAudioManager = new GlobalAudioManager();
