import { buildSystemAbilityBoundaryLine } from './systemAbilityBoundaryPrompt.ts';

type MailboxReplyQualityOptions = {
  linePrefix?: string;
};

export const buildMailboxReplyQualityLines = (options: MailboxReplyQualityOptions = {}): string[] => {
  const prefix = options.linePrefix || '';
  return [
    `${prefix}回信必须回应来信里的具体内容、情绪、问题或关系暗示，不能写成任何信都能套用的礼貌回执。`,
    `${prefix}语气要符合联系人完整人设、与用户的亲疏距离和信件场景；可以比即时聊天更完整，但不能客服腔、作文腔或资料卡复述。`,
    `${prefix}当用户资料或联系人记忆里有相关线索时，正文要自然带出一处具体信息（如昵称、近况、兴趣、关系经历或共同话题），不要只泛泛称“你”，也不要逐条复述档案。`,
    `${prefix}情绪要有来由和层次：可以克制、犹豫、想念、调侃、担心、认真或回避，但必须来自来信内容和双方关系。`,
    `${prefix}正文优先给具体回应、选择或后续钩子，不要只堆祝福、总结道理、解释自己是 AI，或替用户继续行动。`,
    `${prefix}blessing 要贴合关系、来信内容和角色表达习惯，不能总是“祝好”“万事顺意”这类泛泛祝语。`,
    buildSystemAbilityBoundaryLine({ linePrefix: prefix, subject: '信箱回信', textLabel: '普通信件正文' }),
    `${prefix}只输出指定 JSON；不要输出 JSON 以外文字，也不要输出心声、动作、旁白、翻译或系统说明。`
  ];
};
