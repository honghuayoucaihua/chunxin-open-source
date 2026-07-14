type VoiceAudioEvent = 'timeupdate' | 'loadedmetadata' | 'ended' | 'play' | 'pause' | 'error';
type VoiceAudioListener = (event: VoiceAudioEvent) => void;

class VoiceMessageAudioManager {
  private audio: HTMLAudioElement;
  private listeners: Set<VoiceAudioListener> = new Set();
  private activeUrl: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('timeupdate', () => this.emit('timeupdate'));
    this.audio.addEventListener('loadedmetadata', () => this.emit('loadedmetadata'));
    this.audio.addEventListener('ended', () => this.emit('ended'));
    this.audio.addEventListener('play', () => this.emit('play'));
    this.audio.addEventListener('pause', () => this.emit('pause'));
    this.audio.addEventListener('error', () => this.emit('error'));
  }

  subscribe(listener: VoiceAudioListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get currentUrl(): string | null {
    return this.activeUrl;
  }

  get currentTime(): number {
    return this.audio.currentTime || 0;
  }

  get duration(): number {
    return this.audio.duration || 0;
  }

  async playUrl(url: string): Promise<void> {
    const nextUrl = String(url || '').trim();
    if (!nextUrl) throw new Error('语音地址为空');
    if (this.audio.src !== nextUrl) {
      this.audio.src = nextUrl;
      this.activeUrl = nextUrl;
      this.audio.currentTime = 0;
    }
    await this.audio.play();
  }

  private emit(event: VoiceAudioEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const voiceMessageAudioManager = new VoiceMessageAudioManager();
