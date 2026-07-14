import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseEmojiUrlsFromText,
  resolveEmojiUrlsFromText,
  URL_IMPORT_MAX_LINKS
} from '../src/chatroom/emojiUrlImportUtils.ts';

const raw = [
  'not-a-url',
  'https://example.com/dup.png',
  'https://example.com/dup.png',
  ...Array.from({ length: URL_IMPORT_MAX_LINKS + 5 }, (_, index) => `https://example.com/${index}.png`)
].join('\n');

const resolved = resolveEmojiUrlsFromText(raw);
assert.equal(resolved.urls.length, URL_IMPORT_MAX_LINKS, 'URL 批量导入每次最多处理固定数量，避免超量下载');
assert.equal(resolved.truncated, true, '超过上限时应标记为已截断，便于界面提示');
assert.equal(resolved.total, URL_IMPORT_MAX_LINKS + 6, '总数统计应按去重后的有效链接计算');
assert.equal(
  new Set(resolved.urls).size,
  resolved.urls.length,
  'URL 批量导入应先去重，避免同一链接重复下载'
);
assert.deepEqual(
  parseEmojiUrlsFromText('https://example.com/a.png\nftp://bad.example/a.png\ndata:image/png;base64,AA=='),
  ['https://example.com/a.png', 'data:image/png;base64,AA=='],
  '兼容旧解析入口：只返回有效图片链接'
);

const emojiPanelSource = readFileSync(new URL('../src/chatroom/EmojiUrlImportPanel.tsx', import.meta.url), 'utf8');
const imagePanelSource = readFileSync(new URL('../src/utils/ImageLibraryUrlImportPanel.tsx', import.meta.url), 'utf8');

assert.ok(
  emojiPanelSource.includes('resolveEmojiUrlsFromText') && emojiPanelSource.includes('URL_IMPORT_MAX_LINKS'),
  '表情 URL 导入面板应使用带上限的解析结果'
);
assert.ok(
  imagePanelSource.includes('resolveEmojiUrlsFromText') && imagePanelSource.includes('URL_IMPORT_MAX_LINKS'),
  '图片素材库 URL 导入面板应使用带上限的解析结果'
);

console.log('测试通过：批量 URL 导入会去重并限制单次处理数量，避免超量下载和内存压力。');
