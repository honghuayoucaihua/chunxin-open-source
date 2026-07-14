import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE_SETTINGS } from '../src/constants.ts';
import { normalizeAppearanceSettings } from '../src/appBootstrapUtils.ts';

const normalized = normalizeAppearanceSettings({
  desktopSystemNavigationMode: 'assistiveTouch',
  desktopSystemNavigationAssistiveTouchSingleTapAction: 'settings',
  desktopSystemNavigationAssistiveTouchDoubleTapAction: 'lock',
  desktopSystemNavigationAssistiveTouchOpacity: 9,
  desktopSystemNavigationAssistiveTouchSize: 120,
  desktopSystemNavigationAssistiveTouchColor: 'rgba(1, 2, 3, 0.6)',
  desktopSystemNavigationAssistiveTouchBorderColor: '#ffffff',
  desktopSystemNavigationAssistiveTouchBorderWidth: -3,
  desktopSystemNavigationAssistiveTouchImage: 'data:image/png;base64,test',
  desktopSystemNavigationAssistiveTouchPositionX: 2,
  desktopSystemNavigationAssistiveTouchPositionY: -1,
  desktopSystemNavigationAssistiveTouchFreePosition: true,
  desktopSystemNavigationAssistiveTouchShape: 'rounded',
});

assert.equal(normalized.desktopSystemNavigationMode, 'assistiveTouch', '归一化后应保留有效的小白点模式');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchSingleTapAction, 'settings', '归一化后应保留有效的小白点单击动作');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchDoubleTapAction, 'lock', '归一化后应保留有效的小白点双击动作');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchOpacity, 1, '小白点透明度应限制在 0.2 到 1 之间');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchSize, 88, '小白点尺寸应限制在 40 到 88 之间');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchBorderWidth, 0, '小白点边框宽度不应小于 0');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchImage, 'data:image/png;base64,test', '小白点图片应被保留');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchPositionX, 1, '自由摆放时小白点横向位置应允许写满全屏范围');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchPositionY, 0, '自由摆放时小白点纵向位置应允许写满全屏范围');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchFreePosition, true, '归一化后应保留自由摆放开关');
assert.equal(normalized.desktopSystemNavigationAssistiveTouchShape, 'rounded', '归一化后应保留有效的小白点形状');

const fallback = normalizeAppearanceSettings({
  desktopSystemNavigationMode: 'bad-mode' as any,
  desktopSystemNavigationAssistiveTouchSingleTapAction: 'bad-action' as any,
  desktopSystemNavigationAssistiveTouchDoubleTapAction: 'bad-action' as any,
  desktopSystemNavigationAssistiveTouchOpacity: 'NaN' as any,
  desktopSystemNavigationAssistiveTouchShape: 'bad-shape' as any,
});

assert.equal(fallback.desktopSystemNavigationMode, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationMode, '非法桌面系统导航模式必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchSingleTapAction, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchSingleTapAction, '非法小白点单击动作必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchDoubleTapAction, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchDoubleTapAction, '非法小白点双击动作必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchOpacity, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchOpacity, '非法小白点透明度必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchPositionX, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchPositionX, '非法小白点横向位置必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchPositionY, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchPositionY, '非法小白点纵向位置必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchFreePosition, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchFreePosition, '非法小白点自由摆放开关必须回退到默认值');
assert.equal(fallback.desktopSystemNavigationAssistiveTouchShape, DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchShape, '非法小白点形状必须回退到默认值');

console.log('测试通过：桌面系统导航配置归一化逻辑正常。');
