import assert from 'node:assert/strict';
import { normalizeAppearanceSettings } from '../src/appBootstrapUtils.ts';

const LEGACY_DESKTOP_ICONS = [
  { id: 'main-app', name: '叙说', icon: 'default-app', type: 'app' as const, row: 2, col: 0 },
  { id: 'divination-app', name: '占卜', icon: 'fa-dice', type: 'app' as const, subView: 'divination', row: 2, col: 1 },
  { id: 'music-app', name: '听音乐', icon: 'fa-headphones', type: 'app' as const, subView: 'listenMusic', row: 2, col: 2 },
  { id: 'novel-app', name: '小说', icon: 'fa-book-open-reader', type: 'app' as const, subView: 'novelDiscover', row: 2, col: 3 },
  { id: 'mailbox-app', name: '信箱', icon: 'fa-envelope-open-text', type: 'app' as const, subView: 'mailbox', row: 3, col: 0 },
  { id: 'anonymous-app', name: '匿名聊天', icon: 'fa-user-secret', type: 'app' as const, subView: 'anonymousChat', row: 3, col: 1 },
  { id: 'forum-app', name: '论坛', icon: 'fa-comments', type: 'app' as const, subView: 'forum', row: 3, col: 2 },
  { id: 'community-app', name: '社区', icon: 'fa-globe', type: 'app' as const, subView: 'community', row: 3, col: 3 },
  { id: 'diy-app', name: '主题DIY', icon: 'fa-palette', type: 'app' as const, subView: 'desktopDIY', row: 4, col: 2 },
  { id: 'settings-app', name: '桌面设置', icon: 'fa-gear', type: 'app' as const, subView: 'desktopSettings', row: 4, col: 3 }
];

{
  const normalized = normalizeAppearanceSettings({
    enableDesktopMode: true,
    desktopDockIconIds: ['main-app', 'settings-app', 'diy-app'],
    desktopIcons: LEGACY_DESKTOP_ICONS
  });

  const positions = new Map(normalized.desktopIcons.map((icon) => [icon.id, `${icon.row},${icon.col}`]));
  assert.equal(positions.get('main-app'), '4,0', '主应用在 Dock 中时不应继续占用首个桌面格子');
  assert.equal(positions.get('divination-app'), '2,0', '占卜图标应补到首个可见格子');
  assert.equal(positions.get('mailbox-app'), '2,3', '第二行首个图标上移后，信箱应补齐首行末尾');
  assert.equal(positions.get('community-app'), '3,2', '社区图标应顺延到第三行第三列');
  assert.equal(positions.get('diy-app'), '4,1', 'Dock 中的主题 DIY 应迁移到新的隐藏默认位');
  assert.equal(positions.get('settings-app'), '4,2', 'Dock 中的桌面设置应迁移到新的隐藏默认位');
}

{
  const normalized = normalizeAppearanceSettings({
    enableDesktopMode: true,
    desktopDockIconIds: ['main-app', 'settings-app', 'diy-app'],
    desktopIcons: LEGACY_DESKTOP_ICONS.map((icon) => (
      icon.id === 'divination-app' ? { ...icon, row: 5, col: 3 } : icon
    ))
  });

  const divination = normalized.desktopIcons.find((icon) => icon.id === 'divination-app');
  assert.equal(divination?.row, 5, '用户手动调整过的桌面图标不应被旧布局迁移覆盖');
  assert.equal(divination?.col, 3, '用户手动调整过的桌面图标不应被旧布局迁移覆盖');
}

{
  const normalized = normalizeAppearanceSettings({
    enableDesktopMode: true,
    desktopIcons: [],
    desktopWidgets: []
  });

  const positions = new Map(normalized.desktopIcons.map((icon) => [icon.id, `${icon.row},${icon.col}`]));
  assert.equal(positions.get('divination-app'), '2,0', '显式空数组时也应回退到新的默认桌面布局');
  assert.equal(positions.get('mailbox-app'), '2,3', '显式空数组时默认布局应保持首屏紧凑');
}

console.log('测试通过：桌面模式会迁移旧版 Dock 留空布局，并对空数组回退到新的默认桌面布局。');
