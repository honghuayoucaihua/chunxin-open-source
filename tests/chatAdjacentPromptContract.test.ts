import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildChatReplySuggestionHistory,
  buildChatReplySuggestionInstruction,
  buildChatReplySuggestionRuntimePrompt
} from '../src/app/chatReplySuggestionFlow.ts';
import { buildTruthOrDareSystemPrompt } from '../src/app/sendMessage/truthOrDareRuntimePrompt.ts';
import { buildReplySuggestionQualityLines } from '../src/utils/prompt/replySuggestionQualityPrompt.ts';
import type { Contact, Mask, UserProfile } from '../src/types/index.ts';

{
  const lines = buildReplySuggestionQualityLines().join('\n');
  assert.match(lines, /承接联系人上一句的具体信息、情绪、关系变化或当前事件/, '候选回复规则应要求承接具体上下文');
  assert.match(lines, /保持“用户本人”的口吻、边界和关系立场/, '候选回复规则应保持用户口吻和边界');
  assert.match(lines, /自然体现用户资料、当前面具或联系人记忆中的一处具体线索/, '候选回复规则应要求自然使用用户线索');
  assert.match(lines, /至少在态度、推进方式或情绪强度上明显区分/, '候选回复规则应避免三句同质化');
  assert.match(lines, /心声、动作、旁白或翻译只能作为理解上下文的参考/, '候选回复规则应隔离历史格式');
  assert.match(lines, /系统能力必须通过对应结构化类型落地/, '候选回复规则应隔离系统能力入口');
}

{
  const instruction = buildChatReplySuggestionInstruction({
    isStoryChat: false,
    myName: '我',
    contactName: '林夏',
    myPersona: '慢热但认真',
    contactPersona: '嘴硬心软'
  });

  assert.match(instruction, /【候选质量规则】/, '普通候选回复应接入专用质量规则');
  assert.match(instruction, /承接联系人上一句的具体信息/, '普通候选回复应贴合上文具体内容');
  assert.match(instruction, /3句都必须是“用户口吻”/, '普通候选回复仍必须是用户口吻');
  assert.match(instruction, /只能是用户将要发送的正文/, '普通候选回复仍不能输出心声动作等格式');
}

{
  const storyInstruction = buildChatReplySuggestionInstruction({
    isStoryChat: true,
    myName: '我',
    contactName: '林夏',
    myPersona: '谨慎的调查员',
    contactPersona: '不愿坦白的旧友'
  });

  assert.match(storyInstruction, /剧情候选要推动当前场景/, '剧情候选回复应强化场景推进');
  assert.match(storyInstruction, /不能替联系人行动/, '剧情候选回复不能越界替对方行动');
  assert.match(storyInstruction, /用户第一人称口吻/, '剧情候选回复仍应是用户第一人称');
}

{
  const history = buildChatReplySuggestionHistory([
    {
      id: 'sys-1',
      senderId: 'system',
      type: 'system',
      content: '你已添加对方为好友',
      timestamp: 1
    } as any,
    {
      id: 'm1',
      senderId: 'c1',
      type: 'text',
      content: '刚才那条系统提示别当成我说的。',
      timestamp: 2
    } as any
  ], {
    id: 'c1',
    name: '林夏',
    pinyin: 'linxia',
    avatar: '',
    unreadCount: 0,
    isAi: true
  } as Contact, {
    name: '小满'
  }, {});

  assert.match(history, /【系统】你已添加对方为好友/, '候选回复历史应保留系统事件语义');
  assert.doesNotMatch(history, /林夏：【系统】/, '候选回复历史不应把系统事件标成联系人发言');
  assert.match(history, /林夏：刚才那条系统提示别当成我说的。/, '候选回复历史仍应标注真实联系人发言');
}

{
  const user: UserProfile = {
    name: '小满',
    wechatId: 'xiaoman',
    avatar: '',
    gender: 'female',
    region: '杭州',
    signature: '',
    momentsCover: '',
    status: '最近在准备考试',
    occupation: '插画师',
    hobbies: '咖啡、散步'
  };
  const mask: Mask = {
    id: 'mask-1',
    name: '咖啡店打工人',
    occupation: '咖啡师',
    description: '下班后话会变多',
    createdAt: 1
  };
  const contact: Contact = {
    id: 'c1',
    name: '林夏',
    pinyin: 'linxia',
    avatar: '',
    unreadCount: 0,
    isAi: true,
    selectedMaskId: mask.id,
    userPersona: '和林夏熟悉后会更愿意开玩笑'
  };
  const runtimePrompt = buildChatReplySuggestionRuntimePrompt({
    runtimeUserPromptBase: '【当前北京时间】2026/7/6',
    memoryPrompt: '【联系人记忆】\n- 用户最近睡眠不好',
    user,
    contact,
    masks: [mask]
  });

  assert.match(runtimePrompt, /当前用户信息/, '候选回复运行时提示应补充当前用户信息');
  assert.match(runtimePrompt, /状态：最近在准备考试/, '候选回复运行时提示应携带用户状态');
  assert.match(runtimePrompt, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '候选回复运行时提示应提醒用户状态不是永久事实');
  assert.match(runtimePrompt, /当前聊天面具：.*咖啡店打工人/, '候选回复运行时提示应携带当前聊天面具');
  assert.match(runtimePrompt, /当前聊天补充：和林夏熟悉后会更愿意开玩笑/, '候选回复运行时提示应携带联系人专属用户说明');
  assert.match(runtimePrompt, /用户最近睡眠不好/, '候选回复运行时提示应保留联系人记忆');
}

