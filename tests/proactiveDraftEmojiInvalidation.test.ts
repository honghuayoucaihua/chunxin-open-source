import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDraftContextKey, getValidDrafts } from '../src/hooks/proactiveDraftContext.ts';
import {
  normalizeProactiveReplyPayload,
  normalizeProactiveReplyPayloadForContact
} from '../src/hooks/proactiveReplyPayload.ts';

const contact = {
  id: 'c1',
  name: '测试联系人',
  selectedMaskId: '',
  chatMode: 'online',
  persona: '温柔',
  expressionStyle: '自然',
  proactiveDrafts: [] as any[]
} as any;

const aiSettings = {
  provider: 'builtin',
  model: 'test-model'
} as any;

const user = {
  name: '小满',
  wechatId: 'xiaoman_01',
  avatar: '',
  gender: 'female',
  region: '杭州',
  signature: '慢慢来',
  momentsCover: '',
  status: '最近在准备考试',
  occupation: '插画师',
  hobbies: '咖啡、散步',
  persona: '熟人面前会放松',
  expressionStyle: '喜欢先开玩笑再认真回应'
} as any;

const selectedMask = {
  id: 'mask-1',
  name: '咖啡店打工人',
  occupation: '咖啡师',
  hobbies: '拉花',
  description: '下班后话会变多',
  createdAt: 1
} as any;

const contactMemories = {
  c1: [{
    id: 'mem-1',
    text: '用户最近睡眠不好，希望被温柔提醒早点休息',
    source: 'user',
    timestamp: 1
  }]
} as any;

const worldBooks = [
  {
    id: 'wb-1',
    name: '海边小镇',
    description: '主要场景',
    enabled: true,
    entries: [{ id: 'entry-1', text: '角色住在潮汐街，傍晚常去旧灯塔。' }]
  },
  {
    id: 'wb-2',
    name: '未启用设定',
    enabled: false,
    entries: [{ id: 'entry-2', text: '这条不应进入主动草稿指纹。' }]
  }
] as any;

(globalThis as any).window = {
  allEnabledEmojis: [
    { id: 'emoji-1', desc: '微笑' },
    { id: 'emoji-2', desc: '晚安' }
  ]
};

const contextKeyBeforeDelete = getDraftContextKey(contact, aiSettings, '');
contact.proactiveDrafts = [{
  id: 'draft-1',
  content: '[emoji:晚安]',
  generatedAt: Date.now() - 1000,
  expiresAt: Date.now() + 60_000,
  contextKey: contextKeyBeforeDelete
}];

assert.equal(getValidDrafts(contact, Date.now(), aiSettings, '').length, 1, '删除前草稿应有效');

(globalThis as any).window.allEnabledEmojis = [
  { id: 'emoji-1', desc: '微笑' }
];

assert.equal(
  getValidDrafts(contact, Date.now(), aiSettings, '').length,
  0,
  '表情集变化后，旧的主动消息草稿应失效，避免继续发送已删除表情'
);

{
  (globalThis as any).window.allEnabledEmojis = [
    { id: 'emoji-1', desc: '微笑' },
    { id: 'emoji-2', desc: '晚安' }
  ];
  const richContact = {
    ...contact,
    language: '英语',
    translateToChinese: true,
    userPersona: '用户最近在准备考试',
    background: '旧背景',
    relationship: '朋友',
    replyLimit: 80,
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: true,
    descriptionDoEnabled: true
  } as any;
  const richKey = getDraftContextKey(richContact, aiSettings, 'abc');
  richContact.proactiveDrafts = [{
    id: 'draft-rich',
    content: '今晚早点休息。',
    generatedAt: Date.now() - 1000,
    expiresAt: Date.now() + 60_000,
    contextKey: richKey
  }];
  assert.equal(getValidDrafts(richContact, Date.now(), aiSettings, 'abc').length, 1, '上下文未变化时草稿应继续有效');
  assert.equal(
    getValidDrafts({ ...richContact, translateToChinese: false }, Date.now(), aiSettings, 'abc').length,
    0,
    '关闭中文翻译后，旧主动草稿应失效，避免继续发送旧译文格式'
  );
  assert.equal(
    getValidDrafts({ ...richContact, userPersona: '用户最近换了工作节奏' }, Date.now(), aiSettings, 'abc').length,
    0,
    '联系人专属用户补充变化后，旧主动草稿应失效，避免沿用旧用户信息'
  );
  assert.equal(
    getValidDrafts({ ...richContact, background: '新背景' }, Date.now(), aiSettings, 'abc').length,
    0,
    '角色背景变化后，旧主动草稿应失效，避免沿用旧人设'
  );
  assert.equal(
    getValidDrafts({ ...richContact, replyLimit: 12 }, Date.now(), aiSettings, 'abc').length,
    0,
    '回复限制变化后，旧主动草稿应失效，避免发送超出新限制的缓存内容'
  );
  assert.equal(
    getValidDrafts(richContact, Date.now(), aiSettings, 'xyz').length,
    0,
    '额外提示词内容变化后，即使长度相同，旧主动草稿也应失效'
  );
}

