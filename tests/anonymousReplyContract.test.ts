import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAnonymousPersona, buildAnonymousSystemPrompt } from '../src/app/anonymousChatUtils.ts';
import { buildAnonymousReplyChunks } from '../src/app/anonymousReplyParsing.ts';

const anonymousPromptSource = readFileSync(new URL('../src/app/anonymousChatUtils.ts', import.meta.url), 'utf8');
const anonymousParserSource = readFileSync(new URL('../src/app/anonymousReplyParsing.ts', import.meta.url), 'utf8');

const systemPrompt = buildAnonymousSystemPrompt(
  { gender: 'female', age: 24, tags: ['咖啡'], persona: buildAnonymousPersona({ gender: 'female', age: 24, tags: ['咖啡'], persona: '' }) },
  [],
  [],
  { gender: 'male', region: '上海', status: '最近有点感冒' } as any,
  ''
);

assert.match(systemPrompt, /\{"text":"聊天正文"\}/, '匿名聊天输出契约应只保留 text 字段');
assert.doesNotMatch(systemPrompt, /"tags":\[\{"type":"sentence"/, '匿名聊天提示不应继续要求 tags 分句旧结构');
assert.doesNotMatch(systemPrompt, /不要输出 JSON/, '匿名人设补充不应和系统 JSON 输出契约互相冲突');
assert.match(systemPrompt, /禁止输出 tags、sentences、content、innerVoice、actionDesc、translationZh/, '匿名聊天应明确禁止旧字段和格式字段');

assert.match(anonymousParserSource, /key !== 'text'/, '匿名聊天落地层应只允许 text 字段');
assert.doesNotMatch(anonymousParserSource, /parseAIReply/, '匿名聊天不应复用宽解析器从 tags 或 sentences 中捞正文');
assert.doesNotMatch(anonymousPromptSource, /顺序规则：text 是首条正文/, '匿名聊天不应保留 tags 顺序分句规则');

assert.deepEqual(
  buildAnonymousReplyChunks('{"text":"刚看到消息，今天好点了吗？"}'),
  ['刚看到消息，今天好点了吗？'],
  '匿名聊天合法 text 回复应正常落地'
);
assert.throws(
  () => buildAnonymousReplyChunks('{"text":"我在","tags":[{"type":"sentence","value":"你呢"}]}'),
  /不支持的字段/,
  '匿名聊天不应接受 tags 分句旧结构'
);
assert.throws(
  () => buildAnonymousReplyChunks('{"sentences":["我在路上"]}'),
  /不支持的字段/,
  '匿名聊天不应从 sentences 旧结构里捞正文'
);
assert.throws(
  () => buildAnonymousReplyChunks('{"content":"我在路上"}'),
  /不支持的字段/,
  '匿名聊天不应从 content 旧字段里捞正文'
);
assert.throws(
  () => buildAnonymousReplyChunks('{"text":"我在路上","innerVoice":"其实有点担心"}'),
  /不支持的字段/,
  '匿名聊天不应接受心声字段后再忽略落地'
);
assert.throws(
  () => buildAnonymousReplyChunks('{"text":123}'),
  /text 必须是字符串/,
  '匿名聊天正文必须来自明确字符串字段'
);

console.log('测试通过：匿名聊天回复协议只接受 text 正文字段。');
