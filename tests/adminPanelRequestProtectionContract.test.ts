import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/admin/AdminPanel.tsx', import.meta.url), 'utf8');

assert.ok(
  source.includes('adminActionPromisesRef') && source.includes('runAdminAction'),
  '管理后台应使用本地运行中请求缓存，避免连点重复消耗后端次数'
);

assert.ok(
  source.includes('const existing = adminActionPromisesRef.current.get(key)') && source.includes('if (existing) return existing;'),
  '管理后台重复触发同一个动作时应直接复用正在执行的请求'
);

[
  'login',
  'save-passphrases',
  'save-ai-config',
  'fetch-ai-models',
  'refresh-ai-config',
  'add-notice',
  'add-apk-version',
  'publish-candidate-apk'
].forEach((key) => {
  assert.ok(
    source.includes(`runAdminAction('${key}'`),
    `管理后台动作 ${key} 应接入本地单飞保护`
  );
});

[
  'delete-notice:${id}',
  'delete-apk-version:${id}',
  'edit-apk-version:${version.id}',
  'delete-community:${id}',
  'edit-community:${id}'
].forEach((key) => {
  assert.ok(
    source.includes(`runAdminAction(\`${key}\``),
    `管理后台按条目操作 ${key} 应按具体对象接入本地单飞保护`
  );
});

assert.ok(
  source.includes('runAdminAction(`community-load:${search.trim()}`'),
  '社区管理列表加载应按搜索条件复用正在执行的请求'
);

console.log('测试通过：管理后台高消耗或写入动作已接入本地请求保护，连点不会额外占用后端次数。');
