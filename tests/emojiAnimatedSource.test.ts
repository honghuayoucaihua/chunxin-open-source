import assert from 'node:assert/strict';
import { shouldPreserveAnimatedEmojiSource } from '../src/chatroom/emojiImageUtils.ts';

const toBase64 = (bytes: number[]): string => Buffer.from(Uint8Array.from(bytes)).toString('base64');

const asciiBytes = (value: string): number[] => Array.from(value).map((char) => char.charCodeAt(0));

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const buildPngDataUrl = (chunkTypes: string[]): string => {
  const bytes = [...PNG_SIGNATURE];
  chunkTypes.forEach((chunkType) => {
    bytes.push(0, 0, 0, 0);
    bytes.push(...asciiBytes(chunkType));
    bytes.push(0, 0, 0, 0);
  });
  return `data:image/png;base64,${toBase64(bytes)}`;
};

const buildWebpDataUrl = (chunkTypes: string[]): string => {
  const bytes = [
    ...asciiBytes('RIFF'),
    0, 0, 0, 0,
    ...asciiBytes('WEBP')
  ];
  chunkTypes.forEach((chunkType) => {
    bytes.push(...asciiBytes(chunkType));
    bytes.push(0, 0, 0, 0);
  });
  return `data:image/webp;base64,${toBase64(bytes)}`;
};

// 复现：动图表情导入时会进入 canvas 压缩，GIF/APNG/动图 WebP 最终只剩首帧。
assert.equal(
  shouldPreserveAnimatedEmojiSource('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),
  true,
  'GIF 数据源应被识别为动图并跳过静态压缩'
);

assert.equal(
  shouldPreserveAnimatedEmojiSource(buildPngDataUrl(['IHDR', 'acTL', 'IDAT'])),
  true,
  '带 acTL 的 PNG 应视为 APNG 动图并保留原始数据'
);

assert.equal(
  shouldPreserveAnimatedEmojiSource(buildWebpDataUrl(['VP8X', 'ANIM', 'ANMF'])),
  true,
  '带 ANIM/ANMF 的 WebP 应视为动图并保留原始数据'
);

assert.equal(
  shouldPreserveAnimatedEmojiSource(buildPngDataUrl(['IHDR', 'IDAT', 'IEND'])),
  false,
  '静态 PNG 不应误判为动图'
);

assert.equal(
  shouldPreserveAnimatedEmojiSource(buildWebpDataUrl(['VP8 ', 'ICCP'])),
  false,
  '静态 WebP 不应误判为动图'
);

console.log('测试通过：动图表情源识别符合预期。');
