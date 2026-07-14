export const DEFAULT_SYSTEM_ABILITY_LABELS = ['红包', '转账', '位置', '拍一拍', '语音', '通话'];

type SystemAbilityBoundaryOptions = {
  linePrefix?: string;
  subject?: string;
  textLabel?: string;
  abilities?: string[];
};

export const buildSystemAbilityBoundaryLine = (options: SystemAbilityBoundaryOptions = {}): string => {
  const prefix = options.linePrefix || '';
  const subject = options.subject || '普通正文';
  const textLabel = options.textLabel || '普通聊天文本';
  const abilities = (options.abilities && options.abilities.length > 0)
    ? options.abilities
    : DEFAULT_SYSTEM_ABILITY_LABELS;
  return `${prefix}${subject}只代表${textLabel}；${abilities.join('、')}等系统能力必须通过对应结构化类型落地，不能在正文中宣称系统状态已发生。`;
};