{
  const contextContact = {
    ...contact,
    selectedMaskId: selectedMask.id,
    proactiveDrafts: []
  } as any;
  const runtimeContext = {
    user,
    masks: [selectedMask],
    contactMemories,
    worldBooks
  };
  const contextKey = getDraftContextKey(contextContact, aiSettings, '', runtimeContext);
  contextContact.proactiveDrafts = [{
    id: 'draft-user-context',
    content: '考试辛苦了，今晚早点休息。',
    generatedAt: Date.now() - 1000,
    expiresAt: Date.now() + 60_000,
    contextKey
  }];
  assert.equal(
    getValidDrafts(contextContact, Date.now(), aiSettings, '', runtimeContext).length,
    1,
    '用户资料、面具和记忆未变化时草稿应有效'
  );
  assert.equal(
    getValidDrafts(contextContact, Date.now(), aiSettings, '', {
      ...runtimeContext,
      user: { ...user, status: '考试已经结束，最近在休假', occupation: '自由插画师', hobbies: '红茶、看展' }
    }).length,
    0,
    '用户状态、职业或兴趣变化后，旧主动草稿应失效，避免继续引用过期用户信息'
  );
  assert.equal(
    getValidDrafts(contextContact, Date.now(), aiSettings, '', {
      ...runtimeContext,
      user: { ...user, persona: '熟人面前也会保持克制', expressionStyle: '说话更直接' }
    }).length,
    0,
    '用户人设或表达风格变化后，旧主动草稿应失效，避免继续引用旧用户信息'
  );
  assert.equal(
    getValidDrafts(contextContact, Date.now(), aiSettings, '', {
      ...runtimeContext,
      masks: [{ ...selectedMask, description: '最近不再打工，正在准备作品集', updatedAt: 2 }]
    }).length,
    0,
    '同一个面具 ID 的内容变化后，旧主动草稿应失效，避免沿用旧面具信息'
  );
  assert.equal(
    getValidDrafts(contextContact, Date.now(), aiSettings, '', {
      ...runtimeContext,
      contactMemories: {
        c1: [{
          ...contactMemories.c1[0],
          text: '用户已经恢复作息，最近希望聊展览安排',
          timestamp: 2
        }]
      }
    }).length,
    0,
    '联系人记忆变化后，旧主动草稿应失效，避免继续引用旧近况'
  );

  const memoryNow = Date.now();
  const structuredMemoryContext = {
    ...runtimeContext,
    now: memoryNow,
    contactMemories: {
      c1: [{
        id: 'mem-structured',
        text: '用户最近感冒，嗓子不舒服',
        source: 'user',
        timestamp: memoryNow - 1000,
        category: 'health',
        topic: '感冒',
        temporalType: 'short_term',
        status: 'active',
        validDays: 1,
        expiresAt: memoryNow + 1000
      }]
    }
  } as any;
  const structuredContact = {
    ...contextContact,
    proactiveDrafts: []
  } as any;
  const structuredKey = getDraftContextKey(structuredContact, aiSettings, '', structuredMemoryContext);
  structuredContact.proactiveDrafts = [{
    id: 'draft-structured-memory',
    content: '今天嗓子还难受吗？记得多喝点水。',
    generatedAt: memoryNow,
    expiresAt: memoryNow + 60_000,
    contextKey: structuredKey
  }];
  assert.equal(
    getValidDrafts(structuredContact, memoryNow, aiSettings, '', structuredMemoryContext).length,
    1,
    '结构化记忆状态未变化且未过期时，主动草稿应有效'
  );
  assert.equal(
    getValidDrafts(structuredContact, memoryNow, aiSettings, '', {
      ...structuredMemoryContext,
      contactMemories: {
        c1: [{
          ...structuredMemoryContext.contactMemories.c1[0],
          status: 'ended'
        }]
      }
    }).length,
    0,
    'AI 标记同一记忆状态结束后，旧主动草稿应失效，避免继续引用旧短期状态'
  );
  assert.equal(
    getValidDrafts(structuredContact, memoryNow + 2000, aiSettings, '', structuredMemoryContext).length,
    0,
    '短期记忆超过 expiresAt 后，旧主动草稿应失效，避免过期状态继续主动发出'
  );

  assert.equal(
    getValidDrafts(contextContact, Date.now(), aiSettings, '', {
      ...runtimeContext,
      worldBooks: [
        {
          ...worldBooks[0],
          entries: [{ id: 'entry-1', text: '角色已经搬到山城，新日常围绕美术馆展开。' }]
        }
      ]
    }).length,
    0,
    '世界书内容变化后，旧主动草稿应失效，避免继续沿用旧世界观'
  );
  assert.equal(
    getValidDrafts({
      ...contextContact,
      useCustomWorldBooks: true,
      worldBookIds: ['wb-1']
    }, Date.now(), aiSettings, '', runtimeContext).length,
    0,
    '联系人切换世界书绑定方式后，旧主动草稿应失效，避免使用错误世界书范围'
  );
}

