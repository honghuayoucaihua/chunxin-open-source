import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  extractMiniMaxAudioUrl,
  resolveMiniMaxAudioMimeType
} from '../src/services/minimaxTtsService.ts';

const source = readFileSync(new URL('../src/services/minimaxTtsService.ts', import.meta.url), 'utf8');

assert.equal(resolveMiniMaxAudioMimeType({ extra_info: { audio_format: 'wav' } }), 'audio/wav');
assert.equal(resolveMiniMaxAudioMimeType(null), 'audio/mpeg');
assert.equal(extractMiniMaxAudioUrl({ audio_url: 'https://example.com/a.mp3' }), 'https://example.com/a.mp3');
assert.equal(extractMiniMaxAudioUrl({ data: { audio_base64: 'YWJj', format: 'ogg' } }), 'data:audio/ogg;base64,YWJj');
assert.throws(() => extractMiniMaxAudioUrl({ data: {} }), /未找到可播放音频数据/);

assert.doesNotMatch(source, /resolveAudioMimeType = \(data: any\)/, 'MiniMax 音频格式解析不应继续接收 data:any');
assert.doesNotMatch(source, /extractAudioUrl = \(data: any\)/, 'MiniMax 音频 URL 提取不应继续接收 data:any');
assert.match(source, /const isRecord = \(value: unknown\)/, 'MiniMax 响应解析应先经过 unknown record 守卫');
assert.match(source, /const data: unknown = await response\.json\(\)/, 'MiniMax HTTP JSON 响应应停在 unknown 边界');