{
  const truthDarePrompt = buildTruthOrDareSystemPrompt({
    baseSystemPrompt: '【能力范围】\n可以使用红包 redpacket、转账 transfer、朋友圈 moments。',
    contactName: '林夏',
    userName: '用户',
    chatMode: 'online',
    persona: '嘴硬心软，容易用玩笑掩饰关心',
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: true,
    descriptionDoEnabled: false
  });

  assert.match(truthDarePrompt, /【角色演绎质量】/, '真心话大冒险系统提示应接入角色演绎质量规则');
  assert.match(truthDarePrompt, /承接用户上一句的具体信息、情绪或动作/, '真心话大冒险应承接用户具体输入');
  assert.match(truthDarePrompt, /真实聊天意图/, '真心话大冒险应避免无意图空话');
  assert.match(truthDarePrompt, /情绪要有来由和层次/, '真心话大冒险应保留真实情绪层次');
  assert.match(truthDarePrompt, /关系推进要小步发生/, '真心话大冒险应避免突然推进关系');
  assert.doesNotMatch(truthDarePrompt, /redpacket|transfer|moments/i, '真心话大冒险不应继承被过滤的支付或发布能力提示');
}

{
  const truthDarePrompt = buildTruthOrDareSystemPrompt({
    baseSystemPrompt: '【角色背景】\n林夏曾经把红包和转账当成玩笑话提过，但这只是人物经历，不是系统能力说明。',
    contactName: '林夏',
    userName: '用户',
    chatMode: 'online',
    persona: '嘴硬心软，容易用玩笑掩饰关心',
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: true,
    descriptionDoEnabled: false
  });

  assert.match(truthDarePrompt, /【角色背景】/, '真心话大冒险基础提示只应按明确章节标题清理，不应靠关键词删除普通角色背景');
  assert.match(truthDarePrompt, /把红包和转账当成玩笑话提过/, '普通角色背景中的自然语言不应因命中支付词被移除');
}

const chatRoomSource = readFileSync(new URL('../src/ChatRoom.tsx', import.meta.url), 'utf8');
assert.match(chatRoomSource, /承接刚才的内容或关系情绪/, '真心话大冒险自动短句提示应要求承接当前内容');
assert.match(chatRoomSource, /真实聊天意图/, '真心话大冒险自动短句提示应要求真实意图');
assert.match(chatRoomSource, /关系变化只能小步发生/, '真心话大冒险自动短句提示应避免关系突变');
assert.match(chatRoomSource, /不要空泛评论，也不要解释规则/, '真心话大冒险自动短句提示应避免空泛和规则解释');

const truthOrDareModalSource = readFileSync(new URL('../src/chatroom/TruthOrDareModal.tsx', import.meta.url), 'utf8');
assert.match(truthOrDareModalSource, /buildTruthOrDareThemeFillSystemPrompt/, '真心话大冒险 AI 填题应使用专门系统提示');
assert.match(truthOrDareModalSource, /沉浸式角色扮演聊天/, '真心话大冒险题库应服务于角色扮演体验');
assert.match(truthOrDareModalSource, /具体回应、轻微张力、关系推进或情绪层次/, '真心话大冒险题库应能推进关系和情绪');
assert.match(truthOrDareModalSource, /聊天中可执行的小动作、小表达或轻量互动/, '大冒险题目应适合聊天内落地');
assert.match(truthOrDareModalSource, /不要求转账、红包、露脸、隐私暴露或越界接触/, '大冒险题目不应绕过系统能力或制造越界要求');
assert.match(truthOrDareModalSource, /避免低俗、羞辱、胁迫/, '真心话大冒险题库应避免破坏沉浸感和边界的内容');
assert.match(truthOrDareModalSource, /buildTruthOrDareThemeFillPrompt\(selectedThemeName\)/, '真心话大冒险 AI 填题应实际使用强化后的用户提示');
assert.match(truthOrDareModalSource, /extractStrictJsonObject/, '真心话大冒险 AI 填题不应从解释文本中截取 JSON 继续使用');
assert.match(truthOrDareModalSource, /normalizeGeneratedNonSystemEventText\(q, \{ collapseWhitespace: true \}\)/, '真心话大冒险 AI 生成的问题保存前应清理非展示格式和系统事件格式片段');
assert.match(truthOrDareModalSource, /normalizeGeneratedNonSystemEventText\(c, \{ collapseWhitespace: true \}\)/, '真心话大冒险 AI 生成的挑战保存前应清理非展示格式和系统事件格式片段');

const chatRoomActionFlowSource = readFileSync(new URL('../src/app/chatRoomActionFlow.ts', import.meta.url), 'utf8');
assert.match(chatRoomActionFlowSource, /buildChatReplySuggestionRuntimePrompt/, '候选回复实际请求应复用运行时用户信息提示');
assert.match(chatRoomActionFlowSource, /masks: params\.masks/, '候选回复实际请求应传入当前聊天面具列表');

const chatSceneActionHandlersSource = readFileSync(new URL('../src/app/chatSceneActionHandlers.ts', import.meta.url), 'utf8');
assert.match(chatSceneActionHandlersSource, /masks: options\.masks/, '候选回复上层动作应向运行时传递面具列表');

console.log('测试通过：聊天周边生成入口已对齐主聊天质量规则。');
