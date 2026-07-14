type ContextSemanticsOptions = {
  linePrefix?: string;
};

export const buildChatContextSemanticsLines = (options: ContextSemanticsOptions = {}): string[] => {
  const prefix = options.linePrefix || '';
  return [
    `${prefix}历史里的【系统】、[系统红包·状态]、[系统转账·状态]、通话、位置等是界面事件或已发生事实，不是用户台词，也不是角色可模仿的输出格式。`,
    `${prefix}不要在普通回复中伪造【系统】通知、领取结果、收款结果或界面状态；只能根据历史事实自然回应。`,
    `${prefix}历史里的【用户行为】表示用户通过“做”发送的真实行为或意图，应按用户动作理解并回应，但不要把【用户行为】当成可输出格式。`
  ];
};
