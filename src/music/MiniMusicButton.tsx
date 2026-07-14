import React, { useEffect, useRef, useState } from 'react';
import type { MusicState } from './MusicSubPages';
import { globalAudioManager } from '../services/globalAudio';

export const MiniMusicButton: React.FC<{
  musicState: MusicState;
  onClick: () => void;
}> = ({ musicState, onClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState({ y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);

  useEffect(() => {
    const syncState = () => {
      setIsPlaying(globalAudioManager.isPlaying);
    };
    syncState();
    const unsubscribe = globalAudioManager.subscribe((event) => {
      if (event === 'play') setIsPlaying(true);
      if (event === 'pause') setIsPlaying(false);
    });
    const checkInterval = window.setInterval(syncState, 1000);
    return () => {
      unsubscribe();
      window.clearInterval(checkInterval);
    };
  }, []);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: clientY, startPos: position.y };
    setIsDragging(true);
  };

  const handleDragMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragRef.current.startY;
    const newY = Math.max(60, Math.min(window.innerHeight - 100, dragRef.current.startPos + deltaY));
    setPosition({ y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove);
    window.addEventListener('touchend', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  if (!isPlaying) return null;

  const currentTrack = musicState.queue[musicState.currentIndex];

  return (
    <div className="fixed right-2 z-50 touch-none" style={{ top: position.y }}>
      <div
        className="w-12 h-12 rounded-full shadow-lg cursor-grab active:cursor-grabbing overflow-hidden music-album-cover-shell"
        style={{ backgroundColor: 'var(--bg-elevated)', boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.2)' }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={() => !isDragging && onClick()}
      >
        {currentTrack?.cover ? (
          <img src={currentTrack.cover} loading="lazy" decoding="async" className="w-full h-full object-cover music-album-cover-img" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <i className="fa-solid fa-music text-sm" style={{ color: 'var(--text-tertiary)' }}></i>
          </div>
        )}

        <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <span className="w-0.5 h-1.5 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ backgroundColor: 'var(--app-accent-color)' }}></span>
          <span className="w-0.5 h-2.5 rounded-full animate-[bounce_0.6s_ease-in-out_0.15s_infinite]" style={{ backgroundColor: 'var(--app-accent-color)' }}></span>
          <span className="w-0.5 h-1.5 rounded-full animate-[bounce_0.6s_ease-in-out_0.3s_infinite]" style={{ backgroundColor: 'var(--app-accent-color)' }}></span>
        </div>
      </div>
    </div>
  );
};
