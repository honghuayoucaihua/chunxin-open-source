import assert from 'node:assert/strict';
import {
  createClosedApkUpdateDialogState,
  resolveApkAutoCheckSkipReason
} from '../src/services/apkUpdateFlowControl.ts';

{
  const skipReason = resolveApkAutoCheckSkipReason({
    now: 20_000,
    lastStartedAt: 1_000,
    minGapMs: 5_000,
    isChecking: false,
    hasVisibleDialog: true,
    isDownloading: false
  });

  assert.equal(skipReason, 'dialog-open', '更新弹窗已展示时应停止自动检查，避免重复打更新接口');
}

{
  const skipReason = resolveApkAutoCheckSkipReason({
    now: 20_000,
    lastStartedAt: 1_000,
    minGapMs: 5_000,
    isChecking: false,
    hasVisibleDialog: true,
    isDownloading: true
  });

  assert.equal(skipReason, 'downloading', '下载进行中应优先跳过自动检查，避免覆盖当前下载状态');
}

{
  const nextState = createClosedApkUpdateDialogState();

  assert.deepEqual(nextState, {
    showDialog: false,
    info: null,
    progress: null,
    isDownloading: false
  }, '关闭更新弹窗时应一次性清空展示与下载状态，避免残留旧版本信息');
}

{
  const skipReason = resolveApkAutoCheckSkipReason({
    now: 60 * 60 * 1000,
    lastStartedAt: 0,
    minGapMs: 5_000,
    lastAutoCheckedAt: 30 * 60 * 1000,
    autoCheckCacheMs: 6 * 60 * 60 * 1000,
    isChecking: false,
    hasVisibleDialog: false,
    isDownloading: false
  });

  assert.equal(skipReason, 'recently-checked', '自动更新最近已经检查过时应跳过，减少后台 Worker 请求');
}

console.log('测试通过：APK 更新自动检查守卫与弹窗关闭收尾已稳定覆盖。');
