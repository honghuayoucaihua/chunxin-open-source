import assert from 'node:assert/strict';
import { INITIAL_CONTACTS } from '../src/constants.ts';

INITIAL_CONTACTS.forEach((contact) => {
  const text = [
    contact.personality,
    contact.relationship,
    contact.persona,
    contact.background,
    contact.description
  ].filter(Boolean).join('\n');
  assert.doesNotMatch(text, /普通联系人/, `默认联系人 ${contact.name} 不应带固定关系占位`);
});

console.log('测试通过：默认联系人资料不再带固定关系占位。');
