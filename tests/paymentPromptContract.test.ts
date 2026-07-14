import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPaymentProtocolLines } from '../src/utils/prompt/paymentPrompt.ts';
import { hasBlockedPaymentSpecialIntent } from '../src/app/sendMessage/specialMessages.ts';

const personaPromptOutputSource = readFileSync(new URL('../src/utils/prompt/personaPromptOutput.ts', import.meta.url), 'utf8');
const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');
const specialMessagesSource = readFileSync(new URL('../src/app/sendMessage/specialMessages.ts', import.meta.url), 'utf8');
const singleChatFlowSource = readFileSync(new URL('../src/app/sendMessage/singleChatFlow.ts', import.meta.url), 'utf8');
const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
const groupReplyParserSource = readFileSync(new URL('../src/utils/chat/groupReplyParser.ts', import.meta.url), 'utf8');

{
  const lines = buildPaymentProtocolLines({ balance: 12.5, includeGroupHint: true }).join('\n');

  assert.match(lines, /只有输出 redpacket 或 transfer 类型，系统才会生成可领取\/可收款的消息/, '支付协议应说明必须走系统类型');
  assert.match(lines, /真实扣减付款角色的钱包余额/, '支付协议应说明付款会真实扣减角色余额');
  assert.match(lines, /对方是否领取、收款、退回或失效只能由后续系统状态决定/, '支付协议应说明领取收款状态由系统决定');
  assert.match(lines, /真的愿意付款时才使用 redpacket\/transfer/, '支付协议应要求结合关系和语境判断是否愿意付款');
  assert.match(lines, /红包更适合祝福、安慰、玩笑、节日、AA小额补贴/, '支付协议应说明红包适用场景');
  assert.match(lines, /转账更适合明确还款、报销、补偿、约定金额或郑重给钱/, '支付协议应说明转账适用场景');
  assert.match(lines, /普通正文只代表聊天文本；红包、转账等系统能力必须通过对应结构化类型落地/, '支付协议应禁止口头假装支付');
  assert.match(lines, /想付款必须使用对应系统类型/, '支付协议应要求支付走结构化系统类型');
  assert.match(lines, /正文写成已完成支付、已领取、已收款或系统通知/, '支付协议应禁止正文伪造支付结果');
  assert.match(lines, /当前可用余额上限：¥12\.50/, '支付协议应包含角色余额上限');
  assert.match(lines, /单笔 amount 和本轮多笔合计都不得超过该余额/, '支付协议应说明同一轮多笔支付也要累计受余额限制');
  assert.match(lines, /\[系统红包·待领取\/已领取\/已失效\/已退回\]/, '支付协议应说明历史里的系统红包状态标签才是真实支付记录');
  assert.match(lines, /\[系统转账·待收款\/已收款\/已失效\/已退回\]/, '支付协议应说明历史里的系统转账状态标签才是真实支付记录');
  assert.match(lines, /speakerId 对应的角色才是付款方/, '群聊支付协议应说明付款方来自 speakerId');
  assert.match(lines, /同一成员本轮多笔合计不得超过该成员完整资料里的钱包余额/, '群聊支付协议应说明按成员钱包余额累计限制金额');
}

assert.match(personaPromptOutputSource, /buildPaymentProtocolLines\(\{ balance: input\.contact\.balance \}\)/, '单聊能力说明应接入共享支付协议');
assert.match(personaPromptOutputSource, /"type": "redpacket", "amount": "8\.88", "message": "红包留言"/, '单聊 JSON 模板应包含红包类型');
assert.match(personaPromptOutputSource, /"type": "transfer", "amount": "8\.88", "message": "转账说明"/, '单聊 JSON 模板应包含转账类型');

assert.match(promptBuildersSource, /const messageTypeOptions = mode === 'story'/, '群聊 JSON 模板应按聊天模式动态收紧可用消息类型');
assert.match(promptBuildersSource, /\? \['text'\]\s*: \['text', \.\.\.systemAbilityTypes\]/, '剧情群聊 JSON 模板应只允许 text 类型');
assert.match(promptBuildersSource, /mode === 'story'[\s\S]*"content":"短句原文"/, '剧情群聊 JSON 模板不应继续使用红包、转账或语音说明');
assert.match(promptBuildersSource, /const groupAbilityLabels = mode === 'story'/, '群聊可用能力清单应按聊天模式动态收紧');
assert.match(promptBuildersSource, /buildPaymentProtocolLines\(\{ includeGroupHint: true \}\)/, '群聊提示词应接入共享支付协议');
assert.match(promptBuildersSource, /\.\.\.\(mode === 'story' \? \[\] : buildPaymentProtocolLines\(\{ includeGroupHint: true \}\)\)/, '剧情群聊不应注入支付协议');
assert.match(promptBuildersSource, /const systemAbilityRuleLines = mode === 'story'\s*\?\s*\[\]/, '剧情群聊不应注入普通聊天系统能力说明');
assert.match(promptBuildersSource, /不能写成普通正文里的假支付/, '群聊提示词应禁止把支付写成普通文本');

