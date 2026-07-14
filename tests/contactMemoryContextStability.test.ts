import assert from 'node:assert/strict';
import {
  addPendingMessage,
  clearPendingMessages,
  getContactMemoryPrompt
} from '../src/services/contactMemoryService.ts';
import { buildBehaviorSection } from '../src/utils/prompt/personaPromptSections.ts';
import type { Contact, ContactMemories } from '../src/types/index.ts';

const now = Date.now();
const day = 1000 * 60 * 60 * 24;

const memories: ContactMemories = {
  c1: [
    {
      id: 'stable-preference',
      text: '用户喜欢喝热拿铁，讨厌冰美式',
      source: 'user',
      timestamp: now - day * 90,
      weight: 2,
      confidence: 0.65,
      category: 'preference',
      topic: '热拿铁',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'stable-relationship',
      text: '我和用户是青梅竹马，关系亲近',
      source: 'model',
      timestamp: now - day * 80,
      weight: 2,
      confidence: 0.65,
      category: 'relationship',
      topic: '青梅竹马',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'expired-cold',
      text: '用户最近感冒了，嗓子不舒服',
      source: 'user',
      timestamp: now - day * 20,
      lastReinforcedAt: now - day * 20,
      weight: 4,
      confidence: 0.9,
      category: 'health',
      topic: '感冒',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7,
      expiresAt: now - 1000
    },
    {
      id: 'active-short-term',
      text: '用户今天要参加项目会议',
      source: 'user',
      timestamp: now - 1000 * 60 * 10,
      weight: 2,
      confidence: 0.7,
      category: 'event',
      topic: '项目会议',
      temporalType: 'one_time',
      status: 'active',
      validDays: 1,
      expiresAt: now + day
    },
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `recent-${index}`,
      text: `今天项目会议提到了第 ${index + 1} 个排期风险`,
      source: 'user' as const,
      timestamp: now - index * 1000,
      weight: 1,
      confidence: 0.5,
      category: 'event' as const,
      topic: '项目会议',
      temporalType: 'one_time' as const,
      status: 'active' as const,
      validDays: 1,
      expiresAt: now + day
    }))
  ]
};

const prompt = getContactMemoryPrompt(memories, 'c1', 6, '林夏');

assert.ok(prompt.includes('【核心稳定记忆】'), '记忆提示应明确区分核心稳定记忆');
assert.ok(prompt.includes('【补充记忆】'), '记忆提示应保留非核心补充记忆');
assert.ok(prompt.includes('喜欢喝热拿铁'), '稳定偏好不应因为当前问题无关而被挤出上下文');
assert.ok(prompt.includes('青梅竹马'), '稳定关系不应因为当前问题无关而被挤出上下文');
assert.ok(prompt.includes('林夏：我和用户是青梅竹马'), '模型来源记忆应使用联系人名，避免“我”的指代混乱');
assert.ok(!prompt.includes('最近感冒'), 'AI 标记的过期短期状态不应继续进入聊天上下文');
assert.ok(prompt.includes('短期状态，可能已变化'), '仍有效的短期状态应明确标记，避免被当成永久事实');
assert.ok(prompt.includes('不要逐条复述'), '记忆提示应约束模型自然使用记忆，而不是机械复述');

const unnamedContactPrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'unnamed-model-memory',
      text: '我和用户约好下次一起整理旧照片',
      source: 'model',
      timestamp: now - day,
      weight: 3,
      confidence: 0.8,
      category: 'relationship',
      topic: '旧照片',
      temporalType: 'stable',
      status: 'active'
    }
  ]
}, 'c1', 6);
assert.ok(!unnamedContactPrompt.includes('对方：'), '记忆提示漏传联系人名时不应补“对方”作为事实标签');
assert.ok(unnamedContactPrompt.includes('联系人（未提供姓名）：我和用户约好下次一起整理旧照片'), '记忆提示漏传联系人名时应使用结构身份标签');

const legacyUnstructuredPrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'legacy-plain',
      text: '用户最近感冒了，嗓子不舒服',
      source: 'user',
      timestamp: now - 1000,
      weight: 5,
      confidence: 0.95
    },
    {
      id: 'legacy-short-no-expiry',
      text: '用户今天临时心情低落',
      source: 'user',
      timestamp: now - 1000,
      weight: 5,
      confidence: 0.95,
      category: 'emotion',
      topic: '心情',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    },
    {
      id: 'stable-structured',
      text: '用户喜欢周末去旧书店',
      source: 'user',
      timestamp: now - day * 20,
      weight: 3,
      confidence: 0.8,
      category: 'habit',
      topic: '旧书店',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'dirty-object-memory',
      text: { value: '对象记忆不应强转进提示词' },
      source: 'user',
      timestamp: now - day,
      weight: 5,
      confidence: 0.95,
      category: 'preference',
      topic: '脏记忆',
      temporalType: 'stable',
      status: 'active'
    } as any,
    {
      id: 'dirty-object-topic',
      text: '用户喜欢对象主题',
      source: 'user',
      timestamp: now - day,
      weight: 5,
      confidence: 0.95,
      category: 'preference',
      topic: { value: '对象主题' },
      temporalType: 'stable',
      status: 'active'
    }
  ] as any
}, 'c1', 6, '林夏');
assert.ok(!legacyUnstructuredPrompt.includes('最近感冒'), '旧版半结构记忆不应继续进入提示词污染短期状态');
assert.ok(!legacyUnstructuredPrompt.includes('临时心情低落'), '短期记忆缺少未来 expiresAt 时不应进入提示词');
assert.ok(!legacyUnstructuredPrompt.includes('[object Object]'), '记忆提示不应把对象型旧字段强转成 [object Object]');
assert.ok(!legacyUnstructuredPrompt.includes('对象记忆不应强转进提示词'), '对象型旧记忆正文不应进入提示词');
assert.ok(!legacyUnstructuredPrompt.includes('用户喜欢对象主题'), '对象型 topic 不完整结构不应进入提示词');
assert.ok(legacyUnstructuredPrompt.includes('旧书店'), '完整结构化稳定记忆仍应正常进入提示词');

const endedStatePrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'active-cold',
      text: '用户最近感冒了，嗓子不舒服',
      source: 'user',
      timestamp: now - day * 2,
      lastReinforcedAt: now - day * 2,
      weight: 4,
      confidence: 0.9,
      category: 'health',
      topic: '感冒',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7,
      expiresAt: now + day * 5
    },
    {
      id: 'cold-ended',
      text: '用户感冒已经好了',
      source: 'user',
      timestamp: now - 1000 * 60 * 60,
      lastReinforcedAt: now - 1000 * 60 * 60,
      weight: 3,
      confidence: 0.9,
      category: 'health',
      topic: '感冒',
      temporalType: 'short_term',
      status: 'ended',
      validDays: 30,
      expiresAt: now + day * 30
    }
  ]
}, 'c1', 6, '林夏');
assert.ok(endedStatePrompt.includes('状态已结束'), 'AI 标记 ended 后提示中应明确状态已结束');
assert.ok(endedStatePrompt.includes('感冒已经好了'), '结束状态本身应保留给模型作为最新事实');
assert.ok(!endedStatePrompt.includes('嗓子不舒服'), '同 topic 的结束状态应压制更早的旧短期状态');

const structuredExpiredPrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'structured-expired-health',
      text: '用户身体状态不适',
      source: 'user',
      timestamp: now - day * 5,
      lastReinforcedAt: now - day * 5,
      weight: 4,
      confidence: 0.9,
      category: 'health',
      topic: '身体状态',
      temporalType: 'short_term',
      status: 'active',
      validDays: 3,
      expiresAt: now - 1000
    }
  ]
}, 'c1', 6, '林夏');
assert.ok(!structuredExpiredPrompt.includes('身体状态不适'), 'AI 标记的短期记忆超过 expiresAt 后不应进入上下文');

const correctedPreferencePrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'old-like-latte',
      text: '用户喜欢喝热拿铁',
      source: 'user',
      timestamp: now - day * 60,
      lastReinforcedAt: now - day * 60,
      weight: 4,
      confidence: 0.9,
      category: 'preference',
      topic: '热拿铁',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'new-dislike-latte',
      text: '用户现在不喜欢热拿铁，改喝红茶',
      source: 'user',
      timestamp: now - 1000 * 60 * 60,
      lastReinforcedAt: now - 1000 * 60 * 60,
      weight: 4,
      confidence: 0.9,
      category: 'preference',
      topic: '热拿铁',
      temporalType: 'stable',
      status: 'corrected'
    }
  ]
}, 'c1', 6, '林夏');
assert.ok(correctedPreferencePrompt.includes('不喜欢热拿铁'), 'AI 标记 corrected 的新偏好应进入上下文');
assert.ok(!correctedPreferencePrompt.includes('用户喜欢喝热拿铁'), '同 topic 的偏好修正应压制旧偏好');

const correctedRelationshipPrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'old-colleague',
      text: '我和用户是同事，平时一起做项目',
      source: 'model',
      timestamp: now - day * 90,
      lastReinforcedAt: now - day * 90,
      weight: 4,
      confidence: 0.9,
      category: 'relationship',
      topic: '同事关系',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'new-not-colleague',
      text: '我和用户现在不是同事，只是普通朋友',
      source: 'model',
      timestamp: now - 1000 * 60 * 60,
      lastReinforcedAt: now - 1000 * 60 * 60,
      weight: 4,
      confidence: 0.9,
      category: 'relationship',
      topic: '同事关系',
      temporalType: 'stable',
      status: 'corrected'
    }
  ]
}, 'c1', 6, '林夏');
assert.ok(correctedRelationshipPrompt.includes('现在不是同事'), 'AI 标记 corrected 的新关系应进入上下文');
assert.ok(correctedRelationshipPrompt.includes('普通朋友'), '较新的替代关系应保留');
assert.ok(!correctedRelationshipPrompt.includes('平时一起做项目'), '同 topic 的关系修正应压制旧关系细节');

const correctedHabitPrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'old-stay-up',
      text: '用户每天晚上都会熬夜',
      source: 'user',
      timestamp: now - day * 50,
      lastReinforcedAt: now - day * 50,
      weight: 4,
      confidence: 0.9,
      category: 'habit',
      topic: '熬夜',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'new-no-stay-up',
      text: '用户现在不再熬夜，作息正常了',
      source: 'user',
      timestamp: now - 1000 * 60 * 60,
      lastReinforcedAt: now - 1000 * 60 * 60,
      weight: 4,
      confidence: 0.9,
      category: 'habit',
      topic: '熬夜',
      temporalType: 'stable',
      status: 'corrected'
    }
  ]
}, 'c1', 6, '林夏');
assert.ok(correctedHabitPrompt.includes('现在不再熬夜'), 'AI 标记 corrected 的新习惯应进入上下文');
assert.ok(!correctedHabitPrompt.includes('每天晚上都会熬夜'), '同 topic 的习惯修正应压制旧习惯');

const unrelatedPreferencePrompt = getContactMemoryPrompt({
  c1: [
    {
      id: 'like-latte',
      text: '用户喜欢喝热拿铁',
      source: 'user',
      timestamp: now - day * 30,
      weight: 4,
      confidence: 0.9,
      category: 'preference',
      topic: '热拿铁',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'correct-cake',
      text: '用户现在不喜欢芝士蛋糕',
      source: 'user',
      timestamp: now - 1000 * 60,
      weight: 4,
      confidence: 0.9,
      category: 'preference',
      topic: '芝士蛋糕',
      temporalType: 'stable',
      status: 'corrected'
    }
  ]
}, 'c1', 6, '林夏');
assert.ok(unrelatedPreferencePrompt.includes('喜欢喝热拿铁'), '不同 topic 的修正不应误伤其他偏好');

clearPendingMessages('pending-c1');
addPendingMessage('pending-c1', '用户明早九点要去牙医复诊', 'user');
addPendingMessage('pending-c1', '我提醒用户今晚早点休息', 'model');
const pendingPrompt = getContactMemoryPrompt({}, 'pending-c1', 6, '林夏');
assert.equal(pendingPrompt, '', '未结构化的待总结近期信息不应直接进入记忆提示');
assert.ok(!pendingPrompt.includes('【待整理近期信息】'), '聊天提示不应再依赖待整理近期信息兜底');
assert.ok(!pendingPrompt.includes('用户明早九点要去牙医复诊'), '待总结用户信息应等结构化总结后再进入长期记忆提示');
assert.ok(!pendingPrompt.includes('林夏：我提醒用户今晚早点休息'), '待总结模型信息不应绕过结构化记忆协议直接注入');
clearPendingMessages('pending-c1');

const contact: Contact = {
  id: 'c1',
  name: '林夏',
  pinyin: 'linxia',
  avatar: '',
  unreadCount: 0,
  persona: '温柔但有边界感的青梅竹马',
  relationship: '青梅竹马'
};

const behaviorPrompt = buildBehaviorSection(contact);

assert.ok(
  behaviorPrompt.includes('不能冲掉已确认的人设与关系'),
  '人设提示应明确长期人设和关系不能被短期上下文冲掉'
);
assert.ok(
  behaviorPrompt.includes('信息优先级：本轮用户明确表达 > 角色资料/双方关系/长期记忆 > 最近聊天上下文'),
  '人设提示应明确本轮表达、角色资料、长期记忆和近期上下文的优先级'
);

console.log('测试通过：聊天记忆会固定保留稳定人设/关系/偏好，并约束自然使用。');
