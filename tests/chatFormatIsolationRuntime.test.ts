import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTruthOrDareSystemPrompt } from '../src/app/sendMessage/truthOrDareRuntimePrompt.ts';
import { formatMemberMemoryLines } from '../src/appStateNormalizeUtils.ts';
import { addPendingMessage, clearPendingMessages } from '../src/services/contactMemoryService.ts';
import { formatMessageForPolicyHistory, getChatModePolicy } from '../src/utils/chat/chatModePolicy.ts';
import type { ContactMemories, Message } from '../src/types/index.ts';

const groupRequestSource = readFileSync(new URL('../src/utils/chat/groupReplyRequest.ts', import.meta.url), 'utf8');
assert.match(groupRequestSource, /const usePolicyHistory = options\.usePolicyHistory !== false;/, '群聊历史默认应启用当前模式格式过滤');

const oldActionHistory: Message[] = [
  {
    id: 'm-model-action',
    senderId: 'member-1',
    content: '',
    timestamp: Date.now(),
    type: 'text',
    actionDesc: '把杯子放到桌上'
  } as Message,
  {
    id: 'm-user-do',
    senderId: 'me',
    content: '',
    timestamp: Date.now(),
    type: 'text',
    actionDesc: '轻轻敲了敲门'
  } as Message
];

const onlinePolicy = getChatModePolicy({
  chatMode: 'online',
  descriptionFeatureEnabled: true,
  descriptionSayEnabled: true,
  descriptionDoEnabled: false
});
const formattedModelAction = formatMessageForPolicyHistory(oldActionHistory[0], onlinePolicy);
const formattedUserDo = formatMessageForPolicyHistory(oldActionHistory[1], onlinePolicy);

assert.equal(formattedModelAction, null, '群聊在线模式应通过共享策略过滤旧 AI 动作历史');
assert.equal(formattedUserDo?.text.includes('【动作】'), false, '群聊在线模式不应继续暴露动作格式标签');
assert.equal(formattedUserDo?.text, '【用户行为】轻轻敲了敲门', '群聊应保留用户做发送语义但改成中性标签');

const truthDareOnlinePrompt = buildTruthOrDareSystemPrompt({
  baseSystemPrompt: '',
  contactName: '林夏',
  userName: '用户',
  chatMode: 'online',
  persona: '自然聊天',
  descriptionFeatureEnabled: true,
  descriptionSayEnabled: true,
  descriptionDoEnabled: false
});

assert.equal(/允许字段[^\n]*(innerVoice|actionDesc)/.test(truthDareOnlinePrompt), false, '真心话大冒险在线模式不应把心声或动作列为允许字段');
assert.equal(/推荐字段[^\n]*(innerVoice|actionDesc)/.test(truthDareOnlinePrompt), false, '真心话大冒险在线模式不应继续推荐心声或动作字段');
assert.match(truthDareOnlinePrompt, /当前禁止输出字段/, '真心话大冒险应明确列出当前禁用字段');
assert.match(truthDareOnlinePrompt, /必须输出一个 JSON 对象/, '真心话大冒险自动回应应要求结构化输出');
assert.doesNotMatch(truthDareOnlinePrompt, /普通回复可直接输出纯文本/, '真心话大冒险自动回应不应继续允许纯文本兜底');

const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');
assert.match(promptBuildersSource, /modePolicy\.innerEnabled \? \['innerVoice'\]/, '群聊提示词应按当前模式动态允许心声字段');
assert.match(promptBuildersSource, /modePolicy\.actionEnabled \? \['actionDesc'\]/, '群聊提示词应按当前模式动态允许动作字段');
assert.match(promptBuildersSource, /!modePolicy\.innerEnabled \? \['innerVoice', 'inner', '心声'\]/, '群聊提示词应在禁用心声时明确禁止相关字段');
assert.match(promptBuildersSource, /!modePolicy\.actionEnabled \? \['actionDesc', 'action', '动作'\]/, '群聊提示词应在禁用动作时明确禁止相关字段');
assert.match(promptBuildersSource, /content 只放正文/, '群聊提示应要求正文、心声和动作分离，避免混写导致掉格式');

