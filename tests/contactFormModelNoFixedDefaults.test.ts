import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildContactFormData, buildContactFromForm, buildContactPersonality } from '../src/utils/UtilsContactFormModel.ts';

const blankForm = buildContactFormData();

assert.equal(blankForm.constellation, '', '新建联系人表单不应默认写入固定星座');
assert.equal(blankForm.mbti, '', '新建联系人表单不应默认写入固定 MBTI');
assert.equal(blankForm.region, '', '新建联系人表单不应默认写入固定地区');
assert.equal(blankForm.avatar, '', '新建联系人表单不应默认写入默认头像');
assert.equal(blankForm.gender, '', '新建联系人表单不应默认写入固定性别');

const personality = buildContactPersonality({
  ...blankForm,
  name: '林夏'
});
assert.equal(personality.includes('普通联系人'), false, '未填写关系时不应在角色资料里补“普通联系人”');
assert.equal(personality.includes('性别'), false, '未填写性别时不应进入角色资料');
assert.equal(personality.includes('星座'), false, '未填写星座时不应进入角色资料');
assert.equal(personality.includes('MBTI'), false, '未填写 MBTI 时不应进入角色资料');

const contact = buildContactFromForm({ ...blankForm, name: '林夏' }, 'contact-1');
assert.equal(contact.avatar, '', '从表单创建联系人时不应补默认头像到角色数据');
assert.equal(contact.region, '', '从表单创建联系人时不应补默认地区到角色数据');

const modelSource = readFileSync(new URL('../src/utils/UtilsContactFormModel.ts', import.meta.url), 'utf8');
assert.doesNotMatch(
  modelSource,
  /contact\?\.constellation \|\| '天秤座'|contact\?\.mbti \|\| 'INFJ'|contact\?\.region \|\| '中国'|contact\?\.avatar \|\| '\/assets\/image\/user\.png'|'普通联系人'/,
  '联系人表单模型不应保留固定角色资料兜底'
);

const viewSource = readFileSync(new URL('../src/utils/UtilsContactFormView.tsx', import.meta.url), 'utf8');
assert.match(viewSource, /emptyLabel="未填写"/, '联系人表单下拉空值应只作为 UI 显示，而不是写入默认资料');
assert.match(viewSource, /form\.avatar \|\| '\/assets\/image\/user\.png'/, '头像占位应只用于预览显示');

console.log('测试通过：联系人表单模型不再补固定角色资料。');
