/**
 * 运行时重置纪元（Epoch）通用工厂
 *
 * 用于追踪运行时「重置」事件，让正在进行的异步操作能检测到
 * 自己是在重置之前发起的，从而放弃执行（避免对已重置的状态做操作）。
 *
 * 用法：每个需要独立 epoch 轨道的模块用 createRuntimeEpoch() 创建一套独立函数。
 */

type EpochWindow = Window & Record<string, number | undefined>;

const createRuntimeEpoch = (windowPropertyName: string) => {
  const getWindow = (): EpochWindow | null => (
    typeof window === 'undefined' ? null : window as unknown as EpochWindow
  );

  const getEpoch = (): number => {
    const target = getWindow();
    const raw = Number(target?.[windowPropertyName] || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  };

  const captureEpoch = (): number => getEpoch();

  const bumpEpoch = (): number => {
    const target = getWindow();
    if (!target) return 0;
    const next = getEpoch() + 1;
    target[windowPropertyName] = next;
    return next;
  };

  const isEpochStale = (capturedEpoch: number): boolean => (
    getEpoch() !== capturedEpoch
  );

  return { getEpoch, captureEpoch, bumpEpoch, isEpochStale };
};

export const {
  getEpoch: getRuntimeResetEpoch,
  captureEpoch: captureRuntimeResetEpoch,
  bumpEpoch: bumpRuntimeResetEpoch,
  isEpochStale: isRuntimeResetEpochStale
} = createRuntimeEpoch('__xushuoRuntimeResetEpoch');

export const {
  getEpoch: getAnonymousRuntimeResetEpoch,
  captureEpoch: captureAnonymousRuntimeResetEpoch,
  bumpEpoch: bumpAnonymousRuntimeResetEpoch,
  isEpochStale: isAnonymousRuntimeResetEpochStale
} = createRuntimeEpoch('__xushuoAnonymousRuntimeResetEpoch');

export const {
  getEpoch: getMusicRuntimeResetEpoch,
  captureEpoch: captureMusicRuntimeResetEpoch,
  bumpEpoch: bumpMusicRuntimeResetEpoch,
  isEpochStale: isMusicRuntimeResetEpochStale
} = createRuntimeEpoch('__xushuoMusicRuntimeResetEpoch');
