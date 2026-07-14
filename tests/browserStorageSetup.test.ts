import assert from 'node:assert/strict';
import './helpers/browserStorageSetup.mjs';

localStorage.setItem('storage-key', 'local-value');
sessionStorage.setItem('storage-key', 'session-value');

assert.equal(localStorage.getItem('storage-key'), 'local-value', '测试默认 localStorage 应支持读写');
assert.equal(sessionStorage.getItem('storage-key'), 'session-value', '测试默认 sessionStorage 应支持读写');
assert.equal(localStorage.length, 1, 'localStorage 长度应按独立内存存储计算');
assert.equal(sessionStorage.length, 1, 'sessionStorage 长度应按独立内存存储计算');

localStorage.removeItem('storage-key');
assert.equal(localStorage.getItem('storage-key'), null, '测试默认 localStorage 应支持删除');

sessionStorage.clear();
assert.equal(sessionStorage.length, 0, '测试默认 sessionStorage 应支持清空');

console.log('测试通过：测试运行环境会提供完整的浏览器本地存储模拟。');