assert.match(specialMessagesSource, /remainingPaymentBalance/, 'AI 单聊支付落地前应按本轮剩余余额累计校验');
assert.match(specialMessagesSource, /paymentStatus: 'pending'/, 'AI 单聊支付应落地为待领取状态');
assert.match(specialMessagesSource, /isOpened: false/, 'AI 单聊支付不应默认视为已领取');
assert.doesNotMatch(specialMessagesSource, /恭喜发财，大吉大利|转账 ¥\$\{normalizedAmount\}/, 'AI 单聊支付缺少留言时不应补默认祝福或转账说明');
assert.doesNotMatch(groupReplyParserSource, /恭喜发财，大吉大利|转账 ¥\$\{normalizedAmount\}/, 'AI 群聊支付缺少留言时不应补默认祝福或转账说明');
assert.match(specialMessagesSource, /hasBlockedPaymentSpecialIntent/, 'AI 单聊支付应提供结构化预检，避免支付失败后正文先落地');
assert.match(specialMessagesSource, /hasLandableSpecialMessageIntent/, 'AI 单聊系统能力应提供可落地预检，避免无效 special 被当成有效回复');
assert.match(singleChatFlowSource, /hasBlockedPaymentSpecialIntent\(parsed\.specials, contact, specialRuntimeParams\)/, '单聊首发应在主文本落地前预检支付 special');
assert.match(resendFlowSource, /hasBlockedPaymentSpecialIntent\(parsed\.specials \|\| \[], contact, specialRuntimeParams\)/, '单聊重发应在主文本落地前预检支付 special');
assert.match(singleChatFlowSource, /hasLandableSpecialMessageIntent\(parsed\.specials, contact, specialRuntimeParams, selectedContactId\)/, '单聊首发不应把无法落地的 special 当作有效回复内容');
assert.match(resendFlowSource, /hasLandableSpecialMessageIntent\(parsed\.specials \|\| \[], contact, specialRuntimeParams, selectedContactId\)/, '单聊重发不应把无法落地的 special 当作有效回复内容');
assert.match(singleChatFlowSource, /single_send_blocked_payment_special/, '单聊首发拦截无效支付时应结束本轮回复任务');
assert.match(resendFlowSource, /single_resend_blocked_payment_special/, '单聊重发拦截无效支付时应结束本轮回复任务');
assert.match(groupReplyParserSource, /collectBlockedSystemAbilitySpeakerIds/, '群聊解析应预检无效系统能力意图，避免能力失败后同成员正文继续落地');
assert.match(groupReplyParserSource, /blockedSystemAbilitySpeakerIds\.has\(speakerId\)/, '群聊解析应在主消息落地前拦截存在无效系统能力意图的同一成员输出');

{
  const runtimeParams = { user: { name: '小满', avatar: '' } as any, aiSettings: {} as any };
  const baseContact = {
    id: 'c1',
    name: '林夏',
    chatMode: 'online',
    balance: 10,
    avatar: ''
  } as any;

  assert.equal(
    hasBlockedPaymentSpecialIntent([
      { type: 'redpacket', amount: '3.50', message: '奶茶' } as any,
      { type: 'transfer', amount: '6.50', message: '补给你' } as any
    ], baseContact, runtimeParams),
    false,
    '合法且累计不超过余额的支付 special 不应被预检拦截'
  );
  assert.equal(
    hasBlockedPaymentSpecialIntent([
      { type: 'redpacket', amount: '7', message: '先发一笔' } as any,
      { type: 'transfer', amount: '4', message: '再补一笔' } as any
    ], baseContact, runtimeParams),
    true,
    '同一轮多笔支付累计超过余额时应在主文本落地前拦截'
  );
  assert.equal(
    hasBlockedPaymentSpecialIntent([{ type: 'transfer', amount: '6.666', message: '金额非法' } as any], baseContact, runtimeParams),
    true,
    '非法金额支付 special 应在主文本落地前拦截'
  );
  assert.equal(
    hasBlockedPaymentSpecialIntent([{ type: 'redpacket', amount: '1', message: '剧情模式不应发红包' } as any], {
      ...baseContact,
      chatMode: 'story'
    }, runtimeParams),
    true,
    '剧情模式禁用支付能力时应在主文本落地前拦截支付 special'
  );
}

console.log('测试通过：红包/转账提示词与单聊支付落地规则稳定。');
