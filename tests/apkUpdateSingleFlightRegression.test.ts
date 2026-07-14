import assert from 'node:assert/strict';
import { createApkUpdateSingleFlightRunner } from '../src/services/apkUpdateSingleFlight.ts';

const flush = () => new Promise((resolve) => setImmediate(resolve));

{
  const run = createApkUpdateSingleFlightRunner();
  let executions = 0;
  let resolveTask: ((value: { success: boolean; fileUri: string }) => void) | null = null;

  const task = () => new Promise<{ success: boolean; fileUri: string }>((resolve) => {
    executions += 1;
    resolveTask = resolve;
  });

  const first = run(task);
  const second = run(task);

  await flush();
  assert.equal(executions, 1, 'APK 安装流程并发触发时应只执行一次，避免重复下载与重复拉起安装器');
  assert.equal(first, second, '并发触发时应复用同一个在飞 Promise');

  resolveTask?.({ success: true, fileUri: 'file:///cache/app.apk' });
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, { success: true, fileUri: 'file:///cache/app.apk' });
  assert.deepEqual(b, { success: true, fileUri: 'file:///cache/app.apk' });
}

{
  const run = createApkUpdateSingleFlightRunner();
  let executions = 0;

  await run(async () => {
    executions += 1;
    return { success: false, error: 'first failed' };
  });
  await run(async () => {
    executions += 1;
    return { success: true, fileUri: 'file:///cache/next.apk' };
  });

  assert.equal(executions, 2, '前一次完成后应允许后续新的 APK 安装流程重新执行');
}

console.log('测试通过：APK 安装流程已具备单飞保护，避免重复下载和重复拉起安装器。');
