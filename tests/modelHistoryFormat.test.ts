import assert from 'node:assert/strict';
import { buildBeijingTimeAwarenessPrompt, formatMessageForModelHistory } from '../src/utils/chat/modelHistoryFormat.ts';

// 复现：历史上下文仅使用 message.content，导致纯心声/动作/旁白（content 为空）在传递给模型时丢失；
// 同时 system/call 等类型缺少可读文本，会变成空上下文。
// 期望：格式化后的上下文文本包含心声/动作/旁白，并对系统/通话等类型输出可读标签；
// 当 includeTimestamp 开启时，前缀为详细的北京时间日期时间（含周几），不包含任何时区字样。

{
  const ts = Date.parse('2026-03-16T07:42:33.000Z'); // 北京时间：2026-03-16 15:42:33 周一
  const msg: any = {
    id: 'm1',
    senderId: 'me',
    content: '你好',
    timestamp: ts,
    type: 'text',
    translatedContentZhCN: 'Hello',
    innerVoice: '有点困',
    actionDesc: '揉揉眼睛',
    narrationDesc: '背景音乐渐弱'
  };
  const formatted = formatMessageForModelHistory(msg, { includeTimestamp: true });
  assert.ok(formatted, '文本消息应可被格式化');
  assert.ok(formatted!.text.startsWith('[2026-03-16 15:42:33 周一]'), '时间前缀应为详细北京时间且包含周几');
  assert.ok(formatted!.text.includes('你好'), '正文应保留');
  assert.ok(formatted!.text.includes('【心声】有点困'), '心声应进入上下文');
  assert.ok(formatted!.text.includes('【动作】揉揉眼睛'), '动作应进入上下文');
  assert.ok(formatted!.text.includes('【旁白】背景音乐渐弱'), '旁白应进入上下文');
  assert.ok(formatted!.text.includes('【译文】Hello'), '双语译文应进入普通聊天历史，避免后续上下文丢翻译');
  const noTranslation = formatMessageForModelHistory(msg, { includeTranslation: false });
  assert.ok(noTranslation, '关闭译文历史时仍应保留正文');
  assert.ok(!noTranslation!.text.includes('【译文】'), '指定关闭译文历史时不应输出译文标签');
}

{
  const ts = Date.parse('2026-03-16T07:42:33.000Z');
  const metaOnly: any = {
    id: 'm2',
    senderId: 'me',
    content: '',
    timestamp: ts,
    type: 'text',
    innerVoice: '别表现出来',
    actionDesc: '',
    narrationDesc: '她停顿了一下'
  };
  const formatted = formatMessageForModelHistory(metaOnly, { includeTimestamp: true });
  assert.ok(formatted, '纯心声/旁白消息应可被格式化');
  assert.ok(formatted!.text.startsWith('[2026-03-16 15:42:33 周一]'), '纯元信息也应带时间前缀');
  assert.ok(formatted!.text.includes('【心声】别表现出来'), '纯心声不应丢失');
  assert.ok(formatted!.text.includes('【旁白】她停顿了一下'), '纯旁白不应丢失');
}

{
  const ts = Date.parse('2026-03-16T07:42:33.000Z');
  const userDoMessage: any = {
    id: 'm-do',
    senderId: 'me',
    content: '',
    timestamp: ts,
    type: 'text',
    actionDesc: '轻轻敲了两下桌面'
  };
  const formatted = formatMessageForModelHistory(userDoMessage, {
    includeTimestamp: false,
    allowedMeta: { inner: false, action: false, narration: false }
  });
  assert.ok(formatted, '用户主动使用做模式发送的消息不应在历史里丢失');
  assert.equal(formatted!.text, '【用户行为】轻轻敲了两下桌面', '当前模式不允许动作时，用户做发送应保留语义但不暴露动作格式标签');
}

{
  const ts = Date.parse('2026-03-16T07:42:33.000Z');
  const aiMetaOnly: any = {
    id: 'm-ai-meta',
    senderId: 'c1',
    content: '',
    timestamp: ts,
    type: 'text',
    actionDesc: '把伞收了起来'
  };
  const formatted = formatMessageForModelHistory(aiMetaOnly, {
    includeTimestamp: false,
    allowedMeta: { inner: false, action: false, narration: false }
  });
  assert.equal(formatted, null, '模式禁用动作时，AI 历史动作元信息仍应继续被过滤');
}

{
  const polluted: any = {
    id: 'm-polluted',
    senderId: 'c1',
    content: { text: '旧格式正文不应被强转' },
    timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
    type: 'text',
    innerVoice: { value: '旧格式心声不应被强转' },
    actionDesc: ['旧格式动作不应被强转'],
    narrationDesc: { text: '旧格式旁白不应被强转' },
    translatedContentZhCN: { text: '旧格式译文不应被强转' }
  };
  const formatted = formatMessageForModelHistory(polluted, { includeTimestamp: false });
  assert.equal(formatted, null, '历史文本字段只接受可展示标量，不应把对象或数组强转成 [object Object]');
}

