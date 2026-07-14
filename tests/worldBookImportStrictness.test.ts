import assert from 'node:assert/strict';
import { normalizeImportedWorldBooks } from '../src/utils/worldBookImport.ts';

const normalized = normalizeImportedWorldBooks([
  {
    id: ' wb-1 ',
    name: ' 校园规则 ',
    description: ' 只在夜间生效 ',
    enabled: true,
    entries: [
      { id: ' e-1 ', text: ' 三楼废弃教室的门只能从里面反锁。 ' },
      { id: '', text: '缺 id 的内容不应被补造身份。' },
      { text: '缺 id 的内容不应被补造身份。' },
      { id: 'e-1', text: '重复 id 的内容不应被补造身份。' },
      { id: 'e-2', text: '  ' }
    ]
  },
  {
    name: '缺 id 的世界书',
    enabled: true,
    entries: []
  },
  {
    id: 'wb-missing-name',
    enabled: true,
    entries: []
  },
  {
    id: 'wb-missing-enabled',
    name: '缺 enabled 的世界书',
    entries: []
  },
  {
    id: 'wb-missing-entries',
    name: '缺 entries 的世界书',
    enabled: true
  }
]);

assert.deepEqual(
  normalized,
  [{
    id: 'wb-1',
    name: '校园规则',
    description: '只在夜间生效',
    enabled: true,
    entries: [{ id: 'e-1', text: '三楼废弃教室的门只能从里面反锁。' }]
  }],
  '世界书导入只接受显式完整结构，不补造 id、名称、enabled 或条目 id'
);

assert.equal(
  JSON.stringify(normalized).includes('imported-worldbook'),
  false,
  '世界书导入不应生成 imported-worldbook 兜底 id'
);
assert.equal(
  JSON.stringify(normalized).includes('未命名世界书'),
  false,
  '世界书导入不应生成默认世界书名称'
);

console.log('测试通过：世界书导入不再补造缺失结构。');
