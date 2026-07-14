import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatDetailedContactProfile } from '../src/appStateNormalizeUtils.ts';
import { parseGroupReplyMessages } from '../src/utils/chat/groupReplyParser.ts';
import type { Contact } from '../src/types/index.ts';

const groupFlowSource = readFileSync(new URL('../src/app/sendMessage/groupChatFlow.ts', import.meta.url), 'utf8');
const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
const groupReplyRequestSource = readFileSync(new URL('../src/utils/chat/groupReplyRequest.ts', import.meta.url), 'utf8');
const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');
const groupReplyParserSource = readFileSync(new URL('../src/utils/chat/groupReplyParser.ts', import.meta.url), 'utf8');

assert.match(groupFlowSource, /parseGroupReplyMessages\(groupReply,/, '群聊首发应走共享群聊解析器');
assert.match(resendFlowSource, /parseGroupReplyMessages\(groupReply,/, '群聊重发应走共享群聊解析器');
assert.match(groupFlowSource, /memberBalances: requestContext\.memberBalances/, '群聊首发应把成员余额交给共享解析器');
assert.match(resendFlowSource, /memberBalances: requestContext\.memberBalances/, '群聊重发应把成员余额交给共享解析器');
assert.match(groupFlowSource, /memberVoiceEnabled: requestContext\.memberVoiceEnabled/, '群聊首发应把成员语音能力交给共享解析器');
assert.match(resendFlowSource, /memberVoiceEnabled: requestContext\.memberVoiceEnabled/, '群聊重发应把成员语音能力交给共享解析器');
assert.match(groupFlowSource, /memberVoiceIds: requestContext\.memberVoiceIds/, '群聊首发应把成员 voiceId 指纹交给共享解析器');
assert.match(resendFlowSource, /memberVoiceIds: requestContext\.memberVoiceIds/, '群聊重发应把成员 voiceId 指纹交给共享解析器');
assert.match(groupReplyRequestSource, /member\.minimaxTTS\?\.enabled === true && !!String\(member\.minimaxTTS\?\.voiceId \|\| ''\)\.trim\(\)/, '群聊成员语音能力应要求真实 voiceId');
assert.match(groupFlowSource, /allowSystemAbilities: requestContext\.effectiveChatMode !== 'story'/, '群聊首发应在剧情模式禁用普通聊天系统能力');
assert.match(resendFlowSource, /allowSystemAbilities: requestContext\.effectiveChatMode !== 'story'/, '群聊重发应在剧情模式禁用普通聊天系统能力');
assert.match(groupFlowSource, /applyGroupPaymentDebit\(item, params\.applyContactBalanceDelta\)/, '群聊首发支付消息落地后应扣 speakerId 对应成员余额');
assert.match(resendFlowSource, /params\.applyContactBalanceDelta\(msg\.senderId, -amount\)/, '群聊重发支付消息落地后应扣 speakerId 对应成员余额');
assert.doesNotMatch(groupFlowSource, /const rawItems = Array\.isArray\(parsedJson\?\.messages\) \? parsedJson\.messages : \[];/, '群聊首发不应再直接手写 messages 解析');
assert.doesNotMatch(resendFlowSource, /const rawItems = Array\.isArray\(parsedJson\?\.messages\) \? parsedJson\.messages : \[];/, '群聊重发不应再直接手写 messages 解析');
assert.match(promptBuildersSource, /translationZh/, '群聊 JSON 模板应允许输出简体中文译文');
assert.match(promptBuildersSource, /pairs/, '群聊 JSON 模板应允许多句双语 pairs，避免双语回复掉格式');
assert.match(promptBuildersSource, /回复语言/, '群聊提示应要求遵守成员回复语言设置');
assert.match(promptBuildersSource, /中文翻译=需要/, '群聊提示应说明需要翻译时的输出规则');
assert.match(promptBuildersSource, /content 和 pairs 必须二选一/, '群聊提示应明确 content 与 pairs 是互斥正文结构');
assert.match(promptBuildersSource, /使用 pairs 时不要再输出 content 或 translationZh/, '群聊提示应禁止 pairs 与顶层译文混用');
assert.match(promptBuildersSource, /voiceId 必须填该成员资料里的真实 voiceId/, '群聊语音提示应要求输出成员真实 voiceId');
assert.doesNotMatch(promptBuildersSource, /voiceId\/speed\/language 可选/, '群聊语音提示不应再把 voiceId 当成可选字段');
assert.doesNotMatch(promptBuildersSource, /\}或\{/, '群聊 JSON 模板不应在 JSON 示例里用自然语言“或”表达互斥结构');
assert.match(groupReplyParserSource, /normalizeGeneratedStrictNonSystemEventText\(directStringContent/, '群聊普通文本应来自外层 content 字段的明确结构，不应靠通用解析器兜底');
assert.match(groupReplyParserSource, /parseAIReply\(input, allowInner, allowAction, \{ allowSocial: false, requireStructured: true \}\)/, '群聊嵌套结构解析应显式要求严格 JSON');
assert.match(groupReplyParserSource, /resolveGroupMessageType/, '群聊消息类型应先经过显式白名单解析');
assert.match(groupReplyParserSource, /isValidGroupTextMessageShape/, '群聊文本消息应先校验 content、pairs 和 translationZh 的结构关系');
assert.doesNotMatch(groupReplyParserSource, /item\.type \|\| 'text'/, '群聊消息缺失 type 时不应兜底为普通正文');
assert.doesNotMatch(groupReplyParserSource, /GROUP_SUPPORTED_TYPES\.has\(rawType\) \? rawType : 'text'/, '群聊未知 type 不应被兜底成普通正文');

{
  const parsed = parseGroupReplyMessages('说明文字 {"messages":[{"speakerId":"alice","type":"text","content":"不应落地"}]}', {
    memberIds: ['alice'],
    now: 102456,
    idPrefix: 'group-strict-json'
  });

  assert.deepEqual(parsed, [], '群聊顶层回复不应从解释文本中截取 JSON 继续落地');
}

{
  const reply = JSON.stringify({
    messages: [
      { speakerId: 'alice', content: '没有 type 不能当普通正文落地' },
      { speakerId: 'bob', type: 'emoji', content: '未知类型不能当普通正文落地' },
      { speakerId: 'carol', type: 'text', content: '我只是随口说红包、转账和位置，今晚不真的发。' }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob', 'carol'],
    now: 102856,
    idPrefix: 'group-type-strict'
  });

  assert.deepEqual(parsed, [
    {
      id: '102856-group-type-strict-2',
      senderId: 'carol',
      content: '我只是随口说红包、转账和位置，今晚不真的发。',
      timestamp: 102858,
      type: 'text'
    }
  ], '群聊 type 必须显式合法；普通正文提到系统能力词也不应触发能力或被误拦截');
}

{
  const reply = JSON.stringify({
    messages: [
      { speakerId: 'alice', type: 'redpacket', amount: '8.88', content: '剧情模式不应付款' },
      { speakerId: 'alice', type: 'text', content: '红包我已经发你了，收下吧。' },
      { speakerId: 'bob', type: 'text', content: '先别把剧情写成付款。' }
    ]
  });
  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 103456,
    idPrefix: 'group-story-payment',
    allowSystemAbilities: false
  });

  assert.deepEqual(
    parsed.map((item) => `${item.senderId}:${item.content}`),
    ['bob:先别把剧情写成付款。'],
    '剧情群聊中同一成员出现禁用支付意图时，应整体拦截该成员输出，避免支付失败后假付款正文落地'
  );
}

{
  const profile = formatDetailedContactProfile({
    id: 'alice',
    name: 'Alice',
    pinyin: 'alice',
    avatar: '',
    unreadCount: 0,
    language: '英语',
    translateToChinese: true,
    status: '最近感冒刚好，嗓子还有点哑',
    balance: 18.5,
    minimaxTTS: {
      enabled: true,
      voiceId: 'voice-alice',
      speed: 1,
      language: 'Chinese'
    }
  } as Contact);

  assert.match(profile, /回复语言：英语/, '群成员完整资料应包含回复语言');
  assert.match(profile, /中文翻译：需要/, '群成员完整资料应包含中文翻译设置');
  assert.match(profile, /状态：最近感冒刚好，嗓子还有点哑/, '群成员完整资料应包含成员状态');
  assert.match(profile, /状态时效：角色状态“最近感冒刚好，嗓子还有点哑”可能是近期或临时状态/, '群成员状态应提示时效性，避免被当成永久事实');
  assert.match(profile, /钱包余额：¥18\.50/, '群成员完整资料应包含钱包余额');
  assert.match(profile, /语音能力：已开启（voiceId=voice-alice）/, '群成员完整资料应包含语音能力状态');

  const incompleteVoiceProfile = formatDetailedContactProfile({
    id: 'bob',
    name: 'Bob',
    pinyin: 'bob',
    avatar: '',
    unreadCount: 0,
    minimaxTTS: {
      enabled: true,
      voiceId: '',
      speed: 1,
      language: 'Chinese'
    }
  } as Contact);
  assert.doesNotMatch(incompleteVoiceProfile, /语音能力：已开启/, '群成员缺少 voiceId 时不应向 AI 暴露语音能力');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: JSON.stringify({
          text: '先发这句',
          actionDesc: '动作：挥了挥手',
          translationZh: '译文：先发这句'
        })
      },
      {
        speakerId: 'bob',
        type: 'image',
        imageUrl: 'https://example.com/demo.png'
      },
      {
        speakerId: 'alice',
        type: 'text',
        content: 'Je suis la.',
        translationZh: '【译文】我在这里。'
      },
      {
        speakerId: 'stranger',
        type: 'text',
        content: '不应通过'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 123456,
    idPrefix: 'case'
  });

  assert.equal(parsed.length, 2, '共享解析器应过滤非群成员消息和 JSON 字符串 content');
  assert.deepEqual(parsed[0], {
    id: '123456-case-1',
    senderId: 'bob',
    content: 'https://example.com/demo.png',
    timestamp: 123457,
    type: 'image'
  }, '群聊图片应统一保留图片地址');
  assert.deepEqual(parsed[1], {
    id: '123456-case-2',
    senderId: 'alice',
    content: 'Je suis la.',
    timestamp: 123458,
    type: 'text',
    translatedContentZhCN: '我在这里。'
  }, '群聊文本应支持顶层 translationZh 译文');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'image',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
      },
      {
        speakerId: 'bob',
        type: 'image',
        imageUrl: '这不是图片地址'
      },
      {
        speakerId: 'carl',
        type: 'image',
        imageUrl: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'.repeat(4)
      },
      {
        speakerId: 'dana',
        type: 'image',
        imageUrl: '/local/path.png'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob', 'carl', 'dana'],
    now: 123500,
    idPrefix: 'image-url'
  });

  assert.deepEqual(parsed, [
    {
      id: '123500-image-url-0',
      senderId: 'alice',
      content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      timestamp: 123500,
      type: 'image'
    }
  ], '群聊图片只应接受 http/https 或 data:image dataURL，不应把任意字符串当图片能力落地');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: 'Je suis la.',
        pairs: [{ text: 'Ne t inquiete pas.', translationZh: '别担心。' }]
      },
      {
        speakerId: 'bob',
        type: 'text',
        pairs: [{ text: 'I am downstairs.', translationZh: '我在楼下。' }],
        translationZh: '错误顶层译文'
      },
      {
        speakerId: 'alice',
        type: 'text',
        content: '{"text":"不应二次解析"}'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '正常正文'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 124456,
    idPrefix: 'group-text-shape'
  });

  assert.deepEqual(parsed, [
    {
      id: '124456-group-text-shape-3',
      senderId: 'bob',
      content: '正常正文',
      timestamp: 124459,
      type: 'text'
    }
  ], '群聊 text 消息不应把 content+pairs、pairs+translationZh 或 JSON 字符串 content 补成有效正文');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: '我先把话说明白。【动作】把杯子放下'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '那你慢慢说 译文：Take your time'
      },
      {
        speakerId: 'alice',
        type: 'text',
        content: '我先到楼下。[位置] 春信咖啡'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '[系统红包·待领取] ¥8.88'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 133456,
    idPrefix: 'group-visible-clean'
  });

  assert.equal(parsed.length, 0, '群聊普通正文混入动作、译文或系统能力格式时应整条拒收，不再截断成半句');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        pairs: [
          { text: 'Je suis la.', translationZh: '我在这里。' },
          { text: 'Ne t inquiete pas.', translationZh: '别担心。' }
        ]
      },
      {
        speakerId: 'bob',
        type: 'text',
        pairs: [
          { text: 'I am downstairs.', translationZh: '我在楼下。' },
          { text: 'Take your time.', translationZh: '慢慢来。' }
        ]
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 173456,
    idPrefix: 'group-pairs'
  });

  assert.deepEqual(parsed[0], {
    id: '173456-group-pairs-0',
    senderId: 'alice',
    content: 'Je suis la.Ne t inquiete pas.',
    timestamp: 173456,
    type: 'text',
    translatedContentZhCN: '我在这里。别担心。'
  }, '群聊消息顶层 pairs 应落地为原文正文和简体中文译文');
  assert.deepEqual(parsed[1], {
    id: '173456-group-pairs-1',
    senderId: 'bob',
    content: 'I am downstairs.Take your time.',
    timestamp: 173457,
    type: 'text',
    translatedContentZhCN: '我在楼下。慢慢来。'
  }, '群聊消息顶层 pairs 应复用单聊双语解析规则');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: '我到了',
        innerVoice: '心声：其实有点紧张',
        actionDesc: '【动作】把包放到椅子边'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '先坐吧',
        innerVoice: '【心声】想让气氛轻松点',
        actionDesc: '动作：拉开旁边的椅子'
      }
    ]
  });

  const parsedWithoutMeta = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 223456,
    idPrefix: 'group-policy'
  });
  assert.deepEqual(parsedWithoutMeta, [], '群聊默认禁用心声/动作时，带禁用结构字段的 AI 消息应整条拒收，而不是忽略后继续落地');

  const parsedWithMeta = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 323456,
    idPrefix: 'group-policy',
    allowInner: true,
    allowAction: true
  });
  assert.equal(parsedWithMeta[0]?.innerVoice, '其实有点紧张', '允许心声时应从顶层结构化字段落地群聊心声');
  assert.equal(parsedWithMeta[0]?.actionDesc, '把包放到椅子边', '允许动作时应从顶层结构化字段落地群聊动作');
  assert.equal(parsedWithMeta[1]?.innerVoice, '想让气氛轻松点', '允许心声时应支持群聊消息顶层心声字段');
  assert.equal(parsedWithMeta[1]?.actionDesc, '拉开旁边的椅子', '允许动作时应支持群聊消息顶层动作字段');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'redpacket',
        amount: '6.6',
        content: '一起喝奶茶'
      },
      {
        speakerId: 'bob',
        type: 'transfer',
        amount: '.5',
        message: '刚才那份我补上'
      },
      {
        speakerId: 'alice',
        type: 'redpacket',
        amount: '6.666',
        content: '金额非法'
      },
      {
        speakerId: 'stranger',
        type: 'transfer',
        amount: '1',
        content: '非成员不应通过'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 423456,
    idPrefix: 'group-pay'
  });

  assert.deepEqual(parsed, [
    {
      id: '423456-group-pay-1',
      senderId: 'bob',
      content: '刚才那份我补上',
      amount: '0.50',
      timestamp: 423457,
      type: 'transfer',
      isOpened: false,
      paymentStatus: 'pending'
    }
  ], '群聊红包/转账应落地为真实待领取支付消息；同一成员本轮出现非法支付时，该成员输出应整体拦截');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'transfer',
        amount: '6',
        content: '这笔我先转你'
      },
      {
        speakerId: 'bob',
        type: 'redpacket',
        amount: '8',
        content: '奶茶红包'
      },
      {
        speakerId: 'bob',
        type: 'transfer',
        amount: '15',
        content: '拆成第二笔也不应透支'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    memberBalances: { alice: 5, bob: 20 },
    now: 623456,
    idPrefix: 'group-pay-balance'
  });

  assert.deepEqual(parsed, [], '群聊支付应按 speakerId 余额过滤超额金额；同一成员本轮累计透支时应整体拦截该成员输出');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: '我把红包发你了，记得收。'
      },
      {
        speakerId: 'alice',
        type: 'redpacket',
        amount: '99',
        content: '余额不足的红包'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '那我先正常接一句。'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    memberBalances: { alice: 5, bob: 5 },
    now: 633456,
    idPrefix: 'group-pay-block-speaker'
  });

  assert.deepEqual(parsed, [
    {
      id: '633456-group-pay-block-speaker-2',
      senderId: 'bob',
      content: '那我先正常接一句。',
      timestamp: 633458,
      type: 'text'
    }
  ], '群聊同一成员出现无效支付 special 时，该成员普通文本也不应继续落地，避免假支付正文误导用户');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'location',
        locationName: '春信咖啡',
        locationAddress: '春风路18号'
      },
      {
        speakerId: 'bob',
        type: 'pat',
        targetName: '小满',
        fromName: '小白',
        patDesc: '肩膀'
      },
      {
        speakerId: 'alice',
        type: 'voice',
        content: '我马上到',
        voiceId: 'voice-001',
        speed: 1.1,
        language: 'Chinese'
      },
      {
        speakerId: 'bob',
        type: 'call',
        status: 'ended',
        durationSec: 125,
        content: '刚刚通话结束'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 523456,
    idPrefix: 'group-ability'
  });

  assert.deepEqual(parsed, [
    {
      id: '523456-group-ability-0',
      senderId: 'alice',
      content: '春信咖啡',
      timestamp: 523456,
      type: 'location',
      locationName: '春信咖啡',
      locationAddress: '春风路18号'
    },
    {
      id: '523456-group-ability-1',
      senderId: 'bob',
      content: '小白 拍了拍 小满 「肩膀」',
      timestamp: 523457,
      type: 'system',
      pat: {
        fromId: 'bob',
        fromName: '小白',
        targetName: '小满'
      }
    },
    {
      id: '523456-group-ability-2',
      senderId: 'alice',
      content: '我马上到',
      timestamp: 523458,
      type: 'voice',
      voiceId: 'voice-001',
      voiceSpeed: 1.1,
      voiceLanguage: 'Chinese'
    },
    {
      id: '523456-group-ability-3',
      senderId: 'bob',
      content: '刚刚通话结束',
      timestamp: 523459,
      type: 'call',
      callStatus: 'ended',
      callDurationSec: 125
    }
  ], '群聊应支持位置、拍一拍、语音和通话消息落地');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'redpacket',
        money: '8.88',
        content: '旧红包留言'
      },
      {
        speakerId: 'frank',
        type: 'transfer',
        amount: '8.88',
        content: '旧转账说明'
      },
      {
        speakerId: 'bob',
        type: 'location',
        name: '春信咖啡',
        address: '春风路18号'
      },
      {
        speakerId: 'carol',
        type: 'voice',
        text: '旧语音文本',
        voice_id: 'voice-old',
        voiceSpeed: 1.1,
        voiceLanguage: 'Chinese'
      },
      {
        speakerId: 'dave',
        type: 'call',
        callStatus: 'ended',
        duration: 125,
        text: '旧通话说明'
      },
      {
        speakerId: 'erin',
        type: 'text',
        text: '旧正文不应落地',
        translation: '旧译文'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'],
    memberVoiceEnabled: { carol: true },
    now: 526456,
    idPrefix: 'group-legacy-fields',
    maxMessages: 5
  });

  assert.deepEqual(parsed, [], '群聊 AI 输出不应再使用旧字段兜底，避免模型错字段也被补成有效能力或正文');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'location',
        name: '春信咖啡【动作】推门进去 [位置] 不该显示',
        address: '春风路18号 [位置] 春信咖啡'
      },
      {
        speakerId: 'bob',
        type: 'voice',
        text: '我马上到[语音] 不该显示'
      },
      {
        speakerId: 'bob',
        type: 'pat',
        fromName: '小白【动作】伸手 [系统] 不该显示',
        targetName: '小满【系统说明】内部 [红包] 不该显示',
        patDesc: '肩膀[位置] 不该显示'
      },
      {
        speakerId: 'alice',
        type: 'redpacket',
        amount: '6',
        content: '奶茶红包 [位置] 春信咖啡'
      },
      {
        speakerId: 'bob',
        type: 'call',
        status: 'missed',
        text: '刚才没接到 [通话] 已结束'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 533456,
    idPrefix: 'group-ability-clean',
    maxMessages: 5
  });

  assert.equal(parsed.length, 0, '群聊系统能力字段混入其他系统格式时应拦截该成员本轮输出，避免截断后假装能力已落地');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'voice',
        content: '我能发语音',
        voiceId: 'voice-001'
      },
      {
        speakerId: 'bob',
        type: 'voice',
        content: '我没开语音，不应落地',
        voiceId: 'voice-002'
      },
      {
        speakerId: 'bob',
        type: 'call',
        status: 'missed',
        content: '未接通'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    memberVoiceEnabled: { alice: true, bob: false },
    memberVoiceIds: { alice: 'voice-001' },
    now: 723456,
    idPrefix: 'group-voice-guard'
  });

  assert.equal(parsed.length, 1, '群聊成员输出不可落地语音时，应整体拦截该成员本轮输出，避免后续正文或通话假装能力已生效');
  assert.equal(parsed[0].senderId, 'alice');
  assert.equal(parsed[0].type, 'voice');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'voice',
        content: '缺少 voiceId 不应落地'
      },
      {
        speakerId: 'bob',
        type: 'voice',
        content: 'voiceId 不匹配不应落地',
        voiceId: 'wrong-voice'
      },
      {
        speakerId: 'carol',
        type: 'voice',
        content: '这是正确语音',
        voiceId: 'voice-carol'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob', 'carol'],
    memberVoiceEnabled: { alice: true, bob: true, carol: true },
    memberVoiceIds: { alice: 'voice-alice', bob: 'voice-bob', carol: 'voice-carol' },
    now: 723556,
    idPrefix: 'group-voice-id-guard'
  });

  assert.deepEqual(parsed, [
    {
      id: '723556-group-voice-id-guard-2',
      senderId: 'carol',
      content: '这是正确语音',
      timestamp: 723558,
      type: 'voice',
      voiceId: 'voice-carol',
      voiceSpeed: undefined,
      voiceLanguage: undefined
    }
  ], '群聊语音必须携带并匹配成员真实 voiceId，不能靠开关或任意 voiceId 落地');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'text',
        content: '先把剧情接住'
      },
      {
        speakerId: 'alice',
        type: 'redpacket',
        amount: '8.88',
        content: '剧情模式不应发红包'
      },
      {
        speakerId: 'bob',
        type: 'pat',
        targetName: '小满'
      },
      {
        speakerId: 'bob',
        type: 'location',
        locationName: '旧码头'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    allowSystemAbilities: false,
    now: 823456,
    idPrefix: 'group-story-guard'
  });

  assert.deepEqual(parsed, [], '剧情群聊不应落地红包、位置、拍一拍等普通聊天系统能力；同成员出现禁用支付意图时普通文本也应拦截');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'alice',
        type: 'location',
        locationName: '',
        locationAddress: ''
      },
      {
        speakerId: 'alice',
        type: 'text',
        content: '我把位置发你了，你看一下。'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '我先正常接一句。'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    now: 833456,
    idPrefix: 'group-invalid-ability-speaker'
  });

  assert.deepEqual(parsed, [
    {
      id: '833456-group-invalid-ability-speaker-2',
      senderId: 'bob',
      content: '我先正常接一句。',
      timestamp: 833458,
      type: 'text'
    }
  ], '群聊同一成员出现不可落地系统能力时，该成员后续普通文本也不应继续落地，避免假系统能力正文误导用户');
}