const groupFlowSource = readFileSync(new URL('../src/app/sendMessage/groupChatFlow.ts', import.meta.url), 'utf8');
const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
assert.match(groupFlowSource, /allowInner: requestContext\.modePolicy\.innerEnabled/, '群聊首发解析应按当前模式允许或禁止心声');
assert.match(groupFlowSource, /allowAction: requestContext\.modePolicy\.actionEnabled/, '群聊首发解析应按当前模式允许或禁止动作');
assert.match(groupFlowSource, /aiMsgs\.map\(\(msg\) => getGroupReplyMemoryText\(msg\)\)/, '群聊记忆应记录完整展示语义，避免心声、动作或译文被漏记');
assert.match(resendFlowSource, /allowInner: requestContext\.modePolicy\.innerEnabled/, '群聊重发解析应按当前模式允许或禁止心声');
assert.match(resendFlowSource, /allowAction: requestContext\.modePolicy\.actionEnabled/, '群聊重发解析应按当前模式允许或禁止动作');
assert.match(resendFlowSource, /getGroupReplyMemoryText\(item\)/, '群聊重发记忆也应保留完整展示语义');

const groupRequestContextSource = readFileSync(new URL('../src/utils/chat/groupReplyRequest.ts', import.meta.url), 'utf8');
assert.match(groupRequestContextSource, /modePolicy: ReturnType<typeof getChatModePolicy>/, '群聊请求上下文应携带统一模式策略');

