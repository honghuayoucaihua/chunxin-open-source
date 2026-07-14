import assert from 'node:assert/strict';
import {
  __apkUpdateAutoCheckStorageInternals,
  readLastApkAutoCheckAt,
  saveLastApkAutoCheckAt
} from '../src/services/apkUpdateAutoCheckStorage.ts';
import { resolveApkAutoCheckSkipReason } from '../src/services/apkUpdateFlowControl.ts';

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: () => {
      throw new Error('localStorage unavailable');
    },
    setItem: () => {
      throw new Error('localStorage unavailable');
    }
  }
});

try {
  __apkUpdateAutoCheckStorageInternals.resetMemoryForTest();

  assert.equal(readLastApkAutoCheckAt(), 0, '本地存储不可用且还未检查时，应返回 0');

  saveLastApkAutoCheckAt(10_000);
  assert.equal(
    readLastApkAutoCheckAt(),
    10_000,
    '本地存储不可用时，应用内存记录上次自动更新检查时间'
  );

  const skipReason = resolveApkAutoCheckSkipReason({
    now: 11_000,
    lastStartedAt: 0,
    minGapMs: 500,
    lastAutoCheckedAt: readLastApkAutoCheckAt(),
    autoCheckCacheMs: 6 * 60 * 60 * 1000,
    isChecking: false,
    hasVisibleDialog: false,
    isDownloading: false
  });

  assert.equal(
    skipReason,
    'recently-checked',
    '本地存储不可用时也应跳过短时间内重复的自动更新检查，减少后端请求'
  );
} finally {
  __apkUpdateAutoCheckStorageInternals.resetMemoryForTest();
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
  } else {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}

console.log('测试通过：APK 自动更新检查在本地存储不可用时会用内存兜底，避免重复请求后端。');
