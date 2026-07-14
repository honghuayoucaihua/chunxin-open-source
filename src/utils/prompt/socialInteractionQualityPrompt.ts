import { buildSystemAbilityBoundaryLine } from './systemAbilityBoundaryPrompt.ts';

type SocialQualityOptions = {
  linePrefix?: string;
};

const getPrefix = (options: SocialQualityOptions = {}) => options.linePrefix || '';

export const buildMomentPostQualityLines = (options: SocialQualityOptions = {}): string[] => {
  const prefix = getPrefix(options);
  return [
    `${prefix}朋友圈要像角色某个真实瞬间发出的内容，可以不围绕用户，但必须贴合角色近期状态、生活方式、关系边界和说话习惯。`,
    `${prefix}内容要有具体触发点、画面或选择，不要只写心情总结、漂亮废话、鸡汤或万能感慨。`,
    `${prefix}情绪要有来由：可以轻松、嘴硬、低落、炫耀、试探或克制，但不能突然变成与人设无关的夸张表达。`,
    buildSystemAbilityBoundaryLine({ linePrefix: prefix, subject: '朋友圈正文', textLabel: '公开内容文本' }),
    `${prefix}如果生成点赞和评论，互动要像可见范围内真实朋友的反应，避免所有人同一种夸赞语气。`
  ];
};

export const buildSocialInteractionQualityLines = (options: SocialQualityOptions = {}): string[] => {
  const prefix = getPrefix(options);
  return [
    `${prefix}评论或回复必须先抓住帖子、文章、图片、位置或用户评论里的具体信息，不能只是无上下文的附和或泛泛回应。`,
    `${prefix}发言者要像不同真实联系人：语气、关注点和亲疏距离应有区别，不要统一成客服腔、营销腔或旁观者总结。`,
    `${prefix}短回复也要有情绪来由，可以调侃、追问、补充、安慰或轻轻反驳，但必须贴合内容和关系。`,
    buildSystemAbilityBoundaryLine({ linePrefix: prefix, subject: '评论和回复', textLabel: '公开互动文本' }),
    `${prefix}回复评论时必须针对对方刚说的话，不要复读原帖，也不要替用户或其他联系人继续行动。`
  ];
};

export const buildOfficialArticleQualityLines = (options: SocialQualityOptions = {}): string[] => {
  const prefix = getPrefix(options);
  return [
    `${prefix}文章要像角色基于自身经历、职业、兴趣或价值观写出的内容，不能只是通用百科、营销软文或 AI 总结。`,
    `${prefix}标题和正文都要有明确观点与具体信息密度，不靠夸张标题党、空泛金句或堆叠形容词。`,
    `${prefix}正文要保留角色说话习惯和关注重点，但表达应适合公开发布，不要写成私聊口吻或系统说明。`,
    buildSystemAbilityBoundaryLine({ linePrefix: prefix, subject: '订阅号文章', textLabel: '公开文章文本' }),
    `${prefix}结论要自然落到角色会认可的选择或建议，避免突然拔高、强行教育用户。`
  ];
};
