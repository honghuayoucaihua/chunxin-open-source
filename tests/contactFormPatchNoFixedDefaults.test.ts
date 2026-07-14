import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toContactFormPatch } from '../src/app/contactFormPatchUtils.ts';
import { CONTACT_FORM_SYSTEM_INSTRUCTION } from '../src/app/contactFormAiRuntime.ts';

const patch = toContactFormPatch({
  name: '林夏',
  gender: 'female',
  openingLine: '小满，今天想聊点什么？'
});

assert.equal(patch.constellation, '', '联系人表单转换不应把缺失星座补成固定默认值');
assert.equal(patch.mbti, '', '联系人表单转换不应把缺失 MBTI 补成固定默认值');
assert.equal(patch.region, '', '联系人表单转换不应把缺失地区补成固定默认值');
assert.equal(patch.avatar, '', '联系人表单转换不应把缺失头像补成默认头像');

const pollutedPatch = toContactFormPatch({
  name: { text: '对象姓名不应落地' },
  remark: ['数组备注不应落地'],
  age: 24,
  relationship: { text: '对象关系不应落地' },
  persona: { text: '对象人设不应进入提示词' },
  background: ['数组背景不应进入提示词'],
  openingLine: { text: '对象开场不应落地' },
  expressionStyle: ['数组表达风格不应落地'],
  language: { text: '日语' },
  minimaxTTS: {
    enabled: true,
    voiceId: { text: 'voice-object' },
    language: ['Japanese']
  }
} as any);

assert.equal(pollutedPatch.name, '', '对象型姓名不应强转成 [object Object]');
assert.equal(pollutedPatch.remark, '', '数组型备注不应强转成文本');
assert.equal(pollutedPatch.age, '24', '数字年龄仍应作为可展示标量保留');
assert.equal(pollutedPatch.relationship, '', '对象型关系不应落地到长期资料');
assert.equal(pollutedPatch.persona, '', '对象型人设不应进入角色提示词');
assert.equal(pollutedPatch.background, '', '数组型背景不应进入角色提示词');
assert.equal(pollutedPatch.openingLine, '', '对象型开场白不应落地');
assert.equal(pollutedPatch.expressionStyle, '', '数组型表达风格不应落地');
assert.equal(pollutedPatch.language, '普通话', '对象型语言不应强转，也不应误触发翻译');
assert.equal(pollutedPatch.translateToChinese, false, '对象型语言应按默认普通话处理');
assert.equal(pollutedPatch.minimaxVoiceId, '', '对象型 voiceId 不应强转成 [object Object]');
assert.equal(pollutedPatch.minimaxLanguage, 'Chinese', '数组型语音语言应回退默认值');

assert.match(
  CONTACT_FORM_SYSTEM_INSTRUCTION,
  /不要套用固定默认星座、MBTI、地区或头像/,
  '联系人 AI 生成提示应要求不要套固定默认资料'
);

const source = readFileSync(new URL('../src/app/contactFormPatchUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(
  source,
  /天秤座|INFJ|raw\.region \|\| '中国'|\/assets\/image\/user\.png/,
  '联系人表单转换层不应保留固定角色资料兜底'
);

console.log('测试通过：联系人表单转换不再补固定角色资料。');
