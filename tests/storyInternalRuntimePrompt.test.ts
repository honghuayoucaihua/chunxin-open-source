import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-story-internal-runtime-tests');
mkdirSync(bundledDir, { recursive: true });
const entryFile = join(bundledDir, `storyInternalRuntimeEntry-${Date.now()}.ts`);
const bundledFile = join(bundledDir, `storyInternalRuntimeEntry-${Date.now()}.mjs`);
writeFileSync(entryFile, `
  export { buildInternalRuntimePrompt, buildStoryInputModeRuntimePrompt, isInternalStoryAdvancePayload } from '${resolve('src/app/sendMessage/messageValidation.ts').replace(/\\/g, '/')}';
  export { buildSingleReplyRequestContext } from '${resolve('src/utils/chat/singleReplyRequest.ts').replace(/\\/g, '/')}';
  export { buildGroupReplyRequestContext } from '${resolve('src/utils/chat/groupReplyRequest.ts').replace(/\\/g, '/')}';
`);
await build({
  entryPoints: [entryFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  logLevel: 'silent'
});
const {
  buildInternalRuntimePrompt,
  buildStoryInputModeRuntimePrompt,
  isInternalStoryAdvancePayload,
  buildSingleReplyRequestContext,
  buildGroupReplyRequestContext
} = await import(`file://${bundledFile.replace(/\\/g, '/')}`) as typeof import('../src/app/sendMessage/messageValidation.ts') & typeof import('../src/utils/chat/singleReplyRequest.ts') & typeof import('../src/utils/chat/groupReplyRequest.ts');

(globalThis as any).window = (globalThis as any).window || {
  customEmojis: [],
  customEmojiGroups: [],
  customEmojiGroupSettings: {}
};

const aiSettings: any = {
  provider: 'builtin',
  apiKey: '',
  model: '',
  baseUrl: '',
  responseFormat: 'openai',
  enableDelayReply: false,
  enableSentenceSend: false,
  enableTimeAwareness: false,
  momentInteractionSource: 'random',
  minimaxTTS: {
    enabled: false,
    region: 'official',
    apiKey: '',
    groupId: '',
    model: ''
  },
  promptRuleTree: { enabled: true, disabledRuleIds: [] }
};

const user: any = {
  name: '小满',
  avatar: '',
  gender: 'female',
  region: '杭州',
  signature: '',
  momentsCover: '',
  status: '',
  hobbies: ''
};

const contact: any = {
  id: 'c1',
  name: '林夏',
  pinyin: 'linxia',
  avatar: '',
  unreadCount: 0,
  isAi: true,
  chatMode: 'story',
  persona: '旧友，克制但关心',
  relationship: '朋友'
};

const internalPrompt = buildInternalRuntimePrompt({
  source: 'storyAdvance',
  inputKind: 'story',
  text: '请继续推进剧情',
  append: false
});

assert.equal(isInternalStoryAdvancePayload({ source: 'storyAdvance', inputKind: 'story' }), true, 'storyAdvance 应被识别为内部剧情推进');
assert.match(internalPrompt, /本轮内部操作/, '剧情推进应生成内部运行时提示');
assert.match(internalPrompt, /不是用户台词/, '内部提示应明确不是用户台词');
assert.match(internalPrompt, /不要替用户说话或行动/, '内部提示应保护用户自主');

const storyInputPrompt = buildStoryInputModeRuntimePrompt({ source: 'manual', inputKind: 'story', text: '我推开门，冷风灌了进来。' }, contact);
assert.match(storyInputPrompt, /本轮剧情输入语义/, '剧情模式下应生成输入语义提示');
assert.match(storyInputPrompt, /选择了“剧情”输入/, '剧情输入应被明确标注为剧情片段');
assert.match(storyInputPrompt, /不是用户台词，不要逐字当作对话回应/, '剧情输入不应被模型当成用户台词逐字回应');
assert.match(storyInputPrompt, /不要重写、否定或替用户补完/, '剧情输入仍应保护用户未写出的行动和内心');

const chatInputPrompt = buildStoryInputModeRuntimePrompt({ source: 'manual', inputKind: 'chat', text: '门外是谁？' }, contact);
assert.match(chatInputPrompt, /选择了“聊天”输入/, '聊天输入应被明确标注为用户台词或互动意图');
assert.match(chatInputPrompt, /不要把聊天输入扩写成用户已经完成的新动作/, '聊天输入不应被模型扩写成用户动作');

assert.equal(
  buildStoryInputModeRuntimePrompt({ source: 'manual', inputKind: 'story', text: '普通模式不注入' }, { ...contact, chatMode: 'online' }),
  '',
  '非剧情模式不应注入剧情输入语义'
);
assert.equal(
  buildStoryInputModeRuntimePrompt({ source: 'storyAdvance', inputKind: 'story', text: '请继续推进剧情' }, contact),
  '',
  '内部剧情推进已有内部操作提示，不应重复注入输入语义'
);

{
  const context = await buildSingleReplyRequestContext({
    contact,
    historyMessages: [
      { id: 'm1', senderId: 'me', type: 'text', content: '门外怎么突然安静了？', timestamp: 1 }
    ],
    contactMemories: {},
    worldBooks: [],
    masks: [],
    user,
    aiSettings,
    internalRuntimePrompt: internalPrompt
  });
  assert.match(context.runtimeUserPrompt, /本轮内部操作/, '单聊剧情推进内部提示应进入 runtime prompt');
  assert.equal(
    context.history.some((item) => item.text.includes('请继续推进剧情')),
    false,
    '单聊剧情推进内部提示不应作为用户历史消息进入模型历史'
  );
}

{
  const groupContact = {
    ...contact,
    id: 'g1',
    name: '调查小队',
    isGroup: true,
    memberIds: ['c1']
  };
  const context = await buildGroupReplyRequestContext({
    contact: groupContact,
    contacts: [contact],
    historyMessages: [
      { id: 'm1', senderId: 'me', type: 'text', content: '你们听见楼上那声了吗？', timestamp: 1 }
    ],
    contactMemories: {},
    worldBooks: [],
    masks: [],
    user,
    aiSettings,
    internalRuntimePrompt: internalPrompt
  });
  assert.match(context.runtimeUserPrompt, /本轮内部操作/, '群聊剧情推进内部提示应进入 runtime prompt');
  assert.equal(
    context.history.some((item) => item.text.includes('请继续推进剧情')),
    false,
    '群聊剧情推进内部提示不应作为用户历史消息进入模型历史'
  );
}

const sendFlowSource = readFileSync(new URL('../src/app/sendMessage/index.ts', import.meta.url), 'utf8');
assert.match(sendFlowSource, /isInternalStoryAdvance\s*\?\s*null/, '发送流程应让内部剧情推进不再生成临时用户历史消息');
assert.match(sendFlowSource, /buildStoryInputModeRuntimePrompt\(overrideText, contact\)/, '发送流程应把剧情输入类型转换为运行时语义提示');

console.log('测试通过：剧情推进和剧情输入类型会以结构化运行时提示进入 AI 请求，不靠模型猜用户文本用途。');
