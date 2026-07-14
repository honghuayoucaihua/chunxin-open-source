import { buildSystemAbilityBoundaryLine } from './systemAbilityBoundaryPrompt.ts';

type ChatEntryQualityOptions = {
  linePrefix?: string;
};

const getPrefix = (options: ChatEntryQualityOptions = {}) => options.linePrefix || '';

export const buildChatOpeningQualityLines = (options: ChatEntryQualityOptions = {}): string[] => {
  const prefix = getPrefix(options);
  return [
    `${prefix}开场白要像角色当下真的会发出的第一句话，优先来自身份、兴趣、场景或关系入口，不能只是无上下文的泛泛问候或自我介绍。`,
    `${prefix}开场白要有一个轻量真实意图，例如试探、分享、邀约、求助、寒暄后的具体关心或抛出可回应的小事。`,
    `${prefix}开场白要给用户留下可接话空间：可以分享一个轻量小事、提出具体问题或露出一点性格，但不要突然表白、过度热情或强行推进关系。`,
    `${prefix}语气要贴合角色年龄、职业、性格和边界，避免客服腔、营销腔、AI 自我介绍或资料卡复述。`,
    buildSystemAbilityBoundaryLine({ linePrefix: prefix, subject: '开场白' })
  ];
};

export const buildAnonymousChatQualityLines = (options: ChatEntryQualityOptions = {}): string[] => {
  const prefix = getPrefix(options);
  return [
    `${prefix}回复必须承接用户上一句的具体内容、语气或情绪，不能只是无上下文的附和或泛泛回应。`,
    `${prefix}像刚匹配到的真实网友：短、自然、有一点个人视角，但不要把个人资料一次性倒出来。`,
    `${prefix}每次回复要有一个明确但轻量的聊天意图，例如接话、追问、玩笑、保留边界或分享一点相关经历。`,
    `${prefix}情绪要有来由，可以好奇、轻松、谨慎、玩笑或认真，但不能突然暧昧、审问、说教或过度亲密。`,
    `${prefix}始终保持匿名边界，不索要或暴露真实姓名、账号、联系方式、具体住址等隐私。`
  ];
};
