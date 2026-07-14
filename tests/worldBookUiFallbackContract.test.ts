import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worldBookViewSource = readFileSync(new URL('../src/settings/WorldBookViews.tsx', import.meta.url), 'utf8');
const storageSettingsSource = readFileSync(new URL('../src/settings/StorageSettingsView.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(
  worldBookViewSource,
  /未命名世界书/,
  '世界书编辑保存不应把空名称补成默认名称'
);

assert.doesNotMatch(
  storageSettingsSource,
  /未命名世界书|worldbook-\$\{idx\}/,
  '世界书导出列表不应为缺 id 或缺名称的条目生成展示/选择兜底'
);

assert.match(
  storageSettingsSource,
  /String\(book\.id \|\| ''\)\.trim\(\) && String\(book\.name \|\| ''\)\.trim\(\)/,
  '世界书导出入口应只列出具有明确 id 和名称的世界书'
);

console.log('测试通过：世界书 UI 和导出入口不再补造默认名称。');
