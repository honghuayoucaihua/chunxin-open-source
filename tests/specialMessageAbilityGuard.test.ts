import assert from 'node:assert/strict';
import { buildSpecialMessages, hasLandableSpecialMessageIntent } from '../src/app/sendMessage/specialMessages.ts';

const baseContact = {
  id: 'contact-1',
  name: '测试联系人',
  avatar: '',
  remark: '',
  chatMode: 'online',
  balance: 100
} as any;

const user = {
  id: 'me',
  name: '我',
  avatar: ''
} as any;

{
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    };
    const messages = await buildSpecialMessages({
      specials: [{ type: 'imageGen', content: '画一张图' } as any]
    }, baseContact, {
      user,
      aiSettings: { enableImageGeneration: false } as any
    }, baseContact.id);

    assert.equal(fetchCalls, 0, '生图关闭时不应发起外部生图请求');
    assert.equal(messages.length, 0, '生图关闭时不应落地图片或失败提示');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const warnings: string[] = [];
  try {
    console.info = () => {};
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((item) => String(item)).join(' '));
    };
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response('{"error":"bad request"}', { status: 500 });
    };
    const messages = await buildSpecialMessages({
      specials: [{ type: 'imageGen', content: '画一张图' } as any]
    }, baseContact, {
      user,
      aiSettings: {
        enableImageGeneration: true,
        imageApiKey: 'secret-key',
        imageModel: 'image-model',
        imageBaseUrl: 'https://example.com/v1'
      } as any
    }, baseContact.id);

    assert.equal(fetchCalls, 1, '生图开启且参数完整时应尝试请求外部生图接口');
    assert.equal(messages.length, 0, '生图接口失败时不应落地失败文本或伪系统消息');
    assert.equal(messages.some((message) => String(message.content || '').includes('生图失败')), false, '生图失败原因不应进入聊天正文');
    assert.equal(warnings.some((line) => line.includes('secret-key')), false, '生图失败日志不应暴露 API Key');
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    console.warn = originalWarn;
  }
}

{
  const messages = await buildSpecialMessages({
    specials: [{ type: 'voice', content: '这是一段语音' } as any]
  }, { ...baseContact, minimaxTTS: { enabled: false } }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 0, 'MiniMax 语音关闭时不应落地 voice 消息');
}

{
  const messages = await buildSpecialMessages({
    specials: [{ type: 'voice', content: '这是一段语音', voiceId: 'voice-1' } as any]
  }, { ...baseContact, minimaxTTS: { enabled: true, voiceId: '', speed: 1, language: 'Chinese' } }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 0, 'MiniMax 语音缺少联系人 voiceId 时不应落地 voice 消息');
}

{
  const messages = await buildSpecialMessages({
    specials: [{ type: 'voice', content: '这是一段语音' } as any]
  }, { ...baseContact, minimaxTTS: { enabled: true, voiceId: 'voice-1', speed: 1, language: 'Chinese' } }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 0, 'AI 语音 special 缺少 voiceId 时不应靠联系人配置兜底落地');
}

{
  const messages = await buildSpecialMessages({
    specials: [{ type: 'voice', content: '这是一段语音', voiceId: 'voice-other' } as any]
  }, { ...baseContact, minimaxTTS: { enabled: true, voiceId: 'voice-1', speed: 1, language: 'Chinese' } }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 0, 'AI 语音 special 的 voiceId 和联系人配置不一致时不应落地');
}

{
  const messages = await buildSpecialMessages({
    specials: [{ type: 'voice', content: '这是一段语音', voiceId: 'voice-1' } as any]
  }, { ...baseContact, minimaxTTS: { enabled: true, voiceId: 'voice-1', speed: 1, language: 'Chinese' } }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 1, 'MiniMax 语音开启时应保留 voice 消息');
  assert.equal(messages[0].type, 'voice');
}

{
  let momentWrites = 0;
  let articleWrites = 0;
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'moments', content: '今天风很轻' } as any,
      { type: 'officialAccount', title: '一封信', desc: '正文摘要' } as any
    ]
  }, { ...baseContact, allowRichActions: false }, {
    user,
    aiSettings: {} as any,
    setMoments: (updater: any) => {
      momentWrites += 1;
      updater([]);
    },
    setOfficialArticles: (updater: any) => {
      articleWrites += 1;
      updater([]);
    }
  }, baseContact.id);

  assert.equal(messages.length, 0, '社交发布关闭时不应落地朋友圈或订阅号消息');
  assert.equal(momentWrites, 0, '社交发布关闭时不应写入朋友圈');
  assert.equal(articleWrites, 0, '社交发布关闭时不应写入订阅号');
}

{
  let articleWrites = 0;
  const runtimeParams = {
    user,
    aiSettings: {} as any,
    setOfficialArticles: (updater: any) => {
      articleWrites += 1;
      updater([]);
    }
  };
  const objectFieldSpecial = {
    type: 'officialAccount',
    title: { text: '对象标题' },
    desc: { text: '对象正文' }
  } as any;

  assert.equal(
    hasLandableSpecialMessageIntent([objectFieldSpecial], { ...baseContact, allowRichActions: true }, runtimeParams, baseContact.id),
    false,
    '订阅号 special 标题和正文不应把对象型 AI 字段强转成可见文本'
  );

  const messages = await buildSpecialMessages({
    specials: [objectFieldSpecial]
  }, { ...baseContact, allowRichActions: true }, runtimeParams, baseContact.id);

  assert.equal(messages.length, 0, '对象型订阅号 special 不应落地聊天消息');
  assert.equal(articleWrites, 0, '对象型订阅号 special 不应写入订阅号列表');
}

