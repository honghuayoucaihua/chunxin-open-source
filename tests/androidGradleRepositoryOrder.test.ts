import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsSource = readFileSync(new URL('../android/settings.gradle', import.meta.url), 'utf8');
const buildSource = readFileSync(new URL('../android/build.gradle', import.meta.url), 'utf8');

const assertOfficialBeforeAliyun = (source: string, label: string) => {
  const googleIndex = source.indexOf('google()');
  const centralIndex = source.indexOf('mavenCentral()');
  const aliyunGoogleIndex = source.indexOf("maven { url 'https://maven.aliyun.com/repository/google' }");

  assert.notEqual(googleIndex, -1, `${label} 应包含 google() 仓库`);
  assert.notEqual(centralIndex, -1, `${label} 应包含 mavenCentral() 仓库`);
  assert.notEqual(aliyunGoogleIndex, -1, `${label} 应保留阿里云镜像仓库配置`);
  assert.ok(googleIndex < aliyunGoogleIndex, `${label} 中 google() 必须位于阿里云镜像之前，避免 CI 优先命中镜像`);
  assert.ok(centralIndex < aliyunGoogleIndex, `${label} 中 mavenCentral() 必须位于阿里云镜像之前，避免 CI 优先命中镜像`);
};

assertOfficialBeforeAliyun(settingsSource, 'android/settings.gradle');
assertOfficialBeforeAliyun(buildSource, 'android/build.gradle');

console.log('测试通过：Android Gradle 仓库顺序已调整为官方源优先，避免 CI 因阿里云镜像故障而失败。');
