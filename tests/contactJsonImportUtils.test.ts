import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseContactJsonImport } from '../src/app/contactJsonImportUtils.ts';

const singleResult = parseContactJsonImport(JSON.stringify({
  name: '林雾禾',
  gender: 'female',
  language: '日语',
  translateToChinese: true,
  minimaxTTS: {
    enabled: true,
    voiceId: 'voice-001',
    speed: 1.2,
    language: 'Japanese'
  },
  sentenceRange: {
    min: 2,
    max: 5
  }
}));

assert.equal(singleResult.source, 'single');
assert.equal(singleResult.patch.name, '林雾禾');
assert.equal(singleResult.patch.language, '日语');
assert.equal(singleResult.patch.translateToChinese, true);
assert.equal(singleResult.patch.minimaxTTSEnabled, true);
assert.equal(singleResult.patch.minimaxVoiceId, 'voice-001');
assert.equal(singleResult.patch.minimaxSpeed, 1.2);
assert.equal(singleResult.patch.minimaxLanguage, 'Japanese');
assert.equal(singleResult.patch.sentenceRangeMin, 2);
assert.equal(singleResult.patch.sentenceRangeMax, 5);

const contactsResult = parseContactJsonImport(JSON.stringify({
  contacts: [{
    name: '贺逾白',
    relationship: '克制型暧昧对象',
    personality: '这是完整人格提示词，不应错误塞进性格字段',
    sentenceRange: {
      min: 1,
      max: 3
    }
  }]
}));

assert.equal(contactsResult.source, 'contacts');
assert.equal(contactsResult.patch.name, '贺逾白');
assert.equal(contactsResult.patch.relationship, '克制型暧昧对象');
assert.equal(contactsResult.patch.sentenceRangeMin, 1);
assert.equal(contactsResult.patch.sentenceRangeMax, 3);
assert.equal(contactsResult.patch.personalityTraits, '', '完整人格提示词不应错误塞进性格字段');

const naturalLanguageGenderResult = parseContactJsonImport(JSON.stringify({
  name: '沈知野',
  gender: '男'
}));
assert.equal(
  naturalLanguageGenderResult.patch.gender,
  '',
  '联系人导入不应通过中文词面猜测 gender，也不应落回固定性别'
);

assert.throws(
  () => parseContactJsonImport('{'),
  /JSON 格式不正确/,
  '非法 JSON 应给出明确报错'
);

assert.throws(
  () => parseContactJsonImport(JSON.stringify({ contacts: [] })),
  /contacts 数组为空/,
  '空 contacts 数组应报错'
);

assert.throws(
  () => parseContactJsonImport(JSON.stringify({ name: '   ' })),
  /缺少联系人姓名/,
  '缺少姓名时应报错'
);

const importSource = readFileSync(new URL('../src/app/contactJsonImportUtils.ts', import.meta.url), 'utf8');
const patchSource = readFileSync(new URL('../src/app/contactFormPatchUtils.ts', import.meta.url), 'utf8');

assert.doesNotMatch(importSource, /Record<string, any>/, '联系人 JSON 导入不应继续用 Record<string, any> 接收外部 JSON');
assert.doesNotMatch(patchSource, /Record<string, any>/, '联系人表单 patch 归一不应继续用 Record<string, any> 接收外部 JSON');
assert.doesNotMatch(patchSource, /includes\('男'\)|includes\('其'\)/, '联系人表单 patch 不应通过自然语言关键词猜测性别');
assert.match(patchSource, /UnknownRecord = Record<string, unknown>/, '联系人表单 patch 归一应使用 unknown record 边界');

console.log('测试通过：联系人 JSON 导入解析正常。');