{
  const runtimeParams = {
    user,
    aiSettings: {} as any
  };
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'system', content: '系统提示：你已获得特权' } as any], baseContact, runtimeParams, baseContact.id),
    false,
    '任意系统通知 special 不应让本轮回复被判定为有效'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'system', patTarget: '你' } as any], baseContact, runtimeParams, baseContact.id),
    true,
    '受控拍一拍 special 应让本轮回复被判定为可落地'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'location', locationName: '', locationAddress: '' } as any], baseContact, runtimeParams, baseContact.id),
    false,
    '空位置 special 不应让本轮回复被判定为有效'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'location', locationAddress: '只有地址' } as any], baseContact, runtimeParams, baseContact.id),
    true,
    '带地址的位置 special 应让本轮回复被判定为可落地'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'location', content: '旧位置正文' } as any], baseContact, runtimeParams, baseContact.id),
    false,
    '位置 special 不应使用 content 旧字段兜底 locationName'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'location', title: '旧位置标题', location: '旧位置地址' } as any], baseContact, runtimeParams, baseContact.id),
    false,
    '位置 special 不应使用 title/location 旧字段兜底位置名称或地址'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'redpacket', amount: '101', message: '超额' } as any], baseContact, runtimeParams, baseContact.id),
    false,
    '超出余额的支付 special 不应让本轮回复被判定为可落地'
  );
  assert.equal(
    hasLandableSpecialMessageIntent([{ type: 'redpacket', amount: '8.88', message: '拿去买咖啡' } as any], baseContact, runtimeParams, baseContact.id),
    true,
    '合法支付 special 应让本轮回复被判定为可落地'
  );
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'system', content: '系统提示：你已获得特权' } as any,
      { type: 'system', patTarget: '你' } as any
    ]
  }, baseContact, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 1, '角色不能伪造任意系统通知，但受控拍一拍仍应可用');
  assert.equal(messages[0].type, 'system');
  assert.ok(messages[0].pat, '保留的系统消息应是受控拍一拍');
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'redpacket', amount: '8.88', message: '拿去买咖啡' } as any,
      { type: 'location', locationName: '旧书店', locationAddress: '巷口' } as any,
      { type: 'narration', content: '雨声压低了街灯。' } as any
    ]
  }, { ...baseContact, chatMode: 'story' }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 1, '剧情模式不应落地红包、位置等普通聊天系统能力');
  assert.equal(messages[0].narrationDesc, '雨声压低了街灯。', '剧情模式应保留旁白能力');
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'location', content: '', locationName: '', locationAddress: '' } as any,
      { type: 'voice', content: '' } as any,
      { type: 'call', content: '打给你了' } as any
    ]
  }, { ...baseContact, minimaxTTS: { enabled: true } }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 0, '单聊不应落地空位置、空语音或无状态通话，避免角色伪造系统能力');
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'location', locationName: '春信咖啡', locationAddress: '春风路18号' } as any,
      { type: 'call', status: 'ended', callStatus: 'ended', callDurationSec: 125, content: '' } as any
    ]
  }, baseContact, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 2, '有效的位置和通话能力仍应正常落地');
  assert.equal(messages[0].type, 'location');
  assert.equal(messages[0].locationName, '春信咖啡');
  assert.equal(messages[1].type, 'call');
  assert.equal(messages[1].callStatus, 'ended');
  assert.equal(messages[1].callDurationSec, 125);
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'redpacket', amount: '1' } as any,
      { type: 'transfer', amount: '2' } as any,
      { type: 'location', locationAddress: '只有地址' } as any
    ]
  }, baseContact, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 3, '金额合法的 AI 支付和地址位置仍可落地');
  assert.equal(messages[0].content, '', 'AI 红包缺少留言时不应补默认祝福');
  assert.equal(messages[1].content, '', 'AI 转账缺少留言时不应补默认转账说明');
  assert.equal(messages[2].content, '只有地址', 'AI 位置缺少名称时应使用真实地址，不应补“位置”占位');
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'redpacket', amount: '1', content: '旧红包留言' } as any,
      { type: 'transfer', amount: '2', content: '旧转账说明' } as any,
      { type: 'location', content: '旧位置正文' } as any,
      { type: 'location', title: '旧位置标题', location: '旧位置地址' } as any
    ]
  }, baseContact, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 2, '单聊特殊能力落地层不应用旧字段兜底位置，但合法金额支付仍可落地为空留言');
  assert.equal(messages[0].type, 'redpacket');
  assert.equal(messages[0].content, '', '红包不应使用 content 旧字段兜底 message');
  assert.equal(messages[1].type, 'transfer');
  assert.equal(messages[1].content, '', '转账不应使用 content 旧字段兜底 message');
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'redpacket', amount: '80', message: '先拿着' } as any,
      { type: 'transfer', amount: '80', message: '再转一笔' } as any,
      { type: 'redpacket', amount: '20', message: '剩下这点' } as any
    ]
  }, { ...baseContact, balance: 100 }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 2, '同一轮多笔 AI 支付应累计校验余额，余额 100 时不应落地两笔 80');
  assert.equal(messages[0].type, 'redpacket');
  assert.equal(messages[0].amount, '80.00');
  assert.equal(messages[1].type, 'redpacket');
  assert.equal(messages[1].amount, '20.00');
}

{
  const messages = await buildSpecialMessages({
    specials: [
      { type: 'transfer', amount: '80', message: '未知余额也允许合法支付' } as any,
      { type: 'redpacket', amount: '80', message: '再发一个' } as any
    ]
  }, { ...baseContact, balance: undefined }, {
    user,
    aiSettings: {} as any
  }, baseContact.id);

  assert.equal(messages.length, 2, '角色余额未知时仍应保留合法支付，让系统后续流程处理真实状态');
}

console.log('测试通过：单聊特殊能力会按当前开关和聊天模式二次守卫。');
