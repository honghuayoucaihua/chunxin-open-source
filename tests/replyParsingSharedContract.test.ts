import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAIReply } from '../src/utils/chat/aiReplyParser.ts';
import { parseGroupReplyMessages } from '../src/utils/chat/groupReplyParser.ts';
import {
  hasLandableSingleReplyContent,
  normalizeSingleReplyStructures
} from '../src/utils/chat/singleReplyMessageBuilder.ts';

const aiReplyParserSource = readFileSync(new URL('../src/utils/chat/aiReplyParser.ts', import.meta.url), 'utf8');

assert.doesNotMatch(
  aiReplyParserSource,
  /allowPlainTextFallback|fallbackText/,
  '共享解析器不应再保留非 JSON 原文兜底开关'
);

{
  const parsed = parseAIReply('普通自然语言不能由共享解析器兜底落地', true, true, { allowSocial: false });
  assert.equal(parsed.text, '', '共享解析器默认不应把普通自然语言作为 AI 回复兜底落地');
}

{
  const rawReply = JSON.stringify({
    content: JSON.stringify({
      text: '第一句',
      sentences: ['第一句', '第二句'],
      tags: [
        { type: 'sentence', value: '第一句' },
        { type: 'sentence', value: '第二句' },
        { type: 'action', value: '不该混进正文' }
      ]
    })
  });

  const parsed = parseAIReply(rawReply, false, false, { allowSocial: false });
  assert.equal(parsed.text, '', '共享回复解析器不应从 content 字符串里二次拆 JSON');
  assert.deepEqual(parsed.sentences, [], '共享回复解析器不应为嵌套 JSON 字符串生成分句');
  assert.equal(parsed.actionDesc, undefined, '禁用动作能力时不应从嵌套对象泄漏动作描述');
}

{
  const groupReply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: '前缀 {"type":"sentence","value":"不要抢"} 真正回复 {"content":"{\\"text\\":\\"群聊正文\\",\\"sentences\\":[\\"群聊正文\\",\\"补一句\\"]}"}'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(groupReply, {
    memberIds: ['alice'],
    now: 100,
    idPrefix: 'shared'
  });

  assert.equal(parsed.length, 0, '群聊共享解析器不应从成员正文里的解释文字或嵌套 JSON 中猜主回复');
}

{
  const structures = normalizeSingleReplyStructures({
    dialogueTurns: [
      { text: '我刚到楼下。[位置] 春信咖啡' },
      { isNpc: true, npcName: '店员', text: '[系统红包·待领取] ¥8.88' }
    ],
    orderedSegments: [
      { type: 'text', value: '先听我说完。[通话] 已结束' },
      { type: 'text', value: '[红包] ¥6.66' }
    ]
  });

  assert.deepEqual(
    structures.dialogueTurns.map((item) => item.text),
    [],
    '单聊多角色正文结构混入系统能力格式时应整条拒收'
  );
  assert.deepEqual(
    structures.orderedSegments.map((item) => item.value),
    [],
    '单聊有序正文片段混入系统能力格式时应整条拒收'
  );
}

{
  const emptyStructures = normalizeSingleReplyStructures({});
  assert.equal(
    hasLandableSingleReplyContent(
      { translatedContentZhCN: '只有译文' } as any,
      emptyStructures,
      false
    ),
    false,
    '单聊回复只有译文时不应算作可落地内容'
  );
  assert.equal(
    hasLandableSingleReplyContent(
      { statusUpdate: '只改状态', patDescUpdate: '只改拍一拍' } as any,
      emptyStructures,
      false
    ),
    false,
    '单聊回复只有状态更新或拍一拍后缀时不应算作有效主回复'
  );
  assert.equal(
    hasLandableSingleReplyContent(
      {
        text: { value: '对象正文不应被当作有效回复' },
        innerVoice: { value: '对象心声不应被当作有效回复' },
        actionDesc: ['数组动作不应被当作有效回复']
      } as any,
      emptyStructures,
      false
    ),
    false,
    '单聊可落地判断不应把对象或数组旧格式强转成有效回复'
  );
  assert.equal(
    hasLandableSingleReplyContent(
      { text: 404 } as any,
      emptyStructures,
      false
    ),
    true,
    '单聊可落地判断仍应接受数字型可展示正文'
  );
  assert.equal(
    hasLandableSingleReplyContent(
      { text: '有正文', translatedContentZhCN: '有译文' } as any,
      emptyStructures,
      false
    ),
    true,
    '单聊回复有正文时仍应允许携带译文'
  );
  assert.equal(
    hasLandableSingleReplyContent(
      { translatedContentZhCN: '只有译文' } as any,
      emptyStructures,
      true
    ),
    true,
    '单聊回复只有可落地系统能力时可以没有主正文'
  );
}

{
  const singleFlowSource = readFileSync(new URL('../src/app/sendMessage/singleChatFlow.ts', import.meta.url), 'utf8');
  const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
  assert.match(singleFlowSource, /hasLandableSingleReplyContent\(parsed, normalizedStructures, hasLandableSpecialMessages\)/, '单聊首发应使用共享可落地内容校验');
  assert.match(resendFlowSource, /hasLandableSingleReplyContent\(parsed, normalizedStructures, hasLandableSpecialMessages\)/, '单聊重发应使用共享可落地内容校验');
  assert.doesNotMatch(singleFlowSource, /parsed\.statusUpdate[\s\S]*parsed\.translatedContentZhCN[\s\S]*normalizedStructures\.dialogueTurns/, '单聊首发不应把状态或译文单独算作有效回复');
  assert.doesNotMatch(resendFlowSource, /parsed\.statusUpdate[\s\S]*parsed\.translatedContentZhCN[\s\S]*normalizedStructures\.dialogueTurns/, '单聊重发不应把状态或译文单独算作有效回复');
}

console.log('测试通过：单聊与群聊已共用同一套严格正文与句子语义契约。');
