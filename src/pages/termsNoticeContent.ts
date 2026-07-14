export interface TermsNoticeItem {
  id: string;
  title: string;
  summary: string;
  content: string;
}

export const TERMS_NOTICE_VERSION = '2026-05-04-v3';
export const TERMS_NOTICE_VERSION_STORAGE_KEY = 'xushuo_terms_notice_version';

export const TERMS_NOTICE_ITEMS: TermsNoticeItem[] = [
  {
    id: 'aboutFreeAndDonation',
    title: '关于免费与赞赏',
    summary: '本站完全免费；如果对你有帮助，欢迎打赏支持。',
    content: `- 本站完全免费，所有功能都可以放心使用，无需任何付费。
- 如果叙说对你有帮助，欢迎打赏支持开发者，你的鼓励是我们持续维护与更新的最大动力。
- 是否打赏完全自愿，与功能使用无关，不会影响任何体验。`
  },
  {
    id: 'aboutContentRisk',
    title: '关于内容与风险',
    summary: 'AI 生成内容仅供学习娱乐，可能不准确，请自行判断核实。',
    content: `- 本应用中的对话均由 AI 模型生成，仅供个人学习与娱乐，不代表开发者观点。
- AI 生成内容可能存在不准确、不完整或误导性信息，你需自行判断和核实其准确性。
- 你需对与 AI 的交互内容及其使用后果负全部责任。`
  },
  {
    id: 'aboutCompliance',
    title: '关于合规与禁止行为',
    summary: '请遵守当地法律法规，勿输入或传播违法违规、侵权等内容。',
    content: `- 请勿利用本应用从事任何违法活动。
- 请勿输入或生成违法违规、侵犯他人权益等内容（包括但不限于暴力、色情、仇恨、骚扰、欺诈、侵权等）。
- 禁止任何个人、企业接入未备案的生成式人工智能服务。
- 使用本应用前请了解并遵守当地法律法规，共同努力打造安全、文明的网络环境。`
  },
  {
    id: 'aboutNonProfessionalAdvice',
    title: '关于非专业建议',
    summary: '请勿将 AI 回复作为医疗、法律、金融等专业建议。',
    content: `- 请勿将 AI 回复作为专业建议（包括但不限于医疗、法律、金融等）。
- 如需专业帮助，请咨询具备资质的专业人士。`
  },
  {
    id: 'aboutPrivacyData',
    title: '关于隐私与数据',
    summary: '不收集或上传聊天记录，数据本地存储；外置服务与清缓存可能带来风险。',
    content: `- 本应用不会收集或上传你的聊天记录，所有数据均存储在本地设备，请妥善保管。
- 如你使用外置 Key 或第三方模型服务，你输入的内容将发送至对应服务商处理并受其条款约束。
- 请勿输入敏感个人信息（例如账号密码、验证码、身份证号、银行卡号、住址等）。
- 多人共用设备时，本地数据可能被他人查看，请做好系统级锁屏与隐私保护。
- 使用网页版时，请不要使用无痕模式，或随意清除浏览器缓存，否则可能会丢失数据。
- 建议定期在“我 > 设置 > 存储管理”备份数据，避免误删或系统清理造成丢失。
- 如需清除数据，请在设置中操作，或手动删除缓存（请谨慎，删除后可能无法恢复）。`
  },
  {
    id: 'aboutDisclaimerFeedback',
    title: '关于免责声明与反馈',
    summary: '本应用仅供学习娱乐；不同意请勿使用；建议与反馈可通过邮箱联系。',
    content: `- 本应用仅供学习和娱乐目的使用。
- 如您不同意以上内容，请勿使用本应用。
- 开发者不对因使用本应用产生的任何直接或间接损失承担责任。
- 如有建议或反馈，请通过邮箱 shiyuedongfang@gmail.com 联系，反馈前请确保你的问题不记录在关于叙说-帮助与反馈中。
- 点击“同意并继续”即表示你已阅读、理解并同意遵守以上内容。`
  }
];
