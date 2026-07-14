import assert from 'node:assert/strict';
import { normalizeAppearanceSettings } from '../src/appBootstrapUtils.ts';
import { DESKTOP_PAGE_MAX, getDesktopContentPageCount, normalizeDesktopPageCount } from '../src/utils/desktopPageUtils.ts';

{
  const contentPages = getDesktopContentPageCount(
    [{ id: 'a', name: '第一页', icon: 'fa-star', type: 'app', row: 0, col: 0, pageIndex: 0 }],
    [{ id: 'w', type: 'notes', row: 0, col: 0, width: 1, height: 1, pageIndex: 2 }]
  );
  assert.equal(contentPages, 3, '内容页数应按最高 pageIndex + 1 计算');
}

{
  const normalized = normalizeAppearanceSettings({
    enableDesktopMode: true,
    desktopIcons: [],
    desktopWidgets: [],
    desktopPageCount: 2
  });
  assert.equal(normalized.desktopPageCount, 2, '没有内容的新桌面页也应被保留');
}

{
  const normalized = normalizeAppearanceSettings({
    enableDesktopMode: true,
    desktopIcons: [
      { id: 'a', name: '第三页图标', icon: 'fa-star', type: 'app', row: 0, col: 0, pageIndex: 2 }
    ],
    desktopWidgets: [],
    desktopPageCount: 1
  });
  assert.equal(normalized.desktopPageCount, 3, '桌面总页数不应小于已有内容占用的页数');
}

{
  const pageCount = normalizeDesktopPageCount(999, [], []);
  assert.equal(pageCount, DESKTOP_PAGE_MAX, '桌面总页数应限制在允许上限内');
}

console.log('测试通过：桌面模式会持久化空白页面，并正确归一化总页数。');
