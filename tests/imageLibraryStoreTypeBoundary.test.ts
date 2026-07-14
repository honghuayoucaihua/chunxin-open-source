import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeImageLibraryGroups,
  normalizeImageLibraryItems
} from '../src/services/imageLibraryStore.ts';

const source = readFileSync(new URL('../src/services/imageLibraryStore.ts', import.meta.url), 'utf8');

const groups = normalizeImageLibraryGroups([
  { id: ' b ', name: 'B', order: 2, createdAt: 10, updatedAt: 11 },
  { id: ' a ', name: 'A', order: 1 },
  { id: '', name: '空' },
  null
]);

assert.deepEqual(groups.map((item) => item.id), ['a', 'b']);
assert.equal(groups[0].order, 1);

const items = normalizeImageLibraryItems([
  { id: ' i1 ', groupId: ' g1 ', url: ' data:image/png;base64,aaa ', desc: '图' },
  { id: 'bad', groupId: 'g1', url: '' },
  'bad'
]);

assert.deepEqual(items.map((item) => item.id), ['i1']);
assert.equal(items[0].groupId, 'g1');

assert.doesNotMatch(source, /normalizeGroups = \(raw: any\)/, '相册分组归一化不应继续接收 raw:any');
assert.doesNotMatch(source, /normalizeItems = \(raw: any\)/, '相册图片归一化不应继续接收 raw:any');
assert.doesNotMatch(source, /item: any/, '相册归一化不应继续使用 item:any');
assert.doesNotMatch(source, /window as any/, '相册运行时状态不应继续把 window 断言为 any');
assert.match(source, /const isRecord = \(value: unknown\)/, '相册外部数据应先经过 unknown record 守卫');
