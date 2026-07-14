import assert from 'node:assert/strict';
import {
  sanitizeGeneratedArticleText,
  sanitizeGeneratedArticleTitle
} from '../src/appBootstrapUtils.ts';

assert.equal(
  sanitizeGeneratedArticleTitle('**睡前散步**'),
  '睡前散步'
);

assert.equal(
  sanitizeGeneratedArticleTitle('**睡前散步** 【心声】其实想劝你早点休息 [位置] 春信咖啡'),
  '',
  '订阅号标题混入心声或系统事件格式时应整段拒收'
);

assert.equal(
  sanitizeGeneratedArticleText('# 今晚别硬撑\n\n正文第一段。\n\n正文第二段'),
  '今晚别硬撑\n正文第一段。\n正文第二段'
);

assert.equal(
  sanitizeGeneratedArticleText('# 今晚别硬撑\n\n正文第一段。【动作】把灯调暗\n\n译文：Sleep early\n\n正文第二段\n\n[系统转账·待收款] ¥20'),
  '',
  '订阅号正文混入动作、译文或系统事件格式时应整段拒收'
);

console.log('测试通过：订阅号文章标题和正文会拒收混入非展示格式和明确系统事件格式的内容。');
