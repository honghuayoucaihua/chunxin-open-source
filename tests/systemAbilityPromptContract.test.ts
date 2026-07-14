import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSpecialMessages } from '../src/app/sendMessage/specialMessages.ts';
import { buildSystemAbilityBoundaryLine } from '../src/utils/prompt/systemAbilityBoundaryPrompt.ts';

const personaPromptOutputSource = readFileSync(new URL('../src/utils/prompt/personaPromptOutput.ts', import.meta.url), 'utf8');
const aiReplyParserSource = readFileSync(new URL('../src/utils/chat/aiReplyParser.ts', import.meta.url), 'utf8');
const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');

assert.match(personaPromptOutputSource, /'拍一拍'/, '能力范围应声明拍一拍能力');
assert.match(personaPromptOutputSource, /'通话'/, '能力范围应声明通话能力');
assert.match(personaPromptOutputSource, /buildSystemAbilityBoundaryLine/, '单聊能力规则应复用共享系统能力边界');
assert.match(
  buildSystemAbilityBoundaryLine({ abilities: ['位置', '拍一拍', '通话', '语音', '朋友圈', '订阅号'] }),
  /普通正文只代表普通聊天文本；位置、拍一拍、通话、语音、朋友圈、订阅号等系统能力必须通过对应结构化类型落地/,
  '能力规则应说明这些能力必须走系统类型'
);

[
  /"type": "location", "locationName": "位置名称", "locationAddress": "详细地址"/,
  /"type": "pat", "targetName": "你\/我\/联系人名"/,
  /"type": "call", "status": "missed\|ongoing\|ended", "durationSec": 125, "content": "通话说明\(可选\)"/,
  /"type": "voice", "content": "语音内容", "voiceId":/,
  /"type": "moments", "content": "朋友圈正文"/,
  /"type": "officialAccount", "title": "标题", "desc": "正文摘要"/
].forEach((pattern) => {
  assert.match(personaPromptOutputSource, pattern, `JSON 模板应包含 ${pattern} 协议`);
});

[
  /case 'location':/,
  /case 'pat':/,
  /case 'call':/,
  /case 'voice':/,
  /case 'moments':/,
  /case 'officialAccount':/
].forEach((pattern) => {
  assert.match(aiReplyParserSource, pattern, `解析器应支持 ${pattern} 特殊能力`);
});

assert.match(promptBuildersSource, /const systemAbilityTypes = \['image', 'redpacket', 'transfer', 'location', 'pat', 'voice', 'call'\]/, '普通群聊 JSON 模板应包含位置、拍一拍、语音和通话类型');
assert.match(promptBuildersSource, /const messageTypeOptions = mode === 'story'/, '群聊 JSON 模板应按模式动态禁用普通系统能力');
assert.match(promptBuildersSource, /buildSystemAbilityBoundaryLine\(\{ subject: '群聊普通正文'/, '群聊系统能力规则应复用共享系统能力边界');
assert.match(promptBuildersSource, /targetName 可以是用户昵称或群成员昵称/, '群聊拍一拍提示应允许指向用户或群成员');

{
  let moments: any[] = [];
  const messages = await buildSpecialMessages({
    specials: [
      {
        type: 'moments',
        content: '今天路过那家店，突然想拍下来。【动作】举起手机\n[位置] 春信咖啡',
        location: '春风路 译文：Spring road\n[位置] 春信咖啡',
        likes: ['阿青【动作】点赞', '系统说明：内部昵称', '[红包] 阿澈'],
        comments: [
          { user: '林夏【动作】探头', text: '这个角度好看 【心声】我也想去', replyTo: '小满【系统说明】内部' },
          { user: '阿澈', text: '[系统红包·待领取] ¥8.88' }
        ]
      },
      {
        type: 'moments',
        content: '今天路过那家店，突然想拍下来。【动作】举起手机',
        location: '春风路 译文：Spring road',
        likes: ['阿青【动作】点赞', '系统说明：内部昵称', '[红包] 阿澈'],
        comments: [
          { user: '林夏【动作】探头', text: '这个角度好看 【心声】我也想去', replyTo: '小满【系统说明】内部' },
          { user: '阿澈', text: '[系统红包·待领取] ¥8.88' }
        ]
      },
      {
        type: 'location',
        locationName: '春信咖啡【动作】推门进去 [位置] 不该显示',
        locationAddress: '春风路18号 [位置] 春信咖啡'
      },
      {
        type: 'location',
        locationName: '春信咖啡【动作】推门进去',
        locationAddress: '春风路18号'
      },
      {
        type: 'voice',
        content: '我马上到[语音] 这段不该显示',
        voiceId: 'voice-ok'
      },
      {
        type: 'voice',
        content: '我马上到',
        voiceId: 'voice-ok'
      },
      {
        type: 'call',
        callStatus: 'missed',
        content: '刚才没接到 [通话] 已结束'
      },
      {
        type: 'transfer',
        amount: '3.5',
        message: '奶茶钱 [位置] 春信咖啡【心声】别拒绝'
      }
    ] as any
  }, {
    id: 'c1',
    name: '林夏',
    avatar: '',
    chatMode: 'online',
    allowRichActions: true,
    minimaxTTS: { enabled: true, voiceId: 'voice-ok' },
    balance: 20
  } as any, {
    user: { name: '小满', avatar: '' } as any,
    aiSettings: {} as any,
    setMoments: (updater) => {
      moments = updater(moments);
    }
  }, 'c1');

  assert.equal(moments.length, 0, '单聊朋友圈正文混入动作、译文或系统事件格式时应拒收整条朋友圈');
  assert.equal(messages[0]?.locationName, '', '位置名称混入动作格式时应清空，不再截断成半句');
  assert.equal(messages[0]?.locationAddress, '春风路18号');
  assert.equal(messages[1]?.content, '我马上到', '干净语音文本仍应落地');
  assert.equal(messages[2]?.type, 'call', '单聊通话状态真实可落地时应保留通话消息');
  assert.equal(messages[2]?.content, '', '单聊通话说明混入系统能力格式时应清空说明，不应截断成假正文');
  assert.equal(messages[3]?.type, 'transfer', '单聊转账金额合法时应保留真实支付消息');
  assert.equal(messages[3]?.content, '', '单聊转账留言混入其他格式时应清空留言，不应截断成假正文');
  assert.equal(messages.length, 4, '单聊位置、语音等能力字段混入格式标记时应拒收对应无效消息');
}

{
  let articleWrites = 0;
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'officialAccount', title: '', desc: '正文摘要' } as any
    ]
  }, {
    id: 'c1',
    name: '林夏',
    avatar: '',
    chatMode: 'online',
    allowRichActions: true
  } as any, {
    user: { name: '小满', avatar: '' } as any,
    aiSettings: {} as any,
    setOfficialArticles: (updater) => {
      articleWrites += 1;
      updater([]);
    }
  }, 'c1');

  assert.equal(messages.length, 0, 'AI 订阅号缺少标题时不应补默认标题落地');
  assert.equal(articleWrites, 0, 'AI 订阅号缺少标题时不应写入订阅号列表');
}

console.log('测试通过：聊天系统能力提示协议覆盖位置、拍一拍、通话、语音和社交发布。');
