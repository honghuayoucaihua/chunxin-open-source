import assert from 'node:assert/strict';
import {
  MAX_AI_CONTEXT_CHARS,
  buildBudgetedChatRequest,
  clampContextMessageLimit,
  estimateChatRequestChars,
  estimateChatRequestUsageBreakdown,
  shouldApplyAiContextBudget
} from '../src/services/aiRequestBudget.ts';

{
  const request = buildBudgetedChatRequest({
    personality: `系统提示词-${'甲'.repeat(12000)}`,
    runtimeUserPrompt: `运行时提示-${'乙'.repeat(10000)}`,
    history: [
      { role: 'user', text: `最早消息-${'旧'.repeat(22000)}` },
      { role: 'model', text: `中间消息-${'中'.repeat(18000)}` },
      { role: 'user', text: `最新消息-${'新'.repeat(16000)}` }
    ]
  });

  const totalChars = estimateChatRequestChars(request.personality, request.runtimeUserPrompt, request.history);
  assert.ok(totalChars <= MAX_AI_CONTEXT_CHARS, '最终发送给 AI 的总字符量不应超过 50000');
  assert.ok(request.history.some((item) => item.text.includes('最新消息-')), '应优先保留最近消息');
  assert.ok(request.history.every((item) => !item.text.includes('最早消息-')), '预算不足时应先丢弃最早消息');
}

{
  const request = buildBudgetedChatRequest({
    personality: `超长角色设定-${'甲'.repeat(500000)}`,
    runtimeUserPrompt: [
      '【当前北京时间】2026/7/6 22:00',
      '【当前用户信息】',
      `- 用户基础资料：昵称：小满；微信号：xiaoman_01；性别：女；年龄：24；地区：杭州；签名：${'慢慢来'.repeat(120)}；状态：最近在准备考试；星座：巨蟹座；MBTI：INFP；职业：插画师；性格特质：慢热但细腻；兴趣爱好：咖啡、散步、画画；个人描述：容易被细节打动；口头禅：先喝口水`,
      '- 使用方式：这些资料是当前用户的结构化背景；回复需要承接关系、状态或连续性时，优先自然引用一处未冲突且不过期的用户信息。',
      '【联系人记忆】',
      '- 用户最近睡眠不好，希望被温柔提醒早点休息'
    ].join('\n'),
    history: [
      { role: 'user', text: `最新消息-${'新'.repeat(16000)}` }
    ]
  });

  const totalChars = estimateChatRequestChars(request.personality, request.runtimeUserPrompt, request.history);
  assert.ok(totalChars <= MAX_AI_CONTEXT_CHARS, '超长角色设定下仍不应超过总预算');
  assert.match(request.runtimeUserPrompt, /昵称：小满/, '超长角色设定不能挤掉用户昵称');
  assert.match(request.runtimeUserPrompt, /状态：最近在准备考试/, '超长角色设定不能挤掉用户近期状态');
  assert.match(request.runtimeUserPrompt, /兴趣爱好：咖啡、散步、画画/, '超长角色设定不能挤掉可自然引用的用户兴趣');
}

{
  const runtimeUserPrompt = [
    '【当前用户信息】',
    `- 用户基础资料：${'用户背景很长。'.repeat(4000)}`,
    '【联系人记忆】',
    `- ${'长期记忆很长。'.repeat(4000)}`,
    '【本轮剧情输入语义】用户选择了“剧情”输入，应作为当前场景片段处理。',
    '【剧情连续性锚点】',
    '【本轮剧情导演卡】',
    '- 回应焦点：用户：（动作）把蓝色通行牌按在门禁上',
    '- 层级顺序：最后真实用户输入 > 本轮剧情导演卡 > 最近剧情摘要 > 更早历史。'
  ].join('\n');
  const request = buildBudgetedChatRequest({
    personality: `超长角色设定-${'甲'.repeat(500000)}`,
    runtimeUserPrompt,
    history: [
      { role: 'user', text: `最新消息-${'新'.repeat(16000)}` }
    ]
  });

  const totalChars = estimateChatRequestChars(request.personality, request.runtimeUserPrompt, request.history);
  assert.ok(totalChars <= MAX_AI_CONTEXT_CHARS, '剧情运行时提示超长时仍不应超过总预算');
  assert.match(request.runtimeUserPrompt, /【本轮剧情导演卡】/, '预算裁剪后仍应保留靠近尾部的剧情导演卡');
  assert.match(request.runtimeUserPrompt, /把蓝色通行牌按在门禁上/, '预算裁剪后仍应保留本轮剧情回应焦点');
}