{
  const numericContent: any = {
    id: 'm-number',
    senderId: 'c1',
    content: 404,
    timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
    type: 'text'
  };
  const formatted = formatMessageForModelHistory(numericContent, { includeTimestamp: false });
  assert.equal(formatted?.text, '404', '数字型旧数据仍可作为可展示文本进入历史上下文');
}

{
  const ts = Date.parse('2026-03-16T07:42:33.000Z');
  const callMsg: any = {
    id: 'c1',
    senderId: '1',
    content: '',
    timestamp: ts,
    type: 'call',
    callStatus: 'ended',
    callDurationSec: 125
  };
  const formatted = formatMessageForModelHistory(callMsg, { includeTimestamp: false });
  assert.ok(formatted, '通话消息应可被格式化');
  assert.equal(formatted!.text, '【通话】通话 02:05', '通话应输出可读摘要（mm:ss）');
}

{
  const ts = Date.parse('2026-03-16T07:42:33.000Z');
  const sysMsg: any = {
    id: 's1',
    senderId: 'system',
    content: '你已添加对方为好友',
    timestamp: ts,
    type: 'system'
  };
  const formatted = formatMessageForModelHistory(sysMsg, { includeTimestamp: false });
  assert.ok(formatted, '系统消息应可被格式化');
  assert.equal(formatted!.text, '【系统】你已添加对方为好友', '系统消息应带【系统】标签');
}

{
  const patMsg: any = {
    id: 's-pat',
    senderId: 'system',
    content: '',
    timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
    type: 'system',
    pat: { fromName: '林夏', targetName: '小满' }
  };
  const formatted = formatMessageForModelHistory(patMsg, { includeTimestamp: false });
  assert.ok(formatted, '拍一拍系统通知应可被格式化');
  assert.equal(formatted!.text, '【系统】林夏 拍了拍 小满', '拍一拍应作为系统事件进入模型历史，而不是普通台词');
}

{
  const basePayment: any = {
    id: 'pay-1',
    senderId: '1',
    content: '恭喜发财',
    amount: '8.88',
    timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
    type: 'redpacket'
  };
  assert.equal(
    formatMessageForModelHistory({ ...basePayment, paymentStatus: 'pending', isOpened: false })!.text,
    '[系统红包·待领取] ¥8.88 恭喜发财',
    '未领取红包应在模型历史里明确为系统支付记录，并带金额和待领取状态'
  );
  assert.equal(
    formatMessageForModelHistory({ ...basePayment, paymentStatus: 'received', isOpened: true })!.text,
    '[系统红包·已领取] ¥8.88 恭喜发财',
    '已领取红包应在模型历史里明确为系统支付记录，并带金额和已领取状态'
  );
  assert.equal(
    formatMessageForModelHistory({ ...basePayment, paymentStatus: 'expired', isOpened: false })!.text,
    '[系统红包·已失效] ¥8.88 恭喜发财',
    '失效红包应在模型历史里明确为系统支付记录，并带金额和失效状态'
  );
  assert.equal(
    formatMessageForModelHistory({
      ...basePayment,
      type: 'transfer',
      content: '转账 ¥8.88',
      paymentStatus: 'refunded',
      isOpened: false
    })!.text,
    '[系统转账·已退回] ¥8.88',
    '已退回转账应在模型历史里明确为系统支付记录，并带金额和退回状态，且不重复默认转账正文'
  );
  assert.equal(
    formatMessageForModelHistory({
      ...basePayment,
      type: 'transfer',
      content: '买咖啡',
      amount: '8.8',
      paymentStatus: 'pending',
      isOpened: false
    })!.text,
    '[系统转账·待收款] ¥8.80 买咖啡',
    '带说明的转账应明确为系统支付记录、保留说明，并把金额规范为两位小数'
  );
  assert.equal(
    formatMessageForModelHistory({
      ...basePayment,
      type: 'transfer',
      content: '转账 ¥8.88',
      paymentStatus: 'received',
      isOpened: true
    })!.text,
    '[系统转账·已收款] ¥8.88',
    '已收款转账应在模型历史里使用收款语义，而不是红包领取语义'
  );
}

{
  const now = new Date('2026-03-16T07:42:33.000Z');
  const prompt = buildBeijingTimeAwarenessPrompt(true, now);
  assert.ok(prompt.includes('【当前北京时间】'), '时间感知提示词应明确为北京时间');
  assert.ok(prompt.includes('2026-03-16 15:42:33 周一'), '时间感知提示词应包含详细日期时间与周几');
  assert.ok(prompt.includes('不要主动把完整日期、星期或具体时刻写进聊天正文'), '时间感知提示词应约束模型不要主动在前端聊天正文外显精确时间');
  assert.ok(!prompt.includes('UTC'), '时间感知提示词不应包含 UTC');
  assert.ok(!prompt.includes('Asia/Shanghai'), '时间感知提示词不应暴露时区字段');
  assert.ok(!prompt.includes('GMT'), '时间感知提示词不应包含 GMT 字样');
}

console.log('测试通过：历史上下文格式化可携带心声/动作/旁白与详细北京时间。');
