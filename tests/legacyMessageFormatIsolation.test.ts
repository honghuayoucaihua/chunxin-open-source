import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeLegacyMessagePayload } from '../src/appStateNormalizeUtils.ts';

{
  const payload = normalizeLegacyMessagePayload({
    content: JSON.stringify({
      text: '我先说正文。',
      tags: [
        { type: 'inner', value: '旧心声不应恢复' },
        { type: 'action', value: '旧动作不应恢复' }
      ]
    })
  });

  assert.deepEqual(payload, {
    content: '我先说正文。',
    innerVoice: undefined,
    actionDesc: undefined
  }, '旧 JSON 正文里的 tags 不应在迁移时重新变成心声或动作字段');
}

{
  const payload = normalizeLegacyMessagePayload({
    content: '这句可见。<inner>旧心声不应恢复</inner><action>旧动作不应恢复</action>'
  });

  assert.deepEqual(payload, {
    content: '这句可见。',
    innerVoice: undefined,
    actionDesc: undefined
  }, '旧 XML 风格心声/动作标记只应从可见正文中清理，不应重新结构化落地');
}

{
  const payload = normalizeLegacyMessagePayload({
    content: '旧版动作消息',
    typeRaw: 'action'
  });

  assert.deepEqual(payload, {
    content: '',
    innerVoice: undefined,
    actionDesc: '旧版动作消息'
  }, '明确的旧版 action 消息类型仍属于结构化动作，应继续迁移为动作字段');
}

{
  const payload = normalizeLegacyMessagePayload({
    content: '可见正文',
    explicitInner: '独立心声字段',
    explicitAction: '独立动作字段'
  });

  assert.deepEqual(payload, {
    content: '可见正文',
    innerVoice: '独立心声字段',
    actionDesc: '独立动作字段'
  }, '已经是独立字段的心声/动作应保留，避免损坏真实结构化数据');
}

const normalizeSource = readFileSync(new URL('../src/appStateNormalizeUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(normalizeSource, /innerFromMarkup|actionFromMarkup|pickTag\(\['inner', 'storyInner'\]|pickTag\(\['action', 'storyState'\]/, '旧消息迁移不应继续从正文旧格式兜底提取心声或动作');

console.log('测试通过：旧消息迁移不会从正文旧格式重新恢复心声或动作字段。');
