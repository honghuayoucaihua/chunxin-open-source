import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAIReply } from '../src/utils/chat/aiReplyParser.ts';

{
  const parsed = parseAIReply('我没有按 JSON 输出，但不该被直接展示', true, true, { allowSocial: true, requireStructured: true });
  assert.equal(parsed.text, '', '要求结构化时，非 JSON 回复不应回退成可见正文');
  assert.deepEqual(parsed.sentences, [], '要求结构化时，非 JSON 回复不应生成兜底分句');
  assert.deepEqual(parsed.specials, [], '要求结构化时，非 JSON 回复不应生成兜底特殊消息');
}

{
  const parsed = parseAIReply('我没有按 JSON 输出，也不应靠默认兜底展示', true, true, { allowSocial: true });
  assert.equal(parsed.text, '', '共享解析器默认不应把非 JSON 原文兜底展示');
  assert.deepEqual(parsed.sentences, [], '共享解析器默认不应为非 JSON 原文生成分句');
}

{
  const parsed = parseAIReply('说明文字 {"text":"不应从杂文本里捞出来"}', true, true, { allowSocial: true, requireStructured: true });
  assert.equal(parsed.text, '', '要求结构化时，不应从解释文本中截取 JSON 当作有效回复');
  assert.deepEqual(parsed.sentences, [], '要求结构化时，夹杂说明文字的 JSON 不应生成分句');
}

{
  const raw = JSON.stringify({
    text: '先说一句',
    innerVoice: '心里其实有点紧张',
    actionDesc: '把手背到身后',
    tags: [
      { type: 'sentence', value: '先说一句' },
      { type: 'inner', value: '心里其实有点紧张' },
      { type: 'action', value: '把手背到身后' }
    ]
  });

  const parsed = parseAIReply(raw, false, false, { allowSocial: true });
  assert.equal(parsed.innerVoice, undefined, '关闭心声解析时，不应继续保留 innerVoice');
  assert.equal(parsed.actionDesc, undefined, '关闭动作解析时，不应继续保留 actionDesc');
  assert.deepEqual(
    parsed.orderedSegments,
    [{ type: 'text', value: '先说一句' }],
    '关闭心声/动作解析时，有序片段不应继续混入 inner/action'
  );
}

{
  const raw = JSON.stringify({
    text: '只保留正文',
    storyInner: '不该绕过心声开关',
    storyState: '不该绕过动作开关',
    tags: [
      { type: 'storyInner', value: '不该进入有序心声' },
      { type: 'storyState', value: '不该进入有序动作' }
    ]
  });

  const parsed = parseAIReply(raw, false, false, { allowSocial: true });
  assert.equal(parsed.innerVoice, undefined, '关闭心声解析时，storyInner 也不应绕过开关');
  assert.equal(parsed.actionDesc, undefined, '关闭动作解析时，storyState 也不应绕过开关');
  assert.deepEqual(
    parsed.orderedSegments,
    [{ type: 'text', value: '只保留正文' }],
    '关闭心声/动作解析时，剧情字段不应继续混入有序片段'
  );
}

