import assert from 'node:assert/strict';
import { canPlaceDesktopAreaOnPage, getDesktopDragSwitchPageTarget, moveDesktopPagedItem } from '../src/utils/desktopPageUtils.ts';

assert.equal(
  getDesktopDragSwitchPageTarget(12, 390, 1, 3),
  0,
  '拖到左边缘时应能切到上一页'
);

assert.equal(
  getDesktopDragSwitchPageTarget(382, 390, 1, 3),
  2,
  '拖到右边缘时应能切到下一页'
);

assert.equal(
  getDesktopDragSwitchPageTarget(190, 390, 1, 3),
  null,
  '停留在中间区域时不应误触发翻页'
);

assert.equal(
  getDesktopDragSwitchPageTarget(12, 390, 0, 3),
  null,
  '第一页左边缘不应继续向前翻页'
);

assert.equal(
  canPlaceDesktopAreaOnPage(
    [{ id: 'icon-a', row: 0, col: 0, pageIndex: 0 }],
    [{ id: 'widget-a', row: 1, col: 1, width: 2, height: 2, pageIndex: 1 }],
    1,
    1,
    1,
    2,
    2
  ),
  false,
  '跨页检测时，目标页已有组件占位就不应允许放置'
);

assert.equal(
  canPlaceDesktopAreaOnPage(
    [{ id: 'icon-a', row: 0, col: 0, pageIndex: 0 }],
    [{ id: 'widget-a', row: 1, col: 1, width: 2, height: 2, pageIndex: 1 }],
    0,
    1,
    1,
    1,
    1
  ),
  true,
  '跨页检测时，不同页面的占位不应互相干扰'
);

assert.deepEqual(
  moveDesktopPagedItem(
    [
      { id: 'icon-a', row: 0, col: 0, pageIndex: 0 },
      { id: 'icon-b', row: 2, col: 2, pageIndex: 1 }
    ],
    'icon-a',
    2,
    1,
    3
  ),
  [
    { id: 'icon-a', row: 1, col: 3, pageIndex: 2 },
    { id: 'icon-b', row: 2, col: 2, pageIndex: 1 }
  ],
  '跨页移动后，项目应写入新的 pageIndex 与落点坐标'
);

console.log('测试通过：桌面图标和组件支持跨页拖拽的基础逻辑。');