const runtimeSource = readFileSync(new URL('../src/hooks/proactiveChatRuntime.ts', import.meta.url), 'utf8');
const contactTypeSource = readFileSync(new URL('../src/types/contact.ts', import.meta.url), 'utf8');
const draftContextSource = readFileSync(new URL('../src/hooks/proactiveDraftContext.ts', import.meta.url), 'utf8');

assert.match(contactTypeSource, /translatedContentZhCN\?: string;/, '主动消息草稿类型应保存译文，避免缓存发送时丢翻译');
assert.match(contactTypeSource, /innerVoice\?: string;/, '主动消息草稿类型应保存心声，避免缓存发送时丢心声');
assert.match(contactTypeSource, /actionDesc\?: string;/, '主动消息草稿类型应保存动作，避免缓存发送时丢动作');
assert.match(runtimeSource, /translatedContentZhCN: replyPayload\.translatedContentZhCN/, '预热主动草稿时应缓存译文');
assert.match(runtimeSource, /normalizeProactiveReplyPayloadForContact\(\{\s*text: cachedDraft\.content/s, '发送缓存主动草稿前应按当前模式重新清理草稿正文和元信息');
assert.match(runtimeSource, /normalizeProactiveReplyPayloadForContact\(replyPayload, contact\)/, '主动消息最终落地前应按当前聊天模式过滤心声和动作');
assert.match(runtimeSource, /draftPayload\?\.text !== normalizedPayload\.text/, '主动消息发送后应按清理后的正文移除对应草稿，避免脏缓存残留');
assert.match(runtimeSource, /innerVoice: cachedDraft\.innerVoice/, '发送缓存主动草稿时应恢复心声');
assert.match(runtimeSource, /actionDesc: cachedDraft\.actionDesc/, '发送缓存主动草稿时应恢复动作');
assert.doesNotMatch(runtimeSource, /cachedDraft\.isNpc|cachedDraft\.npcName|replyPayload\.isNpc|replyPayload\.npcName/, '主动草稿不应再缓存或落地主动 NPC 旧字段');
assert.match(runtimeSource, /getAppendedMessageMemoryRecord\(aiMsg\)/, '主动消息写入记忆时应复用完整消息记忆规则');
assert.match(draftContextSource, /PROACTIVE_DRAFT_TRIGGER_TEXT/, '主动草稿缓存 key 应包含草稿触发语，提示策略变化后旧草稿应失效');
assert.match(draftContextSource, /PROACTIVE_TEXT_ONLY_RUNTIME_GUARD/, '主动草稿缓存 key 应包含最终只正文约束，避免沿用旧系统能力草稿');
assert.match(draftContextSource, /buildWorldBookDraftFingerprint/, '主动草稿缓存 key 应包含世界书指纹，避免沿用旧世界观草稿');
assert.match(draftContextSource, /item\.category/, '主动草稿缓存 key 应包含记忆结构化类别，避免沿用旧记忆判断');
assert.match(draftContextSource, /item\.topic/, '主动草稿缓存 key 应包含记忆主题，避免同文本不同主题状态混用');
assert.match(draftContextSource, /temporalState/, '主动草稿缓存 key 应包含记忆时效状态，避免短期状态过期后继续发送旧草稿');
assert.match(runtimeSource, /worldBooks: args\.worldBooks/, '主动草稿预热和取缓存应使用当前世界书列表');
assert.match(runtimeSource, /now: generatedAt/, '主动草稿生成时应使用生成时刻记录结构化记忆时效指纹');

const helpersSource = readFileSync(new URL('../src/hooks/proactiveChatHelpers.ts', import.meta.url), 'utf8');
assert.match(helpersSource, /\(parsed\.specials \|\| \[\]\)\.length > 0\) return null/, '主动聊天应在代码层拒收结构化系统能力输出，不能只靠提示词约束');
assert.doesNotMatch(helpersSource, /item\.type !== 'npc'|isNpcSpecial|npcSpecial/, '主动聊天不应再把 npc special 当作例外旧兜底');

{
  const payload = normalizeProactiveReplyPayload({
    text: '晚上早点睡。',
    innerVoice: '心声：其实有点担心你',
    actionDesc: '【动作】把热水放到桌边',
    translatedContentZhCN: '译文：早点休息。',
    isNpc: true,
    npcName: '旁人【系统说明】内部名'
  } as any);
  assert.deepEqual(payload, {
    text: '晚上早点睡。',
    innerVoice: '其实有点担心你',
    actionDesc: '把热水放到桌边',
    translatedContentZhCN: '早点休息。'
  }, '主动消息落地前应统一归一结构字段，并忽略 NPC 旧字段');
  assert.equal(
    normalizeProactiveReplyPayload({ text: '晚上早点睡。【动作】把灯调暗' }),
    null,
    '主动缓存草稿正文混入动作格式时应拒收，不再截断成半句'
  );
  assert.equal(
    normalizeProactiveReplyPayload({ text: '【动作】只剩动作标签' }),
    null,
    '主动缓存草稿清理后没有正文时不应继续发送'
  );
  assert.equal(
    normalizeProactiveReplyPayload({ text: '我给你转账了 [系统转账·待收款] ¥20' }),
    null,
    '主动缓存草稿混入系统能力格式时不应截断成假系统能力正文继续发送'
  );

  assert.deepEqual(
    normalizeProactiveReplyPayloadForContact({
      text: '晚上早点睡。',
      innerVoice: '其实有点担心你',
      actionDesc: '把热水放到桌边'
    }, {
      chatMode: 'online'
    } as any),
    {
      text: '晚上早点睡。',
      innerVoice: undefined,
      actionDesc: undefined,
      translatedContentZhCN: undefined
    },
    '在线主动消息最终落地前应过滤缓存草稿里的心声和动作'
  );
  assert.deepEqual(
    normalizeProactiveReplyPayloadForContact({
      text: '晚上早点睡。',
      innerVoice: '其实有点担心你',
      actionDesc: '把热水放到桌边'
    }, {
      chatMode: 'offline-inner'
    } as any),
    {
      text: '晚上早点睡。',
      innerVoice: '其实有点担心你',
      actionDesc: '把热水放到桌边',
      translatedContentZhCN: undefined
    },
    '允许心声和动作的主动消息仍应保留缓存草稿元信息'
  );
}

{
  const currentKey = getDraftContextKey(contact, aiSettings, '');
  const legacyKeyParts = currentKey.split('|');
  legacyKeyParts.splice(4, 1);
  const legacyContact = {
    ...contact,
    proactiveDrafts: [{
      id: 'draft-before-policy-key',
      content: '我给你转了钱，记得收一下。',
      generatedAt: Date.now() - 1000,
      expiresAt: Date.now() + 60_000,
      contextKey: legacyKeyParts.join('|')
    }]
  } as any;
  assert.equal(
    getValidDrafts(legacyContact, Date.now(), aiSettings, '').length,
    0,
    '主动草稿 key 增加提示策略指纹后，旧版本缓存草稿应失效，避免继续发送旧能力格式'
  );
}

console.log('测试通过：主动消息草稿会随表情集、用户资料、面具、记忆和世界书变化失效，并保留译文、心声和动作。');
