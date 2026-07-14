import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const srcDir = fileURLToPath(new URL('../src', import.meta.url));
const helperPath = join(srcDir, 'utils', 'wechatDialog.ts');
const effectsPath = join(srcDir, 'hooks', 'useAppCoreEffects.ts');
const helperSource = readFileSync(helperPath, 'utf8');
const effectsSource = readFileSync(effectsPath, 'utf8');

const collectFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = join(dir, entry.name);
  if (entry.isDirectory()) {
    return collectFiles(fullPath);
  }
  return fullPath;
});

assert.match(helperSource, /export type WechatDialogBridge = \{/, '微信弹窗桥接应集中导出共享 bridge 类型');
assert.match(helperSource, /export type WechatDialogWindow = Window &/, '微信弹窗桥接应集中导出共享 window 类型');
assert.match(helperSource, /export const getWechatDialogBridge/, '微信弹窗桥接应提供统一读取入口');
assert.match(helperSource, /export const installWechatDialogBridge/, '微信弹窗桥接应提供统一安装入口');
assert.match(helperSource, /export const uninstallWechatDialogBridge/, '微信弹窗桥接应提供统一卸载入口');
assert.match(helperSource, /export const showWechatAlert/, '微信弹窗桥接应提供 alert helper');
assert.match(helperSource, /export const confirmWechatAction/, '微信弹窗桥接应提供 confirm helper');
assert.match(helperSource, /export const promptWechatAction/, '微信弹窗桥接应提供 prompt helper');

assert.match(effectsSource, /installWechatDialogBridge/, 'AppCore 副作用应通过共享 helper 安装微信弹窗桥接');
assert.match(effectsSource, /uninstallWechatDialogBridge/, 'AppCore 副作用应通过共享 helper 卸载微信弹窗桥接');
assert.doesNotMatch(effectsSource, /\.wechatDialog\b/, 'AppCore 副作用不应直接读写 wechatDialog 属性');

const srcFiles = collectFiles(srcDir).filter((filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'));
const propertyAccessFiles = srcFiles.filter((filePath) => {
  if (filePath === helperPath) return false;
  const source = readFileSync(filePath, 'utf8');
  return /\.wechatDialog\b/.test(source);
});

assert.deepEqual(
  propertyAccessFiles,
  [],
  `除共享 helper 外，其它源码文件不应直接访问 wechatDialog 属性：${propertyAccessFiles.map((filePath) => filePath.replace(rootDir, '')).join(', ')}`
);

console.log('测试通过：wechatDialog 桥接已统一收口，属性访问仅保留在共享 helper 内。');
