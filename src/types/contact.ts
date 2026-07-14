import type { ChatMode } from './message';

export interface SentenceRange {
  min: number;
  max: number;
}

export interface GroupRelation {
  subjectId: string;
  objectId: string;
  relation: string;
}

export interface ProactiveChatDraft {
  id: string;
  content: string;
  innerVoice?: string;
  actionDesc?: string;
  translatedContentZhCN?: string;
  generatedAt: number;
  expiresAt: number;
  contextKey: string;
}

export interface Contact {
  id: string;
  name: string;
  pinyin: string;
  avatar: string;
  lastMessage?: string;
  lastTime?: number;
  lastMessagePreviewMode?: 'message' | 'custom';
  lastMessageSourceId?: string;
  unreadCount: number;
  balance?: number;
  isAi?: boolean;
  personality?: string;
  isPinned?: boolean;
  signature?: string;
  signatureImage?: string;
  stampImage?: string;
  region?: string;
  remark?: string;
  status?: string;
  patDesc?: string;
  wechatId?: string;
  age?: string;
  gender?: 'male' | 'female' | 'other';
  constellation?: string;
  mbti?: string;
  occupation?: string;
  relationship?: string;
  personalityTraits?: string;
  hobbies?: string;
  description?: string;
  catchphrase?: string;
  openingLine?: string;
  // 独立人设字段
  persona?: string;           // 核心人设：如"温柔体贴的邻家姐姐"、"高冷理性的技术男"
  background?: string;        // 背景故事：成长经历、人生轨迹等
  expressionStyle?: string;   // 表达风格：说话方式、语气特点等
  language?: string;
  translateToChinese?: boolean;
  chatMode?: ChatMode;
  descriptionFeatureEnabled?: boolean;
  descriptionSayEnabled?: boolean;
  descriptionDoEnabled?: boolean;
  sentenceRange?: SentenceRange;
  replyLimit?: number;
  innerVoiceLimit?: number;
  actionDescLimit?: number;
  maxContextMessages?: number;        // 上下文消息条数上限
  memorySummaryThreshold?: number;    // 触发记忆总结的待处理消息阈值
  worldBookIds?: string[];
  htmlTemplateIds?: string[];
  imageLibraryGroupIds?: string[];
  // 开关：是否使用自定义配置（true=使用自定义配置，false/undefined=使用全局配置）
  useCustomWorldBooks?: boolean;
  useCustomHtmlTemplates?: boolean;
  useCustomImageLibraryGroups?: boolean;
  groupPreset?: string;    // 群聊预设（注入群聊系统提示词）
  selectedMaskId?: string; // 选中的面具ID
  userPersona?: string;    // 用户人设补充（针对该联系人的额外描述）
  allowRichActions?: boolean;
  socialPostLimit?: number;
  minimaxTTS?: ContactMiniMaxTTSSettings;
  chatBg?: string;
  isGroup?: boolean;
  memberIds?: string[];
  groupRelations?: GroupRelation[];
  proactiveChatEnabled?: boolean;
  proactiveChatWindowMinutes?: number;
  lastProactiveChatAt?: number;
  proactiveDrafts?: ProactiveChatDraft[];
  idleChatEnabled?: boolean;
  idleChatTimeoutSeconds?: number;
  lastIdleChatAt?: number;
  encryptedReadOnly?: boolean;
  encryptedHiddenRaw?: string;
  isIfLine?: boolean;
  sourceContactId?: string;
  ifLineLabel?: string;
}

export interface ContactMiniMaxTTSSettings {
  enabled: boolean;
  voiceId: string;
  speed: number;
  language: string;
}

export interface ContactMemoryEntry {
  id: string;
  text: string;
  source: 'user' | 'model' | 'system';
  timestamp: number;
  weight?: number;
  confidence?: number;
  occurrenceCount?: number;
  lastReinforcedAt?: number;
  category?: 'identity' | 'preference' | 'relationship' | 'event' | 'emotion' | 'habit' | 'health' | 'other';
  topic?: string;
  temporalType?: 'stable' | 'short_term' | 'one_time' | 'unknown';
  status?: 'active' | 'ended' | 'corrected' | 'unknown';
  validDays?: number;
  expiresAt?: number;
}

export type ContactMemories = Record<string, ContactMemoryEntry[]>;

export interface FriendRequest {
  id: string;
  contact: Contact;
  greeting: string;
  openingLine?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'ignored';
  source?: 'manual' | 'scan';
}

export interface UserProfile {
  name: string;
  wechatId: string;
  avatar: string;
  gender: 'male' | 'female' | 'other';
  region: string;
  signature: string;
  momentsCover: string;
  qqLevel?: number;
  qqLikes?: number;
  qqVisitors?: number;
  balance?: number;
  status?: string;
  patDesc?: string;
  age?: string;
  constellation?: string;
  mbti?: string;
  occupation?: string;
  personalityTraits?: string;
  hobbies?: string;
  description?: string;
  catchphrase?: string;
  persona?: string;
  background?: string;
  expressionStyle?: string;
  styleFeatures?: string;
  speakingStyle?: string;
  personality?: string;
  goals?: string;
}

// 面具（用户人设）
export interface Mask {
  id: string;
  name: string;          // 面具名称
  isDefault?: boolean;   // 是否为默认面具（基于UserProfile）
  // 人设属性
  age?: string;
  gender?: 'male' | 'female' | 'other';
  constellation?: string;
  mbti?: string;
  occupation?: string;
  personalityTraits?: string;
  hobbies?: string;
  description?: string;  // 详细人设描述
  catchphrase?: string;  // 口头禅
  createdAt: number;
  updatedAt?: number;
}
