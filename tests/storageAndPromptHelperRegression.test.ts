import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const advancedTabSource = readFileSync(new URL('../src/settings/skin/AdvancedTab.tsx', import.meta.url), 'utf8');
const storageViewSource = readFileSync(new URL('../src/settings/StorageSettingsView.tsx', import.meta.url), 'utf8');

// 复现：提示词帮手显式写出“不要修改聊天气泡样式...”，会反向提示 AI 去猜测气泡类名。
assert.ok(!advancedTabSource.includes('不要修改聊天气泡样式'), 'AdvancedTab 提示词不应再包含“不要修改聊天气泡样式”文案');

// 复现：导出弹层内容过多时，底部“导出所选”按钮会被内容区挤压或遮挡。
const sheetLayoutMatches = storageViewSource.match(/app-surface-panel app-sheet overflow-hidden flex flex-col/g) || [];
assert.ok(sheetLayoutMatches.length >= 4, '四个导出弹层都应使用纵向 flex 布局，确保底部操作区固定');
const scrollAreaMatches = storageViewSource.match(/flex-1 min-h-0 overflow-y-auto pb-\[calc\(var\(--safe-bottom\)\+8px\)\]/g) || [];
assert.ok(scrollAreaMatches.length >= 4, '四个导出列表都应使用可收缩滚动区，并给底部安全区留白');

console.log('测试通过：提示词文案与导出弹层布局符合预期。');