const chatRoomSource = readFileSync(new URL('../src/ChatRoom.tsx', import.meta.url), 'utf8');
const footerPanelsSource = readFileSync(new URL('../src/chatroom/ChatRoomFooterPanels.tsx', import.meta.url), 'utf8');
const auxPanelsSource = readFileSync(new URL('../src/chatroom/ChatRoomAuxPanels.tsx', import.meta.url), 'utf8');
const storyComposerSource = readFileSync(new URL('../src/chatroom/storyComposerFlow.ts', import.meta.url), 'utf8');
assert.match(chatRoomSource, /parseAIReply\(normalized, modePolicy\.innerEnabled, modePolicy\.actionEnabled/, '真心话大冒险自动回应也应按当前模式解析心声和动作');
assert.match(chatRoomSource, /hasUnsupportedTruthOrDareReplyShape\(normalized,/, '真心话大冒险自动回应应先按本功能字段白名单做结构硬校验');
assert.match(chatRoomSource, /hasUnsupportedTruthOrDareSpecial\(parsed\.specials\)/, '真心话大冒险自动回应应在落地正文前拒收不支持的系统能力 special');
assert.match(chatRoomSource, /requireStructured: true/, '真心话大冒险自动回应不应把非 JSON 原始回复兜底落地');
assert.match(chatRoomSource, /normalizeGeneratedStrictNonSystemEventText\(parsed\.text, \{ collapseWhitespace: true \}\)/, '真心话大冒险自动回应正文落地前应严格拒收系统能力格式片段');
assert.match(chatRoomSource, /applyChatModePolicy\(parsedPrimaryText, actor, modePolicy/, '真心话大冒险自动回应落地前应复用统一模式策略');
assert.match(chatRoomSource, /buildRuntimePromptWithMemory\?\.\(actor, 8\)/, '真心话大冒险自动回应应按实际发言角色注入联系人记忆');
assert.doesNotMatch(chatRoomSource, /memoryTriggerText/, '真心话大冒险自动回应不应把本轮正文作为记忆检索触发词');
assert.match(chatRoomSource, /\[actorRuntimePrompt, truthOrDareRuntimePrompt\]\.filter\(Boolean\)\.join\('\\n\\n'\)/, '真心话大冒险自动回应应合并记忆上下文和游戏上下文');
assert.doesNotMatch(chatRoomSource, /appendTruthOrDareSystemNotice\('【真心话大冒险】AI 未配置，无法自动生成对方响应。'\)/, '真心话大冒险 AI 未配置不应写入聊天历史');
assert.doesNotMatch(chatRoomSource, /appendTruthOrDareSystemNotice\('【真心话大冒险】对方响应生成失败。'\)/, '真心话大冒险 AI 失败不应写入聊天历史');
assert.match(chatRoomSource, /showToast\('AI 未配置，无法自动生成对方响应'\)/, '真心话大冒险 AI 未配置应使用轻提示');
assert.match(chatRoomSource, /showToast\('对方响应生成失败'\)/, '真心话大冒险 AI 失败应使用轻提示');
assert.match(chatRoomSource, /const canOpenInnerActionPanel = currentModePolicy\.innerEnabled \|\| currentModePolicy\.actionEnabled;/, '手动心声动作面板入口应跟随当前模式能力开关');
assert.match(chatRoomSource, /allowInnerVoice=\{currentModePolicy\.innerEnabled\}/, '手动心声面板应接收当前心声开关，避免关闭后继续落地心声');
assert.match(chatRoomSource, /allowActionDesc=\{currentModePolicy\.actionEnabled\}/, '手动动作面板应接收当前动作开关，避免关闭后继续落地动作');
assert.match(footerPanelsSource, /canOpenInnerActionPanel \? \[\{ icon: 'fa-heart', label: '心声\/动作'/, '底部更多面板应在心声动作都关闭时隐藏手动入口');
assert.match(auxPanelsSource, /showInnerActionPanel && !isStoryMode && canSendInnerAction/, '手动面板应在发送层再次确认当前允许心声或动作');
assert.match(auxPanelsSource, /actionDesc: effectiveInnerActionType === 'action' && allowActionDesc/, '手动面板不应在动作关闭后继续写入动作字段');
assert.doesNotMatch(storyComposerSource, /extractMetaFromRawContent|pairRegex|decodeJsonStringValue/, '剧情洞察不应再用正则从正文里硬挖心声或状态');
assert.match(storyComposerSource, /parseAIReply\(String\(item\.content \|\| ''\)\.trim\(\), true, true, \{ requireStructured: true, allowStoryTags: true \}\)/, '剧情洞察只应接受完整结构化回复或已落地字段，并显式允许剧情标签');

const now = Date.now();
const memoryMap: ContactMemories = {
  'member-1': [
    {
      id: 'old-cold',
      text: '用户最近感冒了',
      source: 'user',
      timestamp: now - 20 * 24 * 60 * 60 * 1000,
      lastReinforcedAt: now - 20 * 24 * 60 * 60 * 1000,
      weight: 5,
      confidence: 0.95,
      category: 'health',
      topic: '感冒',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7,
      expiresAt: now - 1000
    },
    {
      id: 'stable-like',
      text: '用户喜欢热拿铁',
      source: 'user',
      timestamp: now - 40 * 24 * 60 * 60 * 1000,
      weight: 2,
      confidence: 0.7,
      category: 'preference',
      topic: '热拿铁',
      temporalType: 'stable',
      status: 'active'
    }
  ]
};

clearPendingMessages('member-1');
addPendingMessage('member-1', '用户明天上午要去牙医复诊', 'user');
addPendingMessage('member-1', '我答应提醒用户带医保卡', 'model');
const memberMemory = formatMemberMemoryLines(memoryMap, 'member-1', 4, '喝什么');
assert.equal(memberMemory.includes('最近感冒'), false, '群成员记忆不应带入过期短期状态');
assert.equal(memberMemory.includes('喜欢热拿铁'), true, '群成员记忆仍应保留稳定偏好');
assert.equal(memberMemory.includes('用户明天上午要去牙医复诊'), false, '群成员记忆不应补入未结构化的待整理近期信息');
assert.equal(memberMemory.includes('[该成员·待整理] 我答应提醒用户带医保卡'), false, '群成员记忆不应通过待整理信息兜底注入模型文本');
clearPendingMessages('member-1');

const statefulMemberMemoryMap: ContactMemories = {
  'member-state': [
    {
      id: 'active-event',
      text: '用户最近在准备演讲，压力有点大',
      source: 'user',
      timestamp: now,
      weight: 4,
      confidence: 0.9,
      category: 'event',
      topic: '演讲',
      temporalType: 'short_term',
      status: 'active',
      validDays: 5,
      expiresAt: now + 5 * 24 * 60 * 60 * 1000
    },
    {
      id: 'ended-health',
      text: '用户感冒已经好了',
      source: 'user',
      timestamp: now + 1,
      weight: 4,
      confidence: 0.9,
      category: 'health',
      topic: '感冒',
      temporalType: 'short_term',
      status: 'ended',
      validDays: 30,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000
    },
    {
      id: 'corrected-preference',
      text: '用户现在不喝热拿铁了',
      source: 'user',
      timestamp: now + 2,
      weight: 4,
      confidence: 0.9,
      category: 'preference',
      topic: '热拿铁',
      temporalType: 'stable',
      status: 'corrected'
    }
  ]
};
const statefulMemberMemory = formatMemberMemoryLines(statefulMemberMemoryMap, 'member-state', 6, '演讲 感冒 热拿铁');
assert.equal(statefulMemberMemory.includes('[用户；短期状态] 用户最近在准备演讲'), true, '群成员短期记忆应带状态提示，避免被当成永久事实');
assert.equal(statefulMemberMemory.includes('[用户；状态已结束] 用户感冒已经好了'), true, '群成员结束状态记忆应带结束提示');
assert.equal(statefulMemberMemory.includes('[用户；状态已修正] 用户现在不喝热拿铁了'), true, '群成员修正状态记忆应带修正提示');

console.log('测试通过：群聊和真心话大冒险会复用格式隔离与时效性记忆策略。');
