import { buildSystemAbilityBoundaryLine } from './systemAbilityBoundaryPrompt.ts';

type ReplySuggestionQualityOptions = {
  isStoryChat?: boolean;
  linePrefix?: string;
};

export const buildReplySuggestionQualityLines = (options: ReplySuggestionQualityOptions = {}): string[] => {
  const prefix = options.linePrefix || '';
  const shared = [
    `${prefix}候选句必须承接联系人上一句的具体信息、情绪、关系变化或当前事件，不要生成可以套进任何聊天的泛泛回复。`,
    `${prefix}候选句要保持“用户本人”的口吻、边界和关系立场；可以有犹豫、试探、玩笑、安抚、追问或推进，但情绪必须有来由。`,
    `${prefix}相关时自然体现用户资料、当前面具或联系人记忆中的一处具体线索，例如近况、兴趣、职业、地区、关系经历或表达习惯；不要写成与用户无关的通用回复。`,
    `${prefix}三句候选要给用户不同选择：至少在态度、推进方式或情绪强度上明显区分，不要只是同一句话换词。`,
    `${prefix}优先给可直接发送的短句，少用总结式、客服式或解释提示词的表达。`,
    `${prefix}历史里的心声、动作、旁白或翻译只能作为理解上下文的参考，不能继承为候选句格式。`,
    buildSystemAbilityBoundaryLine({ linePrefix: prefix, subject: '候选句', textLabel: '用户将要发送的普通正文' })
  ];
  if (!options.isStoryChat) return shared;
  return [
    ...shared,
    `${prefix}剧情候选要推动当前场景：优先制造选择、回应冲突、暴露态度或留下下一步钩子，避免只寒暄。`,
    `${prefix}可以体现用户人设的欲望、顾虑和策略，但不能替联系人行动，也不能提前写出对方反应。`
  ];
};
