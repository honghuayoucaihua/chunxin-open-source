import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildChatReplySuggestionHistory,
  buildChatReplySuggestionInstruction,
  buildChatReplySuggestionPrompt
} from '../src/app/chatReplySuggestionFlow.ts';
import { buildTruthOrDareSystemPrompt } from '../src/app/sendMessage/truthOrDareRuntimePrompt.ts';
import { generateMailboxReplyText } from '../src/app/mailboxReplyRuntime.ts';
import { formatMemberMemoryLines } from '../src/appStateNormalizeUtils.ts';

const suggestionInstruction = buildChatReplySuggestionInstruction({
  isStoryChat: false,
  myName: '小满',
  contactName: '林夏',
  myPersona: '',
  contactPersona: ''
});

assert.doesNotMatch(suggestionInstruction, /未设置|用户（发送者）人设：\s*\n|联系人（接收者）人设：\s*\n/, '候选回复提示不应把空人设写成占位资料');
assert.doesNotMatch(buildChatReplySuggestionPrompt('', false), /无历史记录/, '候选回复空历史不应补成会被当作聊天事实的固定文本');
assert.match(buildChatReplySuggestionPrompt('', false), /这不是聊天正文/, '候选回复空历史应明确标为元说明');

const emptyNameSuggestionInstruction = buildChatReplySuggestionInstruction({
  isStoryChat: false,
  myName: '',
  contactName: '',
  myPersona: '',
  contactPersona: ''
});
assert.doesNotMatch(emptyNameSuggestionInstruction, /「我」|「联系人」/, '候选回复缺少真实姓名时不应补固定姓名');
assert.match(emptyNameSuggestionInstruction, /用户（发送者，未提供姓名）/, '候选回复缺少用户姓名时应写成元信息');
assert.match(emptyNameSuggestionInstruction, /联系人（接收者，未提供姓名）/, '候选回复缺少联系人姓名时应写成元信息');

const emptyNameSuggestionHistory = buildChatReplySuggestionHistory([
  {
    id: 'u1',
    senderId: 'me',
    type: 'text',
    content: '今天有点累',
    timestamp: 1
  } as any,
  {
    id: 'c1',
    senderId: 'c1',
    type: 'text',
    content: '那早点休息',
    timestamp: 2
  } as any
], {
  id: 'c1',
  name: '',
  pinyin: '',
  avatar: '',
  unreadCount: 0,
  isAi: true
} as any, {
  name: ''
}, {});
assert.doesNotMatch(emptyNameSuggestionHistory, /^我：|^联系人：/m, '候选回复历史缺名时不应补固定说话人姓名');
assert.match(emptyNameSuggestionHistory, /用户（发送者，未提供姓名）：今天有点累/, '候选回复历史缺用户姓名时应保留结构身份');
assert.match(emptyNameSuggestionHistory, /联系人（接收者，未提供姓名）：那早点休息/, '候选回复历史缺联系人姓名时应保留结构身份');

const emptyNameTruthDarePrompt = buildTruthOrDareSystemPrompt({
  baseSystemPrompt: '',
  contactName: '',
  userName: '',
  chatMode: 'online',
  persona: '',
  descriptionFeatureEnabled: true,
  descriptionSayEnabled: true,
  descriptionDoEnabled: false
});
assert.doesNotMatch(emptyNameTruthDarePrompt, /你是：\s*\n|用户是：\s*\n|用户是：用户/, '真心话大冒险缺名时不应输出空身份或固定用户姓名');
assert.match(emptyNameTruthDarePrompt, /当前联系人（未提供姓名，不要编造姓名）/, '真心话大冒险缺联系人姓名时应明确禁止编造姓名');
assert.match(emptyNameTruthDarePrompt, /当前聊天用户（未提供姓名，不要编造姓名）/, '真心话大冒险缺用户姓名时应明确禁止编造姓名');

let capturedMailboxPrompt = '';
await assert.rejects(
  () => generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      pinyin: '',
      avatar: '',
      unreadCount: 0
    },
    user: {
      name: '',
      wechatId: '',
      avatar: '',
      gender: 'other',
      region: '',
      signature: '',
      momentsCover: ''
    },
    subject: '',
    content: '今天过得怎么样？',
    date: '2026-07-07',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    buildUserPersonaSummary: () => '',
    buildContactPersonaSummary: () => '',
    getChatReply: async (messages) => {
      capturedMailboxPrompt = messages[0]?.text || '';
      return '{"content":"","blessing":""}';
    }
  }),
  /AI 回信正文为空/
);
assert.doesNotMatch(capturedMailboxPrompt, /用户人设摘要：未设置|联系人人设摘要：未设置/, '信箱回信提示不应把空人设摘要写成未设置');
assert.doesNotMatch(capturedMailboxPrompt, /来信主题：无主题|写信人：我/, '信箱回信提示不应为空主题或空写信人补固定文本');
assert.doesNotMatch(capturedMailboxPrompt, /无主题/, '信箱回信空主题不应进入 AI 提示词');

