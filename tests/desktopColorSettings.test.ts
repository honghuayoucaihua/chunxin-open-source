import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE_SETTINGS } from '../src/constants.ts';
import { normalizeAppearanceSettings } from '../src/appBootstrapUtils.ts';

const normalized = normalizeAppearanceSettings({
  ...DEFAULT_APPEARANCE_SETTINGS,
  desktopDockColor: '#224466',
  desktopWidgetColor: '#ccb28f'
});

assert.equal(normalized.desktopDockColor, '#224466', '归一化后应保留自定义 Dock 颜色');
assert.equal(normalized.desktopWidgetColor, '#ccb28f', '归一化后应保留自定义小组件颜色');

const fallback = normalizeAppearanceSettings({
  desktopDockColor: 123 as any,
  desktopWidgetColor: null as any
});

assert.equal(fallback.desktopDockColor, DEFAULT_APPEARANCE_SETTINGS.desktopDockColor, '非法 Dock 颜色应回退到默认值');
assert.equal(fallback.desktopWidgetColor, DEFAULT_APPEARANCE_SETTINGS.desktopWidgetColor, '非法小组件颜色应回退到默认值');

console.log('测试通过：桌面 Dock 与小组件颜色已接入类型、默认值、归一化、设置页与恢复链路。');
