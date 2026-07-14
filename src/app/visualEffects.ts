export type RainDrop = {
  id: number;
  left: string;
  delay: string;
  duration: string;
  opacity: number;
};

export type SnowFlake = {
  id: number;
  left: string;
  size: string;
  delay: string;
  duration: string;
  drift: string;
  opacity: number;
};

export type ThunderFlash = {
  id: number;
  delay: string;
  duration: string;
  intensity: number;
  x: string;
};

const RAIN_COUNT = 64;
const SNOW_COUNT = 40;
const THUNDER_COUNT = 12;

export const createRainDrops = (): RainDrop[] =>
  Array.from({ length: RAIN_COUNT }).map((_, idx) => ({
    id: idx,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2.4}s`,
    duration: `${0.8 + Math.random() * 1.1}s`,
    opacity: 0.35 + Math.random() * 0.45
  }));

export const createSnowFlakes = (): SnowFlake[] =>
  Array.from({ length: SNOW_COUNT }).map((_, idx) => ({
    id: idx,
    left: `${Math.random() * 100}%`,
    size: `${3 + Math.random() * 4}px`,
    delay: `${Math.random() * 4}s`,
    duration: `${4.8 + Math.random() * 4.4}s`,
    drift: `${-12 + Math.random() * 24}px`,
    opacity: 0.45 + Math.random() * 0.45
  }));

export const createThunderFlashes = (): ThunderFlash[] =>
  Array.from({ length: THUNDER_COUNT }).map((_, idx) => ({
    id: idx,
    delay: `${Math.random() * 8}s`,
    duration: `${12 + Math.random() * 12}s`,
    intensity: 0.45 + Math.random() * 0.5,
    x: `${10 + Math.random() * 80}%`
  }));