{
  const hugeImageUrl = `data:image/png;base64,${'a'.repeat(120000)}`;
  const request = buildBudgetedChatRequest({
    personality: '系统提示词',
    runtimeUserPrompt: '运行时提示',
    history: [
      { role: 'user', text: '这是一张很大的图片', imageUrl: hugeImageUrl }
    ]
  });

  const totalChars = estimateChatRequestChars(request.personality, request.runtimeUserPrompt, request.history);
  assert.ok(totalChars <= MAX_AI_CONTEXT_CHARS, '超大图片上下文也必须被压到 50000 字符预算内');
  assert.equal(request.history[0]?.imageUrl, undefined, '内置 AI 上下文预算应自动丢弃图片内容，避免 dataURL 继续传给模型');
}

{
  const request = buildBudgetedChatRequest({
    personality: { text: '对象系统提示不应被强转' } as any,
    runtimeUserPrompt: ['对象运行时提示不应被强转'] as any,
    history: [
      { role: 'user', text: { text: '对象历史不应被强转' } as any },
      { role: 'model', text: 404 as any }
    ]
  });

  assert.equal(request.personality, '', '预算层不应把对象型系统提示强转成 [object Object]');
  assert.equal(request.runtimeUserPrompt, '', '预算层不应把数组型运行时提示强转成可发送文本');
  assert.deepEqual(request.history, [{ role: 'model', text: '404' }], '预算层只应保留可展示标量历史文本');
  assert.equal(estimateChatRequestChars({ text: '对象系统提示' } as any, ['对象运行时'] as any, request.history), 3, '预算估算也不应把对象或数组强转成文本');
}

{
  assert.equal(clampContextMessageLimit(30), 30, '正常上下文条数不应被改动');
  assert.equal(clampContextMessageLimit(0), 1, '上下文条数最少为 1');
  assert.equal(clampContextMessageLimit(999999), 200, '上下文条数应有硬上限，避免前端构造超大历史');
}

{
  const breakdown = estimateChatRequestUsageBreakdown(
    '系统提示',
    '运行时提示',
    [
      { role: 'user', text: '你好', imageUrl: 'data:image/png;base64,abc' },
      { role: 'user', text: '【群成员列表】\n成员资料' }
    ]
  );
  assert.deepEqual(
    breakdown.map((item) => item.label),
    ['角色设定 / 世界书 / 模板', '记忆 / 时间 / 本轮规则', '最近聊天记录 / 群成员资料'],
    '上下文占用明细应覆盖系统提示、运行时提示和历史文本'
  );
  assert.equal(breakdown.find((item) => item.key === 'historyText')?.chars, '你好【群成员列表】\n成员资料'.length, '历史文本字符数应包含群成员资料');
  assert.equal(breakdown.some((item) => item.label.includes('图片')), false, '图片内容已自动丢弃，不应出现在占用明细里');
}

{
  assert.equal(shouldApplyAiContextBudget('builtin'), true, '内置 AI 应启用上下文预算');
  assert.equal(shouldApplyAiContextBudget('custom'), false, '自定义 API 不应启用上下文预算');
  assert.equal(shouldApplyAiContextBudget('gemini'), false, '非内置提供商不应启用上下文预算');
}

console.log('测试通过：AI 上下文预算会限制总量、优先保留最近消息并拦截异常大的图片上下文。');
