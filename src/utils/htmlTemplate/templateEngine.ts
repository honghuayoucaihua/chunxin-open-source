/**
 * HTML转义，防止XSS
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const normalizeTemplateDisplayValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return String(value);
  return '';
};

/**
 * 替换单行变量 {{变量名}} — 在给定的 scope 中查找，找不到再到 fallback 中查找
 */
const replaceVars = (
  text: string,
  scope: Record<string, unknown>,
  fallback?: Record<string, unknown>
): string =>
  text.replace(
    /\{\{([\w\u4e00-\u9fff]+)\}\}/g,
    (_match, varName: string) => {
      // 先在当前作用域查找
      const val = scope[varName];
      if (val != null) {
        return escapeHtml(normalizeTemplateDisplayValue(val));
      }
      // 回退到外层变量
      if (fallback) {
        const outerVal = fallback[varName];
        if (outerVal != null) {
          return escapeHtml(normalizeTemplateDisplayValue(outerVal));
        }
      }
      return '';
    }
  );

/**
 * 渲染循环块内单个迭代项
 */
const renderLoopItem = (
  body: string,
  item: unknown,
  outerVars: Record<string, unknown>
): string => {
  let row = body;

  if (typeof item === 'object' && item !== null) {
    const record = item as Record<string, unknown>;
    // 替换 {{.字段名}} 点前缀写法
    row = row.replace(
      /\{\{\.([\w\u4e00-\u9fff]+)\}\}/g,
      (_m: string, key: string) => {
        const val = record[key];
        return val != null ? escapeHtml(normalizeTemplateDisplayValue(val)) : '';
      }
    );
    // 对象项没有天然可展示正文，只允许字段级标量落地
    row = row.replace(/\{\{\.\}\}/g, '');
    // 替换 {{字段名}} — 先在 item 中查找，再回退到外层
    row = replaceVars(row, record, outerVars);
  } else {
    // 基本类型列表元素
    row = row.replace(/\{\{\.\}\}/g, escapeHtml(normalizeTemplateDisplayValue(item)));
    row = replaceVars(row, {}, outerVars);
  }

  return row;
};

/**
 * 将变量值填充到HTML模板中
 *
 * 支持：
 * - {{变量名}} 简单变量替换（自动HTML转义）
 * - {{#列表名}}...{{/列表名}} 循环块展开（列表非空时渲染）
 * - {{^列表名}}...{{/列表名}} 反向块（列表为空或不存在时渲染）
 * - 循环块内 {{字段名}} 访问当前项属性，找不到回退到外层变量
 * - 循环块内 {{.字段名}} 显式访问当前项属性，{{.}} 访问元素自身
 */
export function renderTemplate(
  htmlContent: string,
  vars: Record<string, unknown>
): string {
  let result = htmlContent;

  // 1. 展开循环块 {{#列表名}}...{{/列表名}}
  const loopRegex = /\{\{#([\w\u4e00-\u9fff]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(loopRegex, (_match, listName: string, body: string) => {
    const list = vars[listName];
    if (!Array.isArray(list) || list.length === 0) return '';
    return list.map((item) => renderLoopItem(body, item, vars)).join('');
  });

  // 2. 展开反向块 {{^列表名}}...{{/列表名}}（当值为空/falsy时渲染）
  const invertedRegex = /\{\{\^([\w\u4e00-\u9fff]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(invertedRegex, (_match, name: string, body: string) => {
    const val = vars[name];
    const isEmpty = val == null || val === '' || val === false || (Array.isArray(val) && val.length === 0);
    return isEmpty ? body : '';
  });

  // 3. 替换简单变量 {{变量名}}
  result = replaceVars(result, vars);

  return result;
}
