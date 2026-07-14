import assert from 'node:assert/strict';
import { renderTemplate } from '../src/utils/htmlTemplate/index.ts';

{
  const html = renderTemplate(
    '<section>{{标题}}|{{详情}}|{{列表}}</section>',
    {
      标题: '今日账单',
      详情: { raw: '不应展示' },
      列表: ['不应作为普通变量展示']
    }
  );

  assert.equal(html, '<section>今日账单||</section>');
  assert.equal(html.includes('[object Object]'), false, '对象变量不应被强转成 [object Object]');
  assert.equal(html.includes('不应展示'), false, '对象变量不应被 JSON 展示到聊天 HTML 中');
}

{
  const html = renderTemplate(
    '<ul>{{#交易列表}}<li>{{名称}}/{{.金额}}/{{详情}}/{{.}}</li>{{/交易列表}}</ul>',
    {
      交易列表: [
        { 名称: '咖啡', 金额: 18, 详情: { note: '不应展示' } },
        { 名称: '面包', 金额: Number.POSITIVE_INFINITY, 详情: ['不应展示'] }
      ]
    }
  );

  assert.equal(html, '<ul><li>咖啡/18//</li><li>面包///</li></ul>');
  assert.equal(html.includes('[object Object]'), false, '循环字段对象不应被强转成 [object Object]');
  assert.equal(html.includes('不应展示'), false, '循环字段对象或数组不应被展示到聊天 HTML 中');
}

{
  const html = renderTemplate('<p>{{#条目}}{{.}};{{/条目}}</p>', {
    条目: ['A', 2, BigInt(3), { text: '不应展示' }]
  });

  assert.equal(html, '<p>A;2;3;;</p>');
}

console.log('测试通过：HTML 模板渲染只允许标量变量落地，结构对象不会污染可见内容。');
