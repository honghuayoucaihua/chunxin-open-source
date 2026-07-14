import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildChatReplySuggestionHistory,
  buildChatReplySuggestionInstruction,
  parseReplySuggestions
} from '../src/app/chatReplySuggestionFlow.ts';
import type { Contact, Message } from '../src/types';

const contact: Contact = {
  id: 'c1',
  name: '林夏',
  pinyin: 'linxia',
  avatar: '',
  unreadCount: 0,
  isAi: true,
  chatMode: 'online'
};

const messages: Message[] = [
  {
    id: 'm1',
    senderId: 'c1',
    content: '我在楼下等你',
    timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
    type: 'text',
    translatedContentZhCN: 'I am waiting downstairs.',
    actionDesc: '把伞收起来'
  },
  {
    id: 'm2',
    senderId: 'me',
    content: '',
    timestamp: Date.parse('2026-03-16T07:43:33.000Z'),
    type: 'text',
    actionDesc: '点点头'
  }
];

const history = buildChatReplySuggestionHistory(messages, contact, { name: '我' }, {});
const source = readFileSync(new URL('../src/app/chatReplySuggestionFlow.ts', import.meta.url), 'utf8');

assert.match(history, /林夏：我在楼下等你/, '候选回复历史应保留正文上下文');
assert.doesNotMatch(history, /把伞收起来/, '关闭动作时，旧 AI 动作不应进入候选回复历史');
assert.doesNotMatch(history, /【动作】/, '关闭动作时，候选回复历史不应继续暴露动作格式');
assert.doesNotMatch(history, /【译文】/, '候选回复历史不应暴露译文格式标签，避免候选句混入翻译');
assert.match(history, /【用户行为】点点头/, '用户自己发送的纯行为可作为用户行为保留，避免丢失上下文');

const instruction = buildChatReplySuggestionInstruction({
  isStoryChat: false,
  myName: '我',
  contactName: '林夏',
  myPersona: '未设置',
  contactPersona: '未设置'
});

assert.match(instruction, /只能是用户将要发送的正文/, '候选回复应明确只生成可发送正文');
assert.match(instruction, /不要写心声、动作、旁白、翻译/, '候选回复应明确禁止混入心声、动作和翻译格式');
assert.match(instruction, /系统能力必须通过对应结构化类型落地/, '候选回复应明确不能伪装系统能力入口');
assert.match(instruction, /不能在正文中宣称系统状态已发生/, '候选回复应禁止伪造用户已完成系统能力');
assert.deepEqual(
  parseReplySuggestions({
    suggestions: [
      '我给你转账了，记得查收。',
      '红包收下，别再硬撑。',
      '那我先陪你把这件事说清楚。'
    ]
  }),
  ['我给你转账了，记得查收。', '红包收下，别再硬撑。', '那我先陪你把这件事说清楚。'],
  '候选回复不应靠关键词猜测普通自然语言；只清理明确格式污染'
);

assert.deepEqual(
  parseReplySuggestions({
    suggestions: [
      '[系统红包·待领取] ¥8.88',
      '【系统】我拍了拍你',
      '我还是想听你亲口说。',
      '[位置] 春信咖啡'
    ]
  }),
  [],
  '候选回复解析应拒收明确系统事件格式；有效候选不足 3 条时整组丢弃'
);

const chatRoomActionFlowSource = readFileSync(new URL('../src/app/chatRoomActionFlow.ts', import.meta.url), 'utf8');
assert.match(chatRoomActionFlowSource, /extractStrictJsonObjectLazy/, '候选回复实际解析不应从解释文本中截取 JSON 继续使用');
assert.match(source, /suggestions\.length === 3 \? suggestions : \[\]/, '候选回复解析不应展示不足 3 条的 AI 结果');

console.log('测试通过：候选回复不会被旧动作格式污染。');