{
  const reply = JSON.stringify({
    messages: [
      {
        speakerId: 'stranger',
        type: 'text',
        content: '非群成员不应占用回复条数'
      },
      {
        speakerId: 'alice',
        type: 'redpacket',
        amount: '9',
        content: '余额不足不应占用回复条数'
      },
      {
        speakerId: 'bob',
        type: 'location',
        name: '剧情模式禁用的位置不应占用回复条数'
      },
      {
        speakerId: 'alice',
        type: 'text',
        content: '真正第一句'
      },
      {
        speakerId: 'bob',
        type: 'text',
        content: '真正第二句'
      },
      {
        speakerId: 'alice',
        type: 'text',
        content: '超过有效条数上限'
      }
    ]
  });

  const parsed = parseGroupReplyMessages(reply, {
    memberIds: ['alice', 'bob'],
    memberBalances: { alice: 5, bob: 5 },
    allowSystemAbilities: false,
    maxMessages: 2,
    now: 923456,
    idPrefix: 'group-valid-limit'
  });

  assert.deepEqual(parsed, [], '群聊回复条数上限应按可落地消息计算；禁用或无效系统能力会拦截同成员后续文本，避免静默丢能力后继续假装成功');
}

console.log('测试通过：群聊首发与重发已统一走共享解析器。');
