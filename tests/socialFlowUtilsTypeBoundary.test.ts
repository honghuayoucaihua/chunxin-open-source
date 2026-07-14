import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAiComments, normalizeAiLikeNames } from '../src/app/socialFlowUtils.ts';

assert.deepEqual(normalizeAiLikeNames('不是数组'), []);
assert.deepEqual(normalizeAiLikeNames([' 小满 ', '', null, '阿青']), ['小满', '阿青']);
assert.deepEqual(
  normalizeAiLikeNames(['小满【动作】点了个赞', '系统说明：内部昵称', '[红包] 阿青', '阿青', '南枝 [位置] 春信咖啡']),
  ['阿青'],
  'AI 点赞昵称混入动作、系统说明或系统事件格式时应整项拒收'
);
assert.deepEqual(
  normalizeAiLikeNames(['夏夏', '陌生昵称', '阿澈'], ['夏夏', '阿澈']),
  ['夏夏', '阿澈'],
  '联系人模式下 AI 点赞昵称必须由落地层按允许名单过滤'
);
assert.deepEqual(
  normalizeAiLikeNames(['夏夏', '陌生昵称'], ['夏夏', '阿澈'], { minCount: 2 }),
  [],
  'AI 点赞过滤后不足最小数量时不应展示半组成品'
);

const comments = normalizeAiComments([
  { user: '柚子', text: '写得真好' },
  { user: '阿青', text: '我也这么觉得', replyTo: '小满' },
  { user: '林夏', text: '今晚别硬撑了 【动作】把外套递过去' },
  { user: '阿澈', text: '【心声】有点担心\n早点休息' },
  { user: '南枝【动作】挥手', text: '这个角度真好【系统说明】隐藏', replyTo: '小满【系统说明】内部' },
  { user: '系统用户', text: '[系统红包·待领取] ¥8.88' },
  '非法项',
  { user: '', text: '缺少用户' },
  { user: '无内容', text: '' }
], 'test-comment');

assert.equal(comments.length, 2);
assert.equal(comments[0].user, '柚子');
assert.equal(comments[0].text, '写得真好');
assert.equal(comments[1].user, '阿青');
assert.equal(comments[1].replyTo, '小满');
assert.equal(comments[1].text, '我也这么觉得');

const legacyReplyFormatComments = normalizeAiComments([
  { user: '旧格式 回复 小满', text: '回复 小满：不应从文本猜回复对象' }
], 'legacy-reply-comment');
assert.equal(legacyReplyFormatComments.length, 1);
assert.equal(legacyReplyFormatComments[0]?.user, '旧格式 回复 小满');
assert.equal(legacyReplyFormatComments[0]?.replyTo, undefined, '朋友圈评论不应从 user/text 自然句式猜 replyTo');
assert.equal(legacyReplyFormatComments[0]?.text, '回复 小满：不应从文本猜回复对象');

const legacyFieldComments = normalizeAiComments([
  { name: '旧昵称', text: '不应补作者' },
  { user: '旧用户', content: '不应补正文' }
], 'legacy-field-comment');
assert.deepEqual(legacyFieldComments, [], '朋友圈评论不应使用 name/content 旧字段兜底 user/text');

const systemEventComments = normalizeAiComments([
  { user: '系统用户', text: '[系统红包·待领取] ¥8.88' },
  { user: '阿远', text: '这张很像你昨晚说的那家店。[位置] 春信咖啡' },
  { user: '林夏', text: '我给你转账了，先收下。' }
], 'system-event-comment');
assert.deepEqual(
  systemEventComments.map((item) => item.text),
  ['我给你转账了，先收下。'],
  'AI 评论应整条拒收明确系统能力格式，但不靠关键词猜测普通自然语言'
);

const paymentClaimComments = normalizeAiComments([
  { user: '林夏', text: '红包收下，买杯热的。' },
  { user: '林夏', text: '我现在不能给你转账，但可以陪你想办法。' }
], 'payment-claim-comment');
assert.deepEqual(
  paymentClaimComments.map((item) => item.text),
  ['红包收下，买杯热的。', '我现在不能给你转账，但可以陪你想办法。'],
  'AI 评论不应靠关键词猜测普通正文伪支付'
);

const allowedNameComments = normalizeAiComments([
  { user: '夏夏', text: '这句可以展示' },
  { user: '陌生昵称', text: '不应只靠提示词约束联系人名单' },
  { user: '阿澈', text: '这句也可以展示' }
], 'allowed-name-comment', ['夏夏', '阿澈']);
assert.deepEqual(
  allowedNameComments.map((item) => item.user),
  ['夏夏', '阿澈'],
  '联系人模式下 AI 评论用户名必须由落地层按允许名单过滤'
);
assert.deepEqual(
  normalizeAiComments([
    { user: '夏夏', text: '这句可以展示' },
    { user: '陌生昵称', text: '过滤后不足数量' }
  ], 'strict-allowed-name-comment', ['夏夏', '阿澈'], { minCount: 2 }),
  [],
  'AI 评论过滤后不足最小数量时不应展示半组成品'
);
assert.deepEqual(
  normalizeAiComments([
    { user: '夏夏', text: '红包收下，买杯热的。' },
    { user: '阿澈', text: '我现在不能给你转账，但可以陪你想办法。' }
  ], 'strict-payment-text-comment', ['夏夏', '阿澈'], { minCount: 2 }).map((item) => item.text),
  ['红包收下，买杯热的。', '我现在不能给你转账，但可以陪你想办法。'],
  'AI 评论严格数量模式仍不应靠关键词猜测普通自然语言'
);

const source = readFileSync(new URL('../src/app/socialFlowUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(source, /normalizeAiLikeNames = \(input: any\)/, 'AI 点赞归一化不应继续接收 input:any');
assert.doesNotMatch(source, /normalizeAiComments = \(input: any/, 'AI 评论归一化不应继续接收 input:any');
assert.doesNotMatch(source, /item: any/, 'AI 评论归一化不应继续使用 item:any');
assert.doesNotMatch(source, /userReplyPattern|inlinePattern/, 'AI 评论归一化不应从普通文本格式猜回复结构');
assert.match(source, /type MomentInteractionEvent =/, '朋友圈互动事件应有明确 payload 类型');
assert.match(source, /filter\(isRecord\)/, 'AI 评论归一化应先做对象类型守卫');
assert.match(source, /buildAllowedNameSet/, 'AI 互动归一化应支持结构化允许名单过滤');
assert.match(source, /allowedNameSet\.has\(name\)/, 'AI 点赞昵称应按允许名单过滤');
assert.match(source, /allowedNameSet\.has\(item\.user\)/, 'AI 评论用户名应按允许名单过滤');
assert.match(source, /minCount/, 'AI 朋友圈互动归一化应支持最小数量约束');

console.log('测试通过：朋友圈 AI 互动归一化已收紧 unknown record 边界。');
