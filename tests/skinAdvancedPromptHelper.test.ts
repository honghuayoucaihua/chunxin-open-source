import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/settings/skin/AdvancedTab.tsx', import.meta.url), 'utf8');

// 复现：旧版“高级 > 提示词帮手”在折叠分组内又做了一层展开/收起，导致用户需要二次点击才能看到正文。
assert.ok(!source.includes('showPromptHelper'), 'AdvancedTab 不应再维护提示词帮手的二次展开状态');
assert.ok(!source.includes("收起' : '展开"), 'AdvancedTab 不应再渲染提示词帮手的展开/收起按钮');
assert.ok(source.includes('复制提示词'), 'AdvancedTab 应继续保留复制提示词按钮');

console.log('测试通过：高级页提示词帮手不再需要二次折叠。');