const chatRoomActionSource = readFileSync(new URL('../src/app/chatRoomActionFlow.ts', import.meta.url), 'utf8');
const contactActionSource = readFileSync(new URL('../src/app/contactActionFlow.ts', import.meta.url), 'utf8');
const chatActionHandlersSource = readFileSync(new URL('../src/app/chatActionHandlers.ts', import.meta.url), 'utf8');
const mailboxSource = readFileSync(new URL('../src/app/mailboxReplyRuntime.ts', import.meta.url), 'utf8');
const singleReplySource = readFileSync(new URL('../src/utils/chat/singleReplyRequest.ts', import.meta.url), 'utf8');
const groupReplySource = readFileSync(new URL('../src/utils/chat/groupReplyRequest.ts', import.meta.url), 'utf8');
const groupChatFlowSource = readFileSync(new URL('../src/app/sendMessage/groupChatFlow.ts', import.meta.url), 'utf8');
const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
const storyRuntimeSource = readFileSync(new URL('../src/utils/chat/storyRuntimeContext.ts', import.meta.url), 'utf8');
const appStateNormalizeSource = readFileSync(new URL('../src/appStateNormalizeUtils.ts', import.meta.url), 'utf8');
const imageGenerationPromptSource = readFileSync(new URL('../src/utils/prompt/imageGenerationPrompt.ts', import.meta.url), 'utf8');
const personaPromptOutputSource = readFileSync(new URL('../src/utils/prompt/personaPromptOutput.ts', import.meta.url), 'utf8');
assert.doesNotMatch(chatRoomActionSource, /\|\| '未设置'/, '候选回复入口不应用未设置兜底人设');
assert.doesNotMatch(chatRoomActionSource, /\|\| '我'|\|\| '联系人'/, '候选回复实际请求不应给空姓名补我/联系人');
assert.doesNotMatch(contactActionSource, /params\.user\.name\?\.trim\(\) \|\| '我'/, '新建群聊不应给空用户昵称补我');
assert.doesNotMatch(chatActionHandlersSource, /selectedContact\?\.name \|\| '联系人'/, '追加消息记忆入口不应给空联系人名补联系人');
assert.doesNotMatch(mailboxSource, /\|\| '未设置'|\|\| '无主题'|\|\| '我'/, '信箱回信入口不应用固定文本兜底空字段');
assert.doesNotMatch(singleReplySource, /userName: options\.user\.name\?\.trim\(\) \|\| '用户'|userLabel: options\.user\.name\?\.trim\(\) \|\| '用户'/, '单聊 AI 请求不应给空用户名补固定用户姓名');
assert.doesNotMatch(groupReplySource, /formatDetailedContactProfile\(member\) \|\| '未设置'|groupPreset\?\.trim\(\) \|\| '未设置'|: '未启用'/, '群聊请求提示不应注入未设置/未启用占位资料');
assert.doesNotMatch(groupReplySource, /userName: options\.user\.name\?\.trim\(\) \|\| '用户'|userLabel: options\.user\.name\?\.trim\(\) \|\| '用户'/, '群聊 AI 请求不应给空用户名补固定用户姓名');
assert.doesNotMatch(groupChatFlowSource, /\|\| '群成员'/, '群聊首发预览不应给空成员名补群成员固定名');
assert.doesNotMatch(resendFlowSource, /\|\| '群成员'/, '群聊重发预览不应给空成员名补群成员固定名');
assert.doesNotMatch(storyRuntimeSource, /return options\.userLabel \|\| '用户';|message\.npcName \|\| '角色';/, '剧情锚点不应把空姓名补成固定名字');
assert.doesNotMatch(groupReplySource, /默认面具（基于用户资料）/, '群聊请求没有选择面具时不应向 AI 注入默认面具占位');
assert.match(groupReplySource, /memberMemories \? `关键记忆：\\n\$\{memberMemories\}` : ''/, '群聊成员没有记忆时不应写入关键记忆空占位段');
assert.doesNotMatch(appStateNormalizeSource, /return '暂无';/, '群成员记忆为空时不应返回固定暂无占位给 AI 提示词');
assert.equal(formatMemberMemoryLines({}, 'member-empty', 6), '', '群成员没有结构化记忆时应返回空字符串');
assert.doesNotMatch(imageGenerationPromptSource, /未指定（按服务端默认）|未配置（按默认）/, '生图能力提示不应把缺失模型或地址写成固定占位');
assert.doesNotMatch(personaPromptOutputSource, /voiceId \|\| '语音ID'|voiceId \|\| '未指定'|voice_id=\$\{[^}]+\|\| '未指定'\}/, '语音能力提示不应把缺失 voiceId 写成固定占位');
assert.match(imageGenerationPromptSource, /model \? `- 当前模型：\$\{model\}` : ''/, '生图提示应只在模型真实存在时写入模型行');
assert.match(imageGenerationPromptSource, /baseUrl \? `- 当前地址：\$\{baseUrl\}` : ''/, '生图提示应只在地址真实存在时写入地址行');
assert.match(personaPromptOutputSource, /const hasConfiguredVoice = \(contact: Contact\): boolean => Boolean\([\s\S]+voiceId/, '语音能力应以真实 voiceId 作为可用条件');
assert.match(personaPromptOutputSource, /\.\.\.\(hasConfiguredVoice\(input\.contact\) \? \['语音'\] : \[\]\)/, '能力列表应只在 voiceId 已配置时开放语音');
assert.match(personaPromptOutputSource, /!\hasConfiguredVoice\(input\.contact\) \? \[\] : \[`    \{ "type": "voice"/, 'JSON 模板应只在 voiceId 已配置时包含语音标签');

console.log('测试通过：AI 提示词不再注入未设置类占位资料。');
