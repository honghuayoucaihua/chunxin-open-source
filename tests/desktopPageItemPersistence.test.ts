import assert from 'node:assert/strict';
import { mergeDesktopItemsForPage } from '../src/utils/desktopPageUtils.ts';

const mergedWidgets = mergeDesktopItemsForPage(
  [
    { id: 'page-0', type: 'notes', row: 0, col: 0, width: 1, height: 1, pageIndex: 0 },
    { id: 'page-1-old', type: 'image', row: 1, col: 1, width: 2, height: 2, pageIndex: 1, config: { url: 'old' } }
  ] as Array<{ id: string; type: string; row: number; col: number; width: number; height: number; pageIndex?: number; config?: { url: string } }>,
  1,
  [
    { id: 'page-1-new', type: 'image', row: 2, col: 0, width: 2, height: 2, config: { url: 'new' } }
  ] as Array<{ id: string; type: string; row: number; col: number; width: number; height: number; pageIndex?: number; config?: { url: string } }>
);

assert.deepEqual(
  mergedWidgets,
  [
    { id: 'page-0', type: 'notes', row: 0, col: 0, width: 1, height: 1, pageIndex: 0 },
    { id: 'page-1-new', type: 'image', row: 2, col: 0, width: 2, height: 2, config: { url: 'new' }, pageIndex: 1 }
  ],
  '当前页写回时，新增或更新的小组件都必须补齐当前 pageIndex，且不能污染其他页面'
);

console.log('测试通过：桌面分页写回会保留当前页 pageIndex。');
