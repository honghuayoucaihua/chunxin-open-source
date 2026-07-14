import assert from 'node:assert/strict';
import { TERMS_NOTICE_ITEMS } from '../src/pages/termsNoticeContent.ts';

{
  assert.equal(TERMS_NOTICE_ITEMS.length, 6, '使用前须知条目数量应为 6 条');
  assert.ok(
    TERMS_NOTICE_ITEMS.every((item) => item.title.startsWith('关于')),
    '使用前须知每条标题都应以“关于”开头'
  );

  const idSet = new Set(TERMS_NOTICE_ITEMS.map((item) => item.id));
  assert.equal(idSet.size, TERMS_NOTICE_ITEMS.length, '使用前须知条目 id 应唯一');

  assert.equal(
    TERMS_NOTICE_ITEMS[0]?.id,
    'aboutFreeAndDonation',
    '使用前须知首条应为“关于免费与赞赏”'
  );
  const donationItem = TERMS_NOTICE_ITEMS[0];
  assert.ok(
    donationItem?.content.includes('本站完全免费'),
    '免费与赞赏条目应说明本站完全免费'
  );
  assert.ok(
    donationItem?.content.includes('https://lk.sydf.cc/'),
    '免费与赞赏条目应指引到新的赞赏链接'
  );

  const emailItem = TERMS_NOTICE_ITEMS.find((item) => item.content.includes('shiyuedongfang@gmail.com'));
  assert.ok(emailItem, '使用前须知应保留邮箱说明');
  assert.ok(
    emailItem.content.includes('反馈前请确保你的问题不记录在关于叙说-帮助与反馈中'),
    '使用前须知应保留反馈说明原句'
  );

  const complianceItem = TERMS_NOTICE_ITEMS.find((item) => item.id === 'aboutCompliance');
  assert.ok(complianceItem, '应存在“关于合规与禁止行为”条目');
  assert.ok(
    complianceItem.content.includes('禁止任何个人、企业接入未备案的生成式人工智能服务'),
    '合规条目应包含“禁止任何个人、企业接入未备案的生成式人工智能服务”'
  );

  const privacyItem = TERMS_NOTICE_ITEMS.find((item) => item.id === 'aboutPrivacyData');
  assert.ok(privacyItem, '应存在“关于隐私与数据”条目');
  assert.ok(
    privacyItem.content.includes('外置 Key') || privacyItem.content.includes('第三方模型服务'),
    '隐私条目应提示外置 Key / 第三方模型服务风险'
  );
  assert.ok(
    privacyItem.content.includes('请勿输入敏感个人信息'),
    '隐私条目应提示不要输入敏感个人信息'
  );
}

console.log('测试通过：使用前须知条目结构与关键文案符合预期。');
