import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getContactMemoryPrompt } from '../src/services/contactMemoryService.ts';
import { buildStatusTemporalHintText } from '../src/utils/prompt/userStatusTemporalHint.ts';
import type { ContactMemories } from '../src/types/index.ts';

const statusHintSource = readFileSync(new URL('../src/utils/prompt/userStatusTemporalHint.ts', import.meta.url), 'utf8');
const memoryRetrievalSource = readFileSync(new URL('../src/services/memory/memoryRetrieval.ts', import.meta.url), 'utf8');
const memoryTextProcessingSource = readFileSync(new URL('../src/services/memory/textProcessing.ts', import.meta.url), 'utf8');
const pendingMessageBufferSource = readFileSync(new URL('../src/services/memory/pendingMessageBuffer.ts', import.meta.url), 'utf8');
const personaPromptOutputSource = readFileSync(new URL('../src/utils/prompt/personaPromptOutput.ts', import.meta.url), 'utf8');
const singleChatFlowSource = readFileSync(new URL('../src/app/sendMessage/singleChatFlow.ts', import.meta.url), 'utf8');
const aiReplyParserSource = readFileSync(new URL('../src/utils/chat/aiReplyParser.ts', import.meta.url), 'utf8');
const singleReplyRequestSource = readFileSync(new URL('../src/utils/chat/singleReplyRequest.ts', import.meta.url), 'utf8');
const groupReplyRequestSource = readFileSync(new URL('../src/utils/chat/groupReplyRequest.ts', import.meta.url), 'utf8');
const chatRuntimeContextSource = readFileSync(new URL('../src/hooks/useChatRuntimeContext.ts', import.meta.url), 'utf8');

assert.doesNotMatch(statusHintSource, /TEMPORAL_STATUS_PATTERN/, '状态时效不应保留自然语言词表');
assert.doesNotMatch(statusHintSource, /感冒|发烧|考试|面试|出差|旅行/, '状态时效不应靠状态正文关键词判断');
assert.match(
  buildStatusTemporalHintText('每天都练琴', '用户'),
  /状态时效：用户状态“每天都练琴”可能是近期或临时状态/,
  '状态字段本身就应带时效提醒，不需要关键词命中'
);

assert.doesNotMatch(memoryRetrievalSource, /_legacyContextText|queryText|tokenize\(queryText\)|queryTokens|relevanceScore\(/, '记忆上下文选择不应接收当前输入或按词重合相关性排序');
assert.match(memoryRetrievalSource, /getEntryRank/, '记忆上下文应按结构化权重、置信度、时间和类别排序');
assert.doesNotMatch(memoryRetrievalSource, /contactName = '对方'/, '记忆提示不应把缺失联系人名补成对方');
assert.match(memoryRetrievalSource, /联系人（未提供姓名）/, '记忆提示缺少联系人名时应使用结构身份标签');
assert.doesNotMatch(
  memoryTextProcessingSource,
  /\^\(好\|嗯\|啊\|哦\|行\|可以\|没事\|哈哈\|嘿嘿\|谢谢\|收到\|晚安\|早安\)\$/,
  '记忆候选过滤不应维护固定自然语言短句词表'
);
assert.doesNotMatch(memoryTextProcessingSource, /shouldRemember|splitToCandidates|normalizeMemorySource/, '记忆文本工具不应保留工程猜测入口');
assert.doesNotMatch(pendingMessageBufferSource, /shouldRemember|splitToCandidates/, '待总结缓冲区不应先用本地规则猜哪些片段值得记忆');
assert.match(pendingMessageBufferSource, /pendingMessages\[contactId\]\.push/, '待总结缓冲区应按真实完整消息入队，交给 AI 总结判断');
assert.doesNotMatch(personaPromptOutputSource, /\{\s*"type":\s*"npc"/, '剧情 NPC 不应继续通过 tags 旧兜底提示模型');
assert.match(personaPromptOutputSource, /"role": "npc"/, '剧情 NPC 应通过 messages[*].role 结构化表达');
assert.doesNotMatch(aiReplyParserSource, /case 'npc'|^\s*'npc',\s*$/m, '解析器不应继续把 npc tag/special 当特殊消息兜底');
assert.doesNotMatch(aiReplyParserSource, /extractedActionFromText/, '解析器不应保留从普通正文抽取动作的入口');
assert.doesNotMatch(singleChatFlowSource, /npcSpecial|getNpcName/, '单聊落地不应再读取顶层 npc special 改写消息身份');
assert.doesNotMatch(singleReplyRequestSource, /triggerText/, '单聊请求构建器不应接收当前用户文本作为额外触发参数');
assert.doesNotMatch(groupReplyRequestSource, /triggerText/, '群聊请求构建器不应接收当前用户文本作为额外触发参数');
assert.doesNotMatch(chatRuntimeContextSource, /triggerText/, '共享运行时提示不应接收正文触发词入口');

const now = Date.now();
const day = 1000 * 60 * 60 * 24;
const memories: ContactMemories = {
  c1: [
    {
      id: 'relationship',
      text: '我和用户是旧友，习惯一起查案',
      source: 'model',
      timestamp: now - day * 120,
      weight: 2,
      confidence: 0.65,
      category: 'relationship',
      topic: '旧友',
      temporalType: 'stable',
      status: 'active'
    },
    {
      id: 'event',
      text: '用户刚才在旧楼门口听见楼上传来脚步声',
      source: 'user',
      timestamp: now - 1000,
      weight: 2,
      confidence: 0.7,
      category: 'event',
      topic: '旧楼',
      temporalType: 'one_time',
      status: 'active',
      expiresAt: now + day
    }
  ]
};

const prompt = getContactMemoryPrompt(memories, 'c1', 6, '林夏');
assert.match(prompt, /旧友，习惯一起查案/, '稳定关系应进入核心记忆，不依赖当前输入词命中');
assert.match(prompt, /旧楼门口听见楼上传来脚步声/, '有效短期事件应作为补充记忆进入上下文');
assert.match(prompt, /【补充记忆】/, '非核心记忆应以补充记忆提供给模型自行判断如何使用');
assert.doesNotMatch(prompt, /【当前相关记忆】/, '记忆提示不应声称工程层已经判断“当前相关”');

console.log('测试通过：聊天底层不再通过固定关键词或当前输入词重合决定状态与记忆上下文。');
