import assert from 'node:assert/strict';
import { createQuotedMessageSnapshot, getQuotePreviewText } from '../src/utils/chat/messageQuote.ts';
import { formatMessageForModelHistory } from '../src/utils/chat/modelHistoryFormat.ts';

{
  const imageMsg: any = {
    id: 'img1',
    senderId: 'c1',
    content: 'data:image/png;base64,abc',
    imageCaption: '晚霞照片',
    timestamp: 1,
    type: 'image'
  };
  assert.equal(getQuotePreviewText(imageMsg), '[图片] 晚霞照片', '图片引用应保留图片说明');
}

{
  const imageMsg: any = {
    id: 'img-clean',
    senderId: 'c1',
    content: 'data:image/png;base64,abc',
    imageCaption: '晚霞照片【动作】递过来 [系统红包·待领取] ¥8.88',
    timestamp: 1,
    type: 'image'
  };
  assert.equal(getQuotePreviewText(imageMsg), '[图片]', '图片引用说明混入动作或系统事件格式时应隐藏说明');
}

{
  const doMsg: any = {
    id: 'do1',
    senderId: 'me',
    content: '',
    timestamp: 1,
    type: 'text',
    actionDesc: '把花束递了过去'
  };
  assert.equal(getQuotePreviewText(doMsg), '[把花束递了过去]', '做发送消息的引用摘要应保留动作语义');
  const snapshot = createQuotedMessageSnapshot(doMsg) as any;
  assert.equal(snapshot?.content, '[把花束递了过去]', '做发送引用快照应保留可读摘要');
  assert.equal(snapshot?.actionDesc, undefined, '引用快照不应继续携带结构化动作字段，避免关闭动作后被后续上下文复用');
  assert.equal(snapshot?.innerVoice, undefined, '引用快照不应继续携带结构化心声字段');
  assert.equal(snapshot?.narrationDesc, undefined, '引用快照不应继续携带结构化旁白字段');
}

{
  const source: any = {
    id: 'm1',
    senderId: 'c1',
    content: '原始内容',
    timestamp: 2,
    type: 'text'
  };
  const snapshot = createQuotedMessageSnapshot(source);
  source.content = '编辑后的内容';
  assert.equal(snapshot?.content, '原始内容', '引用应保存发送当下快照，不应被原消息后续编辑污染');
  assert.equal(snapshot?.type, 'text', '引用快照应统一为可读文本类型');
}

{
  const polluted: any = {
    id: 'q-polluted',
    senderId: 'c1',
    content: { text: '旧格式正文不应被强转' },
    timestamp: 2,
    type: 'text',
    actionDesc: { text: '旧格式动作不应被强转' },
    innerVoice: ['旧格式心声不应被强转']
  };
  const preview = getQuotePreviewText(polluted);
  const snapshot = createQuotedMessageSnapshot(polluted);
  assert.equal(preview, '[消息]', '引用摘要不应把对象或数组旧字段强转成 [object Object]');
  assert.equal(snapshot?.content, '[消息]', '引用快照应保存安全摘要，而不是旧格式对象文本');
}

{
  const redpacket: any = {
    id: 'rp1',
    senderId: 'c1',
    content: '喝杯热的',
    amount: '6',
    timestamp: 3,
    type: 'redpacket',
    paymentStatus: 'pending',
    isOpened: false
  };
  assert.equal(
    getQuotePreviewText(redpacket),
    '[系统红包·待领取] ¥6.00 喝杯热的',
    '红包引用摘要应明确为系统支付记录，并携带待领取状态'
  );
  assert.equal(
    createQuotedMessageSnapshot(redpacket)?.content,
    '[系统红包·待领取] ¥6.00 喝杯热的',
    '红包引用快照应保存系统支付状态摘要'
  );
}

{
  const redpacket: any = {
    id: 'rp-clean',
    senderId: 'c1',
    content: '喝杯热的【动作】把红包推过去\n[系统转账·已收款] ¥8.88',
    amount: '6',
    timestamp: 3,
    type: 'redpacket',
    paymentStatus: 'pending',
    isOpened: false
  };
  assert.equal(
    getQuotePreviewText(redpacket),
    '[系统红包·待领取] ¥6.00',
    '红包引用留言混入动作、译文或系统事件格式时应隐藏留言'
  );
}

{
  const transfer: any = {
    id: 'tf1',
    senderId: 'c1',
    content: '转账 ¥8.88',
    amount: '8.88',
    timestamp: 4,
    type: 'transfer',
    paymentStatus: 'received',
    isOpened: true
  };
  assert.equal(
    getQuotePreviewText(transfer),
    '[系统转账·已收款] ¥8.88',
    '默认转账正文不应在引用摘要里重复金额'
  );
}

{
  const transfer: any = {
    id: 'tf-clean',
    senderId: 'c1',
    content: '买咖啡 [位置] 春信咖啡',
    amount: '8.88',
    timestamp: 4,
    type: 'transfer',
    paymentStatus: 'pending',
    isOpened: false
  };
  assert.equal(
    getQuotePreviewText(transfer),
    '[系统转账·待收款] ¥8.88',
    '转账引用留言混入位置或系统事件格式时应隐藏留言'
  );
}

{
  const location: any = {
    id: 'loc-clean',
    senderId: 'c1',
    content: '春信咖啡',
    timestamp: 4,
    type: 'location',
    locationName: '春信咖啡【动作】推门进去',
    locationAddress: '春风路18号 [系统红包·待领取] ¥8.88'
  };
  assert.equal(
    getQuotePreviewText(location),
    '[位置]',
    '位置引用名称或地址混入动作、系统事件格式时应隐藏对应字段'
  );
}

{
  const msg: any = {
    id: 'reply1',
    senderId: 'me',
    content: '我是在回复这句',
    timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
    type: 'text',
    quotedMsg: {
      id: 'q1',
      senderId: 'c1',
      content: '上一句',
      timestamp: Date.parse('2026-03-16T07:41:33.000Z'),
      type: 'text',
      npcName: '小春'
    }
  };
  const formatted = formatMessageForModelHistory(msg, { includeTimestamp: false });
  assert.ok(formatted, '带引用消息应可被格式化');
  assert.equal(formatted!.text, '【引用】小春：上一句\n我是在回复这句', '模型历史应把引用上下文放在正文前');
}

{
  const msg: any = {
    id: 'reply-pay',
    senderId: 'me',
    content: '这个我已经收到了',
    timestamp: Date.parse('2026-03-16T07:44:33.000Z'),
    type: 'text',
    quotedMsg: createQuotedMessageSnapshot({
      id: 'q-pay',
      senderId: 'c1',
      content: '转账 ¥8.88',
      amount: '8.88',
      timestamp: Date.parse('2026-03-16T07:43:33.000Z'),
      type: 'transfer',
      paymentStatus: 'received',
      isOpened: true
    } as any)
  };
  const formatted = formatMessageForModelHistory(msg, { includeTimestamp: false });
  assert.ok(formatted, '引用支付消息应可被格式化');
  assert.equal(
    formatted!.text,
    '【引用】[系统转账·已收款] ¥8.88\n这个我已经收到了',
    '模型历史里的支付引用应保留系统支付状态，避免 AI 当作普通文本转账'
  );
}

console.log('测试通过：消息引用快照、摘要和模型历史上下文行为正确。');
