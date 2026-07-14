import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_APPEARANCE_SETTINGS } from '../src/constants.ts';
import {
  buildDesktopSettingsExportPayload,
  extractDesktopSettingsRestoreData,
  mergeDesktopAppearanceSettings
} from '../src/services/desktopSettingsTransfer.ts';

const storageViewSource = readFileSync(new URL('../src/settings/StorageSettingsView.tsx', import.meta.url), 'utf8');
const snapshotBuilderSource = readFileSync(new URL('../src/services/snapshot/snapshotBuilder.ts', import.meta.url), 'utf8');

assert.match(storageViewSource, /InlineActionRow label="导出桌面设置"/, '存储管理页应提供导出桌面设置入口');
assert.match(storageViewSource, /app-list-item-title">仅恢复桌面设置</, '恢复方式弹层应提供仅恢复桌面设置入口');
assert.match(snapshotBuilderSource, /settings,\s*\n\s*aiSettings,/, '全量备份构建应继续包含完整 settings 数据');

const desktopSettings = {
  ...DEFAULT_APPEARANCE_SETTINGS,
  enableDesktopMode: true,
  desktopWallpaper: 'data:image/png;base64,desktop-wallpaper',
  desktopShowDock: false,
  desktopDockColor: '#223344',
  desktopDockIconIds: [],
  desktopWidgetColor: '#d4b483',
  desktopIcons: [
    { id: 'desk-a', name: '桌面A', icon: 'fa-star', type: 'app' as const, row: 0, col: 0, pageIndex: 1 }
  ],
  desktopWidgets: [
    { id: 'widget-a', type: 'notes' as const, row: 1, col: 0, width: 2, height: 1, pageIndex: 1, config: { text: '测试便签' } }
  ],
  desktopPageCount: 2
};

const desktopExport = buildDesktopSettingsExportPayload(desktopSettings);
assert.equal(desktopExport.version, 'desktop-settings-export-v1', '桌面设置导出应包含独立版本号');
assert.equal(desktopExport.desktopSettings.enableDesktopMode, true, '桌面设置导出应包含桌面模式开关');
assert.equal(desktopExport.desktopSettings.desktopDockColor, '#223344', '桌面设置导出应包含 Dock 颜色');
assert.deepEqual(desktopExport.desktopSettings.desktopDockIconIds, [], '桌面设置导出应保留空的 Dock 图标列表');
assert.equal(desktopExport.desktopSettings.desktopWidgetColor, '#d4b483', '桌面设置导出应包含小组件颜色');

const extractedFromExport = extractDesktopSettingsRestoreData(desktopExport);
assert.equal(extractedFromExport?.enableDesktopMode, true, '桌面设置恢复应识别独立导出文件');
assert.equal(extractedFromExport?.desktopDockColor, '#223344', '桌面设置恢复应识别 Dock 颜色');
assert.equal(extractedFromExport?.desktopWidgetColor, '#d4b483', '桌面设置恢复应识别小组件颜色');

const extractedFromSnapshot = extractDesktopSettingsRestoreData({ settings: desktopSettings });
assert.equal(extractedFromSnapshot?.desktopWallpaper, desktopSettings.desktopWallpaper, '桌面设置恢复应识别完整备份中的 settings');

const merged = mergeDesktopAppearanceSettings(
  {
    ...DEFAULT_APPEARANCE_SETTINGS,
    chatBg: 'keep-chat-bg',
    enableDesktopMode: false,
    desktopWallpaper: 'old-wallpaper',
    desktopShowDock: true,
    desktopDockColor: '#000000',
    desktopWidgetColor: '#ffffff',
    desktopDockIconIds: ['main-app']
  },
  {
    enableDesktopMode: true,
    desktopWallpaper: 'new-wallpaper',
    desktopShowDock: false,
    desktopDockColor: '#445566',
    desktopDockIconIds: []
  }
);

assert.equal(merged.chatBg, 'keep-chat-bg', '仅恢复桌面设置时不应改动非桌面设置');
assert.equal(merged.enableDesktopMode, true, '仅恢复桌面设置时应更新桌面模式开关');
assert.equal(merged.desktopWallpaper, 'new-wallpaper', '仅恢复桌面设置时应更新桌面壁纸');
assert.equal(merged.desktopShowDock, false, '仅恢复桌面设置时应更新 Dock 开关');
assert.equal(merged.desktopDockColor, '#445566', '仅恢复桌面设置时应更新 Dock 颜色');
assert.equal(merged.desktopWidgetColor, '#ffffff', '未覆盖时应保留原有小组件颜色');
assert.deepEqual(merged.desktopDockIconIds, [], '仅恢复桌面设置时应支持空 Dock 图标列表覆盖');

console.log('测试通过：桌面设置已接入备份、导出与仅恢复流程。');
