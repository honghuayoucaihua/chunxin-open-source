import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDialogueTurnMessages,
  buildOrderedSequenceMessages,
  buildPlainReplyMessages,
  buildQuotedMessageFromAIQuote,
  buildSplitSentenceReplyMessages,
  normalizeSingleReplyStructures
} from '../src/utils/chat/singleReplyMessageBuilder.ts';

{
  const messages = buildSplitSentenceReplyMessages({
    pieces: ['Salut [emoji:wave]', 'Ca va ?'],
    payload: {
      translatedContentZhCN: '你好。你好吗？',
      translatedSentencesZhCN: ['你好。', '你好吗？']
    },
    modeMeta: {},
    selectedContactId: 'contact-1'
  });

  assert.equal(messages[0]?.content, 'Salut', '第一句原文应保留正文片段');
  assert.equal(messages[0]?.translatedContentZhCN, '你好。', '第一句应挂第一句译文');
  assert.equal(messages[1]?.content, '[emoji:wave]', '同一句拆出的表情片段应独立显示');
  assert.equal(messages[1]?.translatedContentZhCN, undefined, '同一句拆出的表情片段不应错挂下一句译文');
  assert.equal(messages[2]?.content, 'Ca va ?', '第二句原文应继续落地');
  assert.equal(messages[2]?.translatedContentZhCN, '你好吗？', '第二句应挂第二句译文');
}

{
  const messages = buildOrderedSequenceMessages({
    orderedSegments: [
      { type: 'text', value: 'Je suis la [emoji:ok]' },
      { type: 'text', value: 'Ne t inquiete pas.' }
    ],
    payload: {
      translatedContentZhCN: '我在这里。别担心。',
      translatedSentencesZhCN: ['我在这里。', '别担心。']
    },
    modeMeta: {},
    selectedContactId: 'contact-1',
    effectiveChatMode: 'online'
  });

  assert.equal(messages[0]?.translatedContentZhCN, '我在这里。', '有序正文第一段应挂第一句译文');
  assert.equal(messages[1]?.translatedContentZhCN, undefined, '有序正文同段拆出的表情不应重复或错挂译文');
  assert.equal(messages[2]?.translatedContentZhCN, '别担心。', '有序正文第二段应挂第二句译文');
}

{
  const messages = buildPlainReplyMessages({
    replyText: 'Je suis la [emoji:ok] Ne t inquiete pas.',
    payload: {
      translatedContentZhCN: '我在这里。别担心。',
      translatedSentencesZhCN: ['我在这里。', '别担心。']
    },
    modeMeta: {},
    selectedContactId: 'contact-1'
  });

  assert.equal(messages[0]?.translatedContentZhCN, '我在这里。别担心。', '未按句拆分时整段译文只应挂在第一条消息上');
  assert.equal(messages[1]?.translatedContentZhCN, undefined, '未按句拆分时后续表情片段不应重复整段译文');
  assert.equal(messages[2]?.translatedContentZhCN, undefined, '未按句拆分时后续文本片段不应重复整段译文');
}

{
  const splitMessages = buildSplitSentenceReplyMessages({
    pieces: ['Je suis la.', 'Ne t inquiete pas.'],
    payload: {
      translatedContentZhCN: '我在这里。别担心。'
    },
    modeMeta: {},
    selectedContactId: 'contact-1'
  });
  assert.equal(splitMessages[0]?.translatedContentZhCN, undefined, '分句回复缺少逐句译文时不应把整段译文挂到第一句');
  assert.equal(splitMessages[1]?.translatedContentZhCN, undefined, '分句回复缺少逐句译文时不应猜测后续句译文');

  const orderedMessages = buildOrderedSequenceMessages({
    orderedSegments: [
      { type: 'text', value: 'Je suis la.' },
      { type: 'text', value: 'Ne t inquiete pas.' }
    ],
    payload: {
      translatedContentZhCN: '我在这里。别担心。'
    },
    modeMeta: {},
    selectedContactId: 'contact-1',
    effectiveChatMode: 'online'
  });
  assert.equal(orderedMessages[0]?.translatedContentZhCN, undefined, '有序多段缺少逐段译文时不应回退整段译文');
  assert.equal(orderedMessages[1]?.translatedContentZhCN, undefined, '有序多段缺少逐段译文时不应猜测译文对齐');
}

