import { buildSystemAbilityBoundaryLine } from './systemAbilityBoundaryPrompt.ts';

type PaymentPromptOptions = {
  balance?: number | null;
  includeGroupHint?: boolean;
};

const formatBalance = (balance: number | null | undefined): string => (
  Number.isFinite(Number(balance)) ? Number(balance).toFixed(2) : ''
);

export const buildPaymentProtocolLines = (options: PaymentPromptOptions = {}): string[] => {
  const balanceText = formatBalance(options.balance);
  return [
    '- 红包和转账是真实系统能力：只有输出 redpacket 或 transfer 类型，系统才会生成可领取/可收款的消息。',
    '- 红包/转账会真实扣减付款角色的钱包余额，并生成“待领取/待收款”的系统消息；对方是否领取、收款、退回或失效只能由后续系统状态决定。',
    '- 只有当角色在当前关系、语境和余额下真的愿意付款时才使用 redpacket/transfer；不要因为用户随口提钱就机械付款，也不要把大额付款当成普通聊天表情。',
    '- 红包更适合祝福、安慰、玩笑、节日、AA小额补贴等轻量场景；转账更适合明确还款、报销、补偿、约定金额或郑重给钱。',
    `- ${buildSystemAbilityBoundaryLine({ subject: '普通正文', textLabel: '聊天文本', abilities: ['红包', '转账'] })}想付款必须使用对应系统类型。`,
    '- 如果决定付款，普通正文可以表达态度或说明原因，但不能把正文写成已完成支付、已领取、已收款或系统通知。',
    '- amount 必须是正数，最多两位小数；余额不足时不要输出 redpacket/transfer，改用符合人设的普通回复。',
    balanceText ? `- 当前可用余额上限：¥${balanceText}；redpacket/transfer 的单笔 amount 和本轮多笔合计都不得超过该余额。` : '',
    '- 红包 content/message 写祝福语或留言；转账 content/message 写简短说明，不要伪造“已领取、已收款、已退回、已失效”。',
    '- 支付状态由系统和历史记录决定；历史里的 [系统红包·待领取/已领取/已失效/已退回]、[系统转账·待收款/已收款/已失效/已退回] 才代表真实支付记录，只能根据其中状态自然回应。',
    options.includeGroupHint ? '- 群聊中也必须遵守同一支付规则；speakerId 对应的角色才是付款方，单笔 amount 和同一成员本轮多笔合计不得超过该成员完整资料里的钱包余额。' : ''
  ].filter(Boolean);
};