{
  const raw = JSON.stringify({
    text: '线上心声正文',
    tags: [
      { type: 'storyInner', value: '非剧情不应接收剧情心声' },
      { type: 'storyState', value: '非剧情不应接收剧情动作' },
      { type: 'inner', value: '当前心声标签' },
      { type: 'action', value: '当前动作标签' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.innerVoice, '当前心声标签', '非剧情模式不应让 storyInner 绕过提示词禁用规则');
  assert.equal(parsed.actionDesc, '当前动作标签', '非剧情模式不应让 storyState 绕过提示词禁用规则');
  assert.deepEqual(
    parsed.orderedSegments,
    [
      { type: 'text', value: '线上心声正文' },
      { type: 'inner', value: '当前心声标签' },
      { type: 'action', value: '当前动作标签' }
    ],
    '非剧情模式有序片段也不应接收剧情专用标签'
  );

  const storyParsed = parseAIReply(raw, true, true, { allowSocial: true, allowStoryTags: true });
  assert.equal(storyParsed.innerVoice, '非剧情不应接收剧情心声', '剧情模式显式开启时才接收 storyInner');
  assert.equal(storyParsed.actionDesc, '非剧情不应接收剧情动作；当前动作标签', '剧情模式显式开启时才接收 storyState');
}

{
  const raw = JSON.stringify({
    text: '今天想发个朋友圈',
    tags: [
      {
        type: 'moments',
        text: '今天风很舒服',
        likes: ['阿青'],
        comments: [{ user: '小白', text: '好看！' }]
      },
      {
        type: 'officialAccount',
        title: '晚间推送',
        content: '今天更新了一篇文章'
      }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: false });
  assert.deepEqual(parsed.specials, [], '关闭社交能力时，不应继续解析朋友圈或订阅号 special');
}

{
  const raw = JSON.stringify({
    text: '我用系统能力发给你',
    tags: [
      { type: 'location', locationName: '春信咖啡', locationAddress: '春风路 18 号' },
      { type: 'pat', targetName: '你' },
      { type: 'voice', content: '我马上到', voiceId: 'voice-001', speed: 1.1, language: 'Chinese' },
      { type: 'call', status: 'ended', durationSec: 125, content: '刚刚通话结束' },
      {
        type: 'moments',
        content: '今天风很舒服',
        location: '江边',
        likes: ['阿青'],
        comments: [
          { user: '小白', text: '好看！', replyTo: '小满' },
          { user: '旧格式 回复 小满', text: '回复 小满：不应从文本猜结构' }
        ]
      },
      {
        type: 'officialAccount',
        title: '晚间推送',
        desc: '今天更新了一篇文章',
        thumb: 'https://example.com/thumb.png'
      }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  const location = parsed.specials.find((item) => item.type === 'location');
  const pat = parsed.specials.find((item) => item.type === 'system' && item.patTarget);
  const voice = parsed.specials.find((item) => item.type === 'voice');
  const call = parsed.specials.find((item) => item.type === 'call');
  const moments = parsed.specials.find((item) => item.type === 'moments');
  const officialAccount = parsed.specials.find((item) => item.type === 'officialAccount');

  assert.equal(location?.locationName, '春信咖啡', '位置协议应解析位置名称');
  assert.equal(location?.locationAddress, '春风路 18 号', '位置协议应解析详细地址');
  assert.equal(pat?.patTarget, '你', '拍一拍协议应解析目标');
  assert.equal(voice?.content, '我马上到', '语音协议应解析语音文本');
  assert.equal(voice?.voiceId, 'voice-001', '语音协议应解析 voiceId');
  assert.equal(voice?.voiceSpeed, 1.1, '语音协议应解析语速');
  assert.equal(call?.callStatus, 'ended', '通话协议应解析状态');
  assert.equal(call?.callDurationSec, 125, '通话协议应解析时长');
  assert.equal(moments?.content, '今天风很舒服', '朋友圈协议应解析正文');
  assert.deepEqual(moments?.likes, ['阿青'], '朋友圈协议应解析点赞');
  assert.equal(moments?.comments?.[0]?.replyTo, '小满', '朋友圈协议应解析明确 replyTo 字段');
  assert.equal(moments?.comments?.[1]?.replyTo, undefined, '朋友圈协议不应从自然文本猜 replyTo');
  assert.equal(officialAccount?.title, '晚间推送', '订阅号协议应解析标题');
  assert.equal(officialAccount?.desc, '今天更新了一篇文章', '订阅号协议应解析摘要');
}

{
  const raw = JSON.stringify({
    text: '我用当前字段名发系统能力',
    tags: [
      { type: 'redpacket', amount: '8.88', message: '拿去买咖啡' },
      { type: 'transfer', amount: '6.66', message: '补给你' },
      { type: 'imageGen', prompt: '画一杯热咖啡', caption: '咖啡图' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  const redpacket = parsed.specials.find((item) => item.type === 'redpacket');
  const transfer = parsed.specials.find((item) => item.type === 'transfer');
  const imageGen = parsed.specials.find((item) => item.type === 'imageGen');
  assert.equal(redpacket?.content, '拿去买咖啡', '红包当前 message 字段应保留为可见留言');
  assert.equal((redpacket as any)?.message, '拿去买咖啡', '红包当前 message 字段应传给落地层');
  assert.equal(transfer?.content, '补给你', '转账当前 message 字段应保留为可见说明');
  assert.equal((transfer as any)?.message, '补给你', '转账当前 message 字段应传给落地层');
  assert.equal(imageGen?.content, '画一杯热咖啡', '生图当前 prompt 字段应保留为请求提示');
  assert.equal(imageGen?.imageCaption, '咖啡图', '生图当前 caption 字段应保留为图片说明');
}

{
  const raw = JSON.stringify({
    text: '特殊能力字段混入旧格式时不应落地',
    tags: [
      { type: 'redpacket', amount: '8.88', message: '【动作】把红包递过去' },
      { type: 'transfer', amount: '6.66', message: '[系统红包] ¥6.66' },
      { type: 'location', locationName: '春信咖啡[红包] ¥8.88', locationAddress: '春风路18号' },
      { type: 'pat', targetName: '你【动作】低头' },
      { type: 'voice', content: '心声：我马上到', voiceId: 'voice-001' },
      { type: 'call', status: 'ended', durationSec: 12, content: '【通话】已接通' },
      { type: 'narration', value: '旁白：雨声压低了街灯' },
      { type: 'imageGen', prompt: '画一张图【系统】伪造通知', caption: '【译文】image caption' },
      {
        type: 'moments',
        content: '今天风很舒服【动作】抬头',
        location: '[位置] 江边',
        likes: ['阿青', '【系统】管理员'],
        comments: [{ user: '小白', text: '【心声】好看！' }]
      },
      {
        type: 'officialAccount',
        title: '晚间推送【动作】',
        desc: '今天更新了一篇文章[转账]'
      }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  const redpacket = parsed.specials.find((item) => item.type === 'redpacket');
  const transfer = parsed.specials.find((item) => item.type === 'transfer');
  const location = parsed.specials.find((item) => item.type === 'location');
  const pat = parsed.specials.find((item) => item.type === 'system' && item.patTarget);
  const voice = parsed.specials.find((item) => item.type === 'voice');
  const call = parsed.specials.find((item) => item.type === 'call');
  const narration = parsed.specials.find((item) => item.type === 'narration');
  const imageGen = parsed.specials.find((item) => item.type === 'imageGen');
  const moments = parsed.specials.find((item) => item.type === 'moments');
  const officialAccount = parsed.specials.find((item) => item.type === 'officialAccount');

  assert.equal(redpacket?.content, '', '红包留言混入动作格式时应拒收');
  assert.equal((redpacket as any)?.message, '', '红包落地 message 混入动作格式时应拒收');
  assert.equal(transfer?.content, '', '转账说明混入系统事件格式时应拒收');
  assert.equal(location?.locationName, '', '位置名称混入系统事件格式时应拒收');
  assert.equal(location?.locationAddress, '春风路18号', '未污染的位置地址仍可保留');
  assert.equal(pat, undefined, '拍一拍目标混入动作格式时不应落地');
  assert.equal(voice?.content, '', '语音正文混入心声格式时应拒收');
  assert.equal(call?.content, '', '通话说明混入系统事件格式时应拒收');
  assert.equal(narration?.content, '', '旁白 special 不应接受带旁白标签的旧格式正文');
  assert.equal(imageGen, undefined, '生图 prompt 混入系统事件格式时不应发起生图能力');
  assert.equal(moments?.content, '', '朋友圈正文混入动作格式时应拒收');
  assert.deepEqual(moments?.likes, ['阿青'], '朋友圈点赞名混入系统格式时应丢弃该项');
  assert.deepEqual(moments?.comments, [], '朋友圈评论正文混入心声格式时应丢弃该评论');
  assert.equal(officialAccount?.title, '', '订阅号标题混入动作格式时应拒收');
  assert.equal(officialAccount?.desc, '', '订阅号正文混入系统事件格式时应拒收');
}

{
  const raw = JSON.stringify({
    text: '旧社交协议不应被补成有效系统能力',
    tags: [
      { type: 'moments', text: '旧字段朋友圈正文', publisher: '旧作者', author_id: 'old-id', comments: [{ name: '旧评论人', content: '旧评论正文' }] },
      { type: 'officialAccount', title: '旧字段标题', content: '旧 content 正文', summary: '旧 summary 摘要' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  const moments = parsed.specials.find((item) => item.type === 'moments');
  const officialAccount = parsed.specials.find((item) => item.type === 'officialAccount');
  assert.equal(moments?.content, '', '朋友圈协议不应用 text 旧字段兜底 content');
  assert.equal(moments?.author, undefined, '朋友圈协议不应用 publisher/by/from 旧字段兜底 author');
  assert.equal(moments?.authorId, undefined, '朋友圈协议不应用 author_id/publisherId 旧字段兜底 authorId');
  assert.deepEqual(moments?.comments, [], '朋友圈评论协议不应用 name/content 旧字段兜底 user/text');
  assert.equal(officialAccount?.desc, '', '订阅号协议不应用 content/summary 旧字段兜底 desc');
}

{
  const parsed = parseAIReply(JSON.stringify({ text: 'https://example.com/photo.png' }), true, true, { allowSocial: true });
  assert.equal(parsed.text, 'https://example.com/photo.png', '正文里的单独图片地址仍应只是普通正文');
  assert.deepEqual(parsed.specials, [], '解析器不应从正文图片地址猜测 image 系统能力');
}

{
  const parsed = parseAIReply(JSON.stringify({
    text: '我按当前协议发一张图',
    tags: [
      { type: 'image', url: 'https://example.com/current.png', caption: '普通 image 不应解析说明' },
      { type: 'image', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' }
    ]
  }), true, true, { allowSocial: true });
  const images = parsed.specials.filter((item) => item.type === 'image');
  assert.equal(images[0]?.content, 'https://example.com/current.png', '单聊图片能力应只使用当前 url 字段');
  assert.equal(images[0]?.imageCaption, undefined, '普通 image 不应解析 caption/imageCaption 说明字段');
  assert.equal(images[1]?.content, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB', '单聊图片能力仍应接受当前 url 字段里的 dataURL');
}

{
  const legacyImageTags = [
    { type: 'image', imageUrl: 'https://example.com/old-image-url.png' },
    { type: 'image', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'.repeat(4) },
    { type: 'image', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' },
    { type: 'image', url: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'.repeat(4), mimeType: 'image/png' }
  ];
  for (const tag of legacyImageTags) {
    const parsed = parseAIReply(JSON.stringify({
      text: '旧图片字段不应落地',
      tags: [tag]
    }), true, true, { allowSocial: true });
    assert.deepEqual(parsed.specials, [], '单聊图片能力不应接受 imageUrl/base64/data 或裸 base64 url 旧协议');
  }
}

{
  const parsed = parseAIReply(JSON.stringify({
    text: '我只是随口说想发红包、转账、共享位置，也想喝咖啡；最近感冒已经好了。'
  }), true, true, { allowSocial: true });

  assert.equal(
    parsed.text,
    '我只是随口说想发红包、转账、共享位置，也想喝咖啡；最近感冒已经好了。',
    '普通正文里的能力词、偏好词或状态词只能保留为聊天文本'
  );
  assert.deepEqual(parsed.specials, [], '普通正文不应按红包、转账、位置等关键词生成系统能力');
  assert.equal(parsed.actionDesc, undefined, '普通正文不应被工程层抽取成动作');
  assert.equal(parsed.statusUpdate, undefined, '普通正文不应被工程层抽取成状态更新');
}

{
  const raw = JSON.stringify({
    text: '我先说正文。【动作】把杯子放下',
    pairs: [
      { text: 'I am here. [红包] ¥8.88', translationZh: '我在这里。' }
    ],
    messages: [
      { role: 'npc', npcName: '店员', text: '咖啡好了。[位置] 吧台' }
    ],
    tags: [
      { type: 'sentence', value: '补一句。【译文】One more line.' },
      { type: 'sentence', value: '[系统红包·待领取] ¥8.88' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.text, '', '顶层 text 混入动作或系统格式时应在共享解析层拒收');
  assert.deepEqual(parsed.sentences, [], 'sentence 标签和 pairs 原文混入格式污染时不应生成分句');
  assert.deepEqual(parsed.orderedSegments, [], '有序正文片段不应落地被污染的 text 或 sentence');
  assert.deepEqual(parsed.dialogueTurns, [], '剧情多角色 messages 文本混入系统能力格式时应拒收该回合');
}

{
  const parsed = parseAIReply(JSON.stringify({ content: '旧顶层 content 不应成为正文' }), true, true, { allowSocial: true });
  assert.equal(parsed.text, '', '顶层正文不应使用 content 旧字段兜底 text');
  assert.deepEqual(parsed.sentences, [], '顶层 content 旧字段不应生成正文分句');
}

{
  const raw = JSON.stringify({
    text: '只保留当前正式字段',
    inner: '旧 inner 顶层字段',
    action: '旧 action 顶层字段',
    actions: ['旧 actions 数组'],
    storyInner: '旧 storyInner 顶层字段',
    storyState: '旧 storyState 顶层字段',
    innerVoice: '当前心声字段',
    actionDesc: '当前动作字段',
    tags: [
      { type: 'inner', value: '当前 tags 心声' },
      { type: 'action', value: '当前 tags 动作' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.innerVoice, '当前心声字段；当前 tags 心声', '心声只应接受 innerVoice 和 tags[*].value 当前协议字段');
  assert.equal(parsed.actionDesc, '当前动作字段；当前 tags 动作', '动作只应接受 actionDesc 和 tags[*].value 当前协议字段');
  assert.deepEqual(
    parsed.orderedSegments,
    [
      { type: 'text', value: '只保留当前正式字段' },
      { type: 'inner', value: '当前 tags 心声' },
      { type: 'action', value: '当前 tags 动作' }
    ],
    '有序片段不应从顶层旧别名恢复心声或动作'
  );
}

{
  const raw = JSON.stringify({
    text: '正文',
    tags: [
      { type: 'sentence', value: { text: '对象正文不应被强转' } },
      { type: 'inner', value: { text: '对象心声不应被强转' } },
      { type: 'action', value: ['对象动作不应被强转'] },
      { type: 'sentence', value: 404 }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.innerVoice, undefined, '对象型 tag 心声不应强转成 [object Object]');
  assert.equal(parsed.actionDesc, undefined, '数组型 tag 动作不应强转成可落地动作');
  assert.deepEqual(
    parsed.sentences,
    ['正文', '404'],
    'tag 分句只接受可展示标量，不应把对象旧格式转成正文'
  );
  assert.deepEqual(
    parsed.orderedSegments,
    [
      { type: 'text', value: '正文' },
      { type: 'text', value: '404' }
    ],
    '有序片段不应落地对象或数组型旧 tag 值'
  );
}

{
  const raw = JSON.stringify({
    text: '旧系统能力字段不应被补成有效能力',
    tags: [
      { type: 'imageGen', content: '旧 content 生图提示' },
      { type: 'image_generate', prompt: '旧 type 生图提示' },
      { type: 'image', content: 'https://example.com/old.png', text: '旧图片说明' },
      { type: 'image', imageUrl: 'https://example.com/old-image-url.png' },
      { type: 'image', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'.repeat(4) },
      { type: 'image', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' },
      { type: 'redpacket', money: '8.88', content: '旧红包留言' },
      { type: 'transfer', money: '6.66', content: '旧转账说明' },
      { type: 'location', name: '旧位置名称', address: '旧位置地址' },
      { type: 'pat', name: '小满' },
      { type: 'pat', target: '旧拍一拍目标' },
      { type: 'system', truthDareCommand: 'nextRound' },
      { type: 'system', action: 'next_round' },
      { type: 'system', text: '旧系统通知' },
      { type: 'voice', text: '旧语音内容', voice_id: 'old-voice', lang: 'Chinese' },
      { type: 'call', callStatus: 'ended', duration: 125, text: '旧通话说明' },
      { type: 'narration', text: '旧旁白文本' },
      { type: 'templateData', id: 'tpl-old', vars: { title: '旧模板' } }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.specials.some((item) => item.type === 'imageGen'), false, 'imageGen 不应使用 content/text/value 兜底 prompt');
  assert.equal(parsed.specials.some((item) => item.type === 'image'), false, 'image 不应使用 content/value 兜底图片地址');
  assert.equal(parsed.specials.some((item) => item.type === 'system' && item.patTarget), false, 'pat 不应使用 name 或默认“你”兜底 target');
  assert.equal(parsed.specials.some((item) => item.type === 'system' && item.truthDareCommand), false, 'system 不应使用 truthDareCommand/action 旧字段兜底 command');
  assert.equal(parsed.specials.some((item) => item.type === 'system' && item.content), false, 'system 不应解析任意 text/content 系统通知');
  assert.equal(parsed.specials.some((item) => item.type === 'templateData'), false, 'templateData 不应使用 id/template_id 旧字段兜底 templateId');

  const redpacket = parsed.specials.find((item) => item.type === 'redpacket');
  const transfer = parsed.specials.find((item) => item.type === 'transfer');
  const location = parsed.specials.find((item) => item.type === 'location');
  const voice = parsed.specials.find((item) => item.type === 'voice');
  const call = parsed.specials.find((item) => item.type === 'call');
  const narration = parsed.specials.find((item) => item.type === 'narration');
  assert.equal(redpacket?.content, '', '红包不应使用 content/text 旧字段兜底 message');
  assert.equal(redpacket?.amount, '', '红包不应使用 money 旧字段兜底 amount');
  assert.equal(transfer?.content, '', '转账不应使用 content 旧字段兜底 message');
  assert.equal(transfer?.amount, '', '转账不应使用 money 旧字段兜底 amount');
  assert.equal(location?.locationName, '', '位置不应使用 name 旧字段兜底 locationName');
  assert.equal(location?.locationAddress, '', '位置不应使用 address 旧字段兜底 locationAddress');
  assert.equal(voice?.content, '', '语音不应使用 text 旧字段兜底 content');
  assert.equal(voice?.voiceId, '', '语音不应使用 voice_id 旧字段兜底 voiceId');
  assert.equal(voice?.voiceLanguage, undefined, '语音不应使用 lang 旧字段兜底 language');
  assert.equal(call?.content, '', '通话不应使用 text 旧字段兜底 content');
  assert.equal(call?.callStatus, undefined, '通话不应使用 callStatus 旧字段兜底 status');
  assert.equal(call?.callDurationSec, undefined, '通话不应使用 duration 旧字段兜底 durationSec');
  assert.equal(narration?.content, '', '旁白不应使用 text/content 旧字段兜底 value');
}

{
  const raw = JSON.stringify({
    text: '旧引用字段不应被补成有效引用',
    tags: [
      { type: 'quote', name: '旧引用对象', content: '旧引用正文' },
      { type: 'quote', target: '你【动作】低头', text: '这句引用[红包] ¥8.88' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.deepEqual(parsed.quote, { target: undefined, text: undefined }, 'quote 不应使用 name/content 旧字段兜底，也不应接受格式污染的 target/text');
}

{
  const raw = JSON.stringify({
    text: '我用当前字段名发系统能力',
    tags: [
      { type: 'location', locationName: '春信咖啡', locationAddress: '春风路18号' },
      { type: 'pat', targetName: '小满' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  const location = parsed.specials.find((item) => item.type === 'location');
  const pat = parsed.specials.find((item) => item.type === 'system' && item.patTarget);
  assert.equal(location?.locationName, '春信咖啡', '单聊位置解析应使用当前 locationName 字段');
  assert.equal(location?.locationAddress, '春风路18号', '单聊位置解析应使用当前 locationAddress 字段');
  assert.equal(pat?.patTarget, '小满', '单聊拍一拍解析应使用当前 targetName 字段');
}

{
  const raw = JSON.stringify({
    text: '那我们下一轮吧。',
    specials: [
      { type: 'system', command: 'next_round' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  const command = parsed.specials.find((item) => item.type === 'system' && item.truthDareCommand);
  assert.equal(command?.truthDareCommand, 'nextRound', '真心话大冒险 next_round 指令应解析为内部 nextRound 命令');
}

{
  const raw = JSON.stringify({
    text: '我来继续说。',
    status: '顶层状态不应落地',
    patDesc: '顶层拍一拍后缀不应落地',
    tags: [
      { type: 'status', value: '最近在图书馆复习' },
      { type: 'patDesc', value: '提醒你早点休息' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.statusUpdate, '最近在图书馆复习', '联系人状态更新只应来自 status tag');
  assert.equal(parsed.patDescUpdate, '提醒你早点休息', '拍一拍后缀更新只应来自 patDesc tag');
}

{
  const raw = JSON.stringify({
    text: '我来继续说。',
    tags: [
      { type: 'status', value: '最近在图书馆复习 [红包] ¥8.88' },
      { type: 'patDesc', value: '提醒你早点休息【动作】拍拍肩膀' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.statusUpdate, undefined, '联系人状态更新混入系统事件格式时不应落地');
  assert.equal(parsed.patDescUpdate, undefined, '拍一拍后缀混入动作格式时不应落地');
}

{
  const raw = JSON.stringify({
    text: '我来继续说。',
    status: '顶层状态不应落地',
    patDesc: '顶层拍一拍后缀不应落地'
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.statusUpdate, undefined, '顶层 status 旧字段不应再改联系人状态');
  assert.equal(parsed.patDescUpdate, undefined, '顶层 patDesc 旧字段不应再改拍一拍后缀');
}

{
  const raw = JSON.stringify({
    text: '我来继续说。',
    tags: [
      { type: 'npc', name: '旧标签店员' }
    ],
    specials: [
      { type: 'npc', name: '旧特殊店员' }
    ],
    messages: [
      { role: 'self', text: '我来继续说。' },
      { role: 'npc', npcName: '店员', text: '咖啡好了。' },
      { role: 'npc', npcName: '店员【动作】低头', text: '另一杯也好了。' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(
    parsed.specials.some((item) => String(item.type) === 'npc'),
    false,
    '旧 npc tag/special 不应再作为特殊消息解析'
  );
  assert.equal(parsed.dialogueTurns[0]?.isNpc, undefined, '主角色 messages 回合不应被顶层 npc 标签污染');
  assert.equal(parsed.dialogueTurns[1]?.isNpc, true, 'NPC 身份只应来自 messages[*].role 结构');
  assert.equal(parsed.dialogueTurns[1]?.npcName, '店员', 'NPC 名称应来自 messages[*].npcName');
  assert.equal(parsed.dialogueTurns[2]?.npcName, undefined, 'NPC 名称混入动作格式时应拒收该名称');
}

{
  const raw = JSON.stringify({
    messages: [
      { role: 'npc', name: '旧 NPC 名称', content: '旧 content 台词' },
      { speaker: 'npc', npcName: '旧 speaker NPC', value: '旧 value 台词' }
    ],
    dialogues: [
      { role: 'npc', npcName: '旧 dialogues NPC', text: '旧 dialogues 台词' }
    ],
    turns: [
      { role: 'npc', npcName: '旧 turns NPC', text: '旧 turns 台词' }
    ],
    pairs: [
      { original: 'Old original text', translation: '旧译文' }
    ],
    tags: [
      { type: 'sentence', text: '旧 sentence text' },
      { type: 'inner', content: '旧 inner content' },
      { type: 'action', text: '旧 action text' }
    ],
    translation: '旧顶层译文',
    textZh: '旧 textZh 译文'
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.deepEqual(parsed.dialogueTurns, [], '多角色回复不应使用 content/value/name/speaker/dialogues/turns 旧字段兜底');
  assert.deepEqual(parsed.orderedSegments, [], '有序片段不应使用 text/content 旧字段兜底 value');
  assert.deepEqual(parsed.sentences, [], '双语 pairs 不应使用 original 旧字段兜底 text');
  assert.equal(parsed.translatedContentZhCN, undefined, '译文不应使用 translation/textZh 旧字段兜底 translationZh');
}

{
  const raw = JSON.stringify({
    text: 'This top-level text should not override pairs.',
    pairs: [
      { text: 'Je suis la.【动作】站在门口', translationZh: '译文：我在这里。' },
      { text: 'Ne t inquiete pas.', translationZh: '【翻译】别担心。【心声】怕你误会' }
    ],
    translationZh: '错误译文'
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.text, 'Ne t inquiete pas.', '双语 pairs 混入动作格式时应拒收该原文片段，不再截断成半句');
  assert.deepEqual(parsed.sentences, ['Ne t inquiete pas.'], '双语 pairs 应只保留未被格式污染的逐句原文');
  assert.equal(parsed.translatedContentZhCN, undefined, '逐句译文混入心声格式时应拒收，不再截断成半句');
  assert.deepEqual(parsed.translatedSentencesZhCN, [''], '被拒收的逐句译文应保持空位，避免错挂到其他原文');
}

{
  const raw = JSON.stringify({
    text: 'Je suis la.',
    sentences: ['Je suis la.', 'Ne t inquiete pas.'],
    translationZh: '我在这里。别担心。'
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.translatedContentZhCN, '我在这里。别担心。', '整段译文仍可作为整段译文保留');
  assert.deepEqual(parsed.translatedSentencesZhCN, [], '解析器不应把整段译文按标点或数量猜拆成逐句译文');
  assert.deepEqual(parsed.sentences, ['Je suis la.'], '顶层 sentences 旧字段不应再作为分句协议落地');
}

{
  const raw = JSON.stringify({
    text: '先说正文',
    innerVoice: '心声：其实有点犹豫。',
    actionDesc: '【动作】把杯子放回桌上',
    translationZh: '译文：先说正文。',
    translationZhSentences: ['【译文】先说正文。'],
    tags: [
      { type: 'inner', value: '【心声】又补了一句心里话' },
      { type: 'action', value: '动作：抬头看你' },
      { type: 'sentenceZh', value: '【译文】旧逐句译文不应落地' },
      { type: 'translationSentence', value: '【译文】旧译文标签不应落地' }
    ]
  });

  const parsed = parseAIReply(raw, true, true, { allowSocial: true });
  assert.equal(parsed.innerVoice, '其实有点犹豫。；又补了一句心里话', '心声字段应剥离心声标签后再落地');
  assert.equal(parsed.actionDesc, '把杯子放回桌上；抬头看你', '动作字段应剥离动作标签后再落地');
  assert.equal(parsed.translatedContentZhCN, '先说正文。', '译文字段应剥离译文标签后保留译文内容');
  assert.deepEqual(parsed.translatedSentencesZhCN, [], '旧逐句译文字段和标签别名不应再落地，逐句译文只接受 pairs');
}

{
  const source = readFileSync(new URL('../src/utils/prompt/personaPromptOutput.ts', import.meta.url), 'utf8');
  const parserSource = readFileSync(new URL('../src/utils/chat/aiReplyParser.ts', import.meta.url), 'utf8');
  assert.match(source, /禁用格式/, '回复格式提示应显式包含禁用格式规则');
  assert.match(source, /即使历史里出现过，也不要模仿或补回/, '禁用格式规则应阻止模型从历史里继续学习旧格式');
  assert.match(source, /storyInner/, '非剧情模式应显式禁止剧情心声字段绕过格式开关');
  assert.match(source, /storyState/, '非剧情模式应显式禁止剧情动作字段绕过格式开关');
  assert.match(source, /正文只使用 pairs 字段/, '双语模式应要求只用 pairs 作为正文结构');
  assert.doesNotMatch(source, /\{\s*"type":\s*"npc"/, '剧情 NPC 不应再通过 tags 旧兜底暴露给模型');
  assert.match(source, /"role": "npc"/, '剧情 NPC 仍应通过 messages[*].role 明确表达');
  assert.match(source, /"npcName": "NPC名称"/, '剧情 NPC 名称应使用 npcName 字段');
  assert.doesNotMatch(parserSource, /extractedActionFromText/, '解析器不应保留从普通正文抽取动作的旧入口');
}

console.log('测试通过：AI 回复解析器会尊重心声/动作/社交能力开关，不再把禁用能力偷偷放出来。');
