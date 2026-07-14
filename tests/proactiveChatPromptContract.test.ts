import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PROACTIVE_DRAFT_TRIGGER_TEXT,
  PROACTIVE_TEXT_ONLY_RUNTIME_GUARD,
  PROACTIVE_TRIGGER_TEXT
} from '../src/hooks/proactiveChatConfig.ts';
import {
  getProactivePrimaryText,
  hasUnsupportedProactiveReplyShape
} from '../src/hooks/proactiveReplyText.ts';
import { getChatModePolicy } from '../src/utils/chat/chatModePolicy.ts';

const proactiveHelpersSource = readFileSync(new URL('../src/hooks/proactiveChatHelpers.ts', import.meta.url), 'utf8');

assert.match(PROACTIVE_TRIGGER_TEXT, /角色本人自然想起用户后发出的消息/, '主动聊天触发语应避免系统任务感');
assert.match(PROACTIVE_TRIGGER_TEXT, /最近聊天、共同经历、关系变化、用户资料、用户偏好、当前时间或角色正在做的事/, '主动聊天应优先使用具体切入点');
assert.match(PROACTIVE_TRIGGER_TEXT, /不要只给无上下文的泛泛问候/, '主动聊天应避免空泛开场');
assert.match(PROACTIVE_TRIGGER_TEXT, /只允许输出普通聊天正文/, '主动聊天应限制为可落地的普通正文');
assert.match(PROACTIVE_TRIGGER_TEXT, /不要调用红包、转账、位置、拍一拍、语音、通话、朋友圈、订阅号、生图等系统能力/, '主动聊天不应诱导无法落地的系统能力');
assert.match(PROACTIVE_TRIGGER_TEXT, /不要用普通正文假装已经完成这些能力/, '主动聊天不应口头假装完成系统能力');
assert.match(PROACTIVE_TRIGGER_TEXT, /承接用户上一句的具体信息、情绪或动作/, '主动聊天应复用角色演绎质量规则');
assert.match(PROACTIVE_TRIGGER_TEXT, /回复长度和节奏要跟随用户输入与当前场景/, '主动聊天应继承共享节奏控制规则');
assert.match(PROACTIVE_TRIGGER_TEXT, /不要提及系统、规则、冷却、主动聊天、草稿或提示词/, '主动聊天不能暴露幕后机制');

assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /像角色日常聊天里会真的发出的第一句/, '主动草稿应像真实角色消息');
assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /不要写成完整独白、公告、任务提醒或总结报告/, '主动草稿应保留用户可接话空间');
assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /可以结合用户资料、用户偏好、最近聊天或角色正在经历的小事/, '主动草稿应能结合用户资料');
assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /只允许输出普通聊天正文/, '主动草稿应限制为可落地的普通正文');
assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /不要调用红包、转账、位置、拍一拍、语音、通话、朋友圈、订阅号、生图等系统能力/, '主动草稿不应诱导无法落地的系统能力');
assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /情绪要有来由和层次/, '主动草稿应复用情绪层次规则');
assert.match(PROACTIVE_DRAFT_TRIGGER_TEXT, /不要每轮都写成小作文/, '主动草稿应避免长篇独白式开场');