{
  const normalized = normalizeSingleReplyStructures({
    dialogueTurns: [
      { text: '我先说正事。【动作】把门带上' },
      { text: '你别急 译文：Do not worry', isNpc: true, npcName: '旁人【系统说明】内部名' }
    ],
    orderedSegments: [
      { type: 'text', value: '我在门口等你。【心声】其实有点担心' },
      { type: 'action', value: '把伞收起来' }
    ]
  });

  assert.deepEqual(normalized.dialogueTurns, [], '单聊多角色正文混入动作、译文或系统说明格式时应拒收对应片段');
  assert.deepEqual(normalized.orderedSegments, [
    { type: 'action', value: '把伞收起来' }
  ], '单聊有序正文混入心声格式时应拒收，独立动作字段仍应保留给模式开关处理');
}

{
  const normalized = normalizeSingleReplyStructures({
    dialogueTurns: [
      { role: 'npc', name: '旧 NPC 名称', content: '旧 content 台词' },
      { speaker: 'npc', npcName: '旧 speaker NPC', value: '旧 value 台词' }
    ],
    orderedSegments: [
      { type: 'text', text: '旧 text 正文' },
      { type: 'inner', content: '旧 content 心声' },
      { type: 'action', text: '旧 text 动作' }
    ]
  });

  assert.deepEqual(normalized.dialogueTurns, [], '单聊多角色归一化不应使用 name/content/value/speaker 旧字段兜底');
  assert.deepEqual(normalized.orderedSegments, [], '单聊有序片段归一化不应使用 text/content 旧字段兜底 value');
}

{
  const messages = buildPlainReplyMessages({
    replyText: 'Je suis la.',
    payload: {
      translatedContentZhCN: '译文：我在这里。'
    },
    modeMeta: {
      innerVoice: '心声：其实松了口气',
      actionDesc: '【动作】把手机扣在桌上'
    },
    selectedContactId: 'contact-1'
  });

  assert.equal(messages[0]?.translatedContentZhCN, '我在这里。', '单聊消息构建时应剥离译文字段标签');
  assert.equal(messages[0]?.innerVoice, '其实松了口气', '单聊消息构建时应剥离心声字段标签');
  assert.equal(messages[0]?.actionDesc, '把手机扣在桌上', '单聊消息构建时应剥离动作字段标签');
}

{
  const messages = buildDialogueTurnMessages({
    dialogueTurns: normalizeSingleReplyStructures({
      dialogueTurns: [
        { text: '别出声。', isNpc: true, npcName: '店员【动作】压低声音' }
      ]
    }).dialogueTurns,
    payload: {},
    modeMeta: {},
    selectedContactId: 'contact-1'
  });
  assert.equal(messages[0]?.npcName, undefined, '单聊多角色 NPC 名称混入动作格式时应隐藏名称，不再截断成半句');
}

{
  const quote = buildQuotedMessageFromAIQuote(
    { target: '用户【系统说明】内部', text: '刚才那句我记得【动作】翻聊天记录' },
    (target?: string) => target === '用户' ? 'me' : 'contact-1'
  );
  assert.equal(quote, null, 'AI 引用正文混入动作格式时应拒收引用，不再截断成半句');
}

{
  const flowSource = readFileSync(new URL('../src/app/sendMessage/singleChatFlow.ts', import.meta.url), 'utf8');
  const parserSource = readFileSync(new URL('../src/utils/chat/aiReplyParser.ts', import.meta.url), 'utf8');
  const builderSource = readFileSync(new URL('../src/utils/chat/singleReplyMessageBuilder.ts', import.meta.url), 'utf8');
  assert.match(flowSource, /normalizeGeneratedStrictNonSystemEventText\(parsed\.text/, '单聊主正文落地前应严格拒收系统能力格式');
  assert.doesNotMatch(
    flowSource,
    /translatedSentencesZhCN\?\.\[idx\]\s*\|\|\s*parsed\.translatedContentZhCN/,
    '单聊立即分句路径不应在逐句循环里反复回退整段译文，否则会重复挂翻译'
  );
  assert.doesNotMatch(parserSource, /translatedContentZhCN && sentences\.length > 1/, '解析器不应把整段译文自动拆成逐句译文');
  assert.doesNotMatch(
    builderSource,
    /const getTranslationForSourceSegment[\s\S]*fullTranslation[\s\S]*export const buildDialogueTurnMessages/,
    '单聊多段译文对齐函数不应用整段译文兜底逐句译文'
  );
  assert.match(
    flowSource,
    /const immediateMsgs = buildSplitSentenceReplyMessages\(\{\s*pieces: used,\s*payload: parsed,/s,
    '单聊立即分句路径应先用完整 payload 构建整组消息，保持译文索引稳定'
  );
}

console.log('测试通过：双语译文会按原文片段稳定对齐，不会错挂或重复。');