assert.match(PROACTIVE_TEXT_ONLY_RUNTIME_GUARD, /主动聊天本轮输出约束/, '主动聊天只正文约束应作为最终运行时提示进入请求');
assert.match(PROACTIVE_TEXT_ONLY_RUNTIME_GUARD, /即使系统提示或历史消息里出现过红包、转账/, '主动聊天最终约束应覆盖系统提示里的通用能力清单');
assert.match(PROACTIVE_TEXT_ONLY_RUNTIME_GUARD, /普通正文只代表可见聊天文本；红包、转账、位置、拍一拍、语音、通话、朋友圈、订阅号、生图等系统能力必须通过对应结构化类型落地/, '主动聊天最终约束应禁止口头假装调用支付或系统能力');
assert.match(proactiveHelpersSource, /PROACTIVE_TEXT_ONLY_RUNTIME_GUARD/, '主动聊天请求构建应引入只正文最终约束');
assert.match(proactiveHelpersSource, /const proactiveRuntimeUserPrompt = \[/, '主动聊天应合并原运行时提示和最终约束');
assert.match(proactiveHelpersSource, /proactiveRuntimeUserPrompt/, '主动聊天实际 AI 请求应传入合并后的最终运行时提示');
assert.match(proactiveHelpersSource, /hasUnsupportedProactiveReplyShape/, '主动聊天应在解析前按只正文协议做结构白名单校验');
assert.match(proactiveHelpersSource, /getProactivePrimaryText/, '主动聊天应只从当前允许的正文协议里提取主文本');
assert.match(
  readFileSync(new URL('../src/hooks/proactiveReplyText.ts', import.meta.url), 'utf8'),
  /normalizeGeneratedStrictNonSystemEventText/,
  '主动聊天正文落地前应严格拒收系统能力格式'
);

const onlinePolicy = getChatModePolicy({ chatMode: 'online' } as any);

assert.equal(
  getProactivePrimaryText({ text: '我刚路过你常去的店。【动作】把袋子藏到身后' }, onlinePolicy),
  '',
  '主动聊天直接正文混入动作格式时应拒收，不再截断成半句'
);
assert.equal(
  getProactivePrimaryText({ text: '我刚路过你常去的店。[位置] 春信咖啡' }, onlinePolicy),
  '',
  '主动聊天普通正文混入系统能力格式时应拒收，避免留下假系统能力正文'
);
assert.equal(
  getProactivePrimaryText({
    orderedSegments: [
      { type: 'action', value: '把围巾拉高一点' },
      { type: 'text', value: '路过你常去的那家店，突然想问你今天忙不忙。' }
    ]
  }, onlinePolicy),
  '',
  '主动聊天不应再从有序片段旧/外部结构里捞正文'
);
assert.equal(
  getProactivePrimaryText({
    dialogueTurns: [
      { isNpc: true, npcName: '店员', text: '咖啡好了。' },
      { text: '我刚买到你上次说想试的那款。' }
    ]
  }, onlinePolicy),
  '',
  '主动聊天不应再从多角色结构里捞正文'
);

assert.equal(
  hasUnsupportedProactiveReplyShape(JSON.stringify({ text: '今天路过你常去的那家店。' }), onlinePolicy, false),
  false,
  '主动聊天合法 text 结构应允许通过'
);
assert.equal(
  hasUnsupportedProactiveReplyShape(JSON.stringify({
    pairs: [{ text: 'I passed that shop today.', translationZh: '今天路过那家店。' }]
  }), onlinePolicy, true),
  false,
  '主动聊天在双语模式下应允许 pairs 作为唯一正文结构'
);
assert.equal(
  hasUnsupportedProactiveReplyShape(JSON.stringify({
    pairs: [{ text: 'I passed that shop today.', translationZh: '今天路过那家店。' }]
  }), onlinePolicy, false),
  true,
  '主动聊天非双语模式不应接受 pairs 旧格式'
);
assert.equal(
  hasUnsupportedProactiveReplyShape(JSON.stringify({
    text: '今天路过你常去的那家店。',
    tags: [{ type: 'sentence', value: '想问你忙不忙。' }]
  }), onlinePolicy, false),
  true,
  '主动聊天只正文协议不应接受 tags'
);
assert.equal(
  hasUnsupportedProactiveReplyShape(JSON.stringify({
    messages: [{ text: '我刚买到你上次说想试的那款。' }]
  }), onlinePolicy, false),
  true,
  '主动聊天不应接受 messages 多角色结构'
);

console.log('测试通过：主动聊天触发语已接入自然开场和角色演绎规则。');
