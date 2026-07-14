import type { HtmlTemplateVariable } from '../../types/htmlTemplate.ts';

/**
 * 从HTML模板中提取变量（仅顶层变量 + 列表变量名）
 *
 * 说明：
 * - 循环块 {{#列表名}}...{{/列表名}} 内部出现的 {{字段}} / {{.字段}} 属于“每项字段”，不应被当成 vars 顶层变量。
 * - 旧逻辑会把循环字段也提取出来，容易误导AI把字段填到 vars 顶层，导致循环渲染时每行都一样（触发外层回退）。
 */
export function extractTemplateVariables(html: string): string[] {
  const varSet = new Set<string>();

  const raw = String(html || '');

  // 先移除所有循环块内容，避免把循环字段提取成顶层变量
  // 反向块 {{^列表}}...{{/列表}} 仍保留：其中的变量依然属于顶层变量
  const stripped = raw.replace(
    /\{\{#\s*([\w\u4e00-\u9fff]+)\s*\}\}[\s\S]*?\{\{\/\s*\1\s*\}\}/g,
    ''
  );

  // 匹配简单变量 {{变量名}}（排除 {{#...}} {{^...}} {{/...}} {{.}} 等控制语法）
  const simpleVarRegex = /\{\{(?!#|\^|\/|\.)(\s*[\w\u4e00-\u9fff]+\s*)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = simpleVarRegex.exec(stripped)) !== null) {
    varSet.add(match[1].trim());
  }

  // 匹配列表变量名（循环块/反向块） {{#列表名}} / {{^列表名}}
  const listRegex = /\{\{[#^](\s*[\w\u4e00-\u9fff]+\s*)\}\}/g;
  while ((match = listRegex.exec(raw)) !== null) {
    varSet.add(match[1].trim());
  }

  return Array.from(varSet);
}

export type ExtractedTemplateVariableMeta = {
  name: string;
  type: 'text' | 'array';
};

/**
 * 提取带类型的变量信息：顶层变量默认为 text，列表变量默认为 array
 */
export function extractTemplateVariableMetas(html: string): ExtractedTemplateVariableMeta[] {
  const raw = String(html || '');
  const stripped = raw.replace(
    /\{\{#\s*([\w\u4e00-\u9fff]+)\s*\}\}[\s\S]*?\{\{\/\s*\1\s*\}\}/g,
    ''
  );

  const scalarNames: string[] = [];
  const scalarSet = new Set<string>();
  const simpleVarRegex = /\{\{(?!#|\^|\/|\.)(\s*[\w\u4e00-\u9fff]+\s*)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = simpleVarRegex.exec(stripped)) !== null) {
    const name = match[1].trim();
    if (!name || scalarSet.has(name)) continue;
    scalarSet.add(name);
    scalarNames.push(name);
  }

  const listNames: string[] = [];
  const listSet = new Set<string>();
  const listRegex = /\{\{[#^](\s*[\w\u4e00-\u9fff]+\s*)\}\}/g;
  while ((match = listRegex.exec(raw)) !== null) {
    const name = match[1].trim();
    if (!name || listSet.has(name)) continue;
    listSet.add(name);
    listNames.push(name);
  }

  return [
    ...scalarNames.map((name) => ({ name, type: 'text' as const })),
    ...listNames.map((name) => ({ name, type: 'array' as const }))
  ];
}

export type ExtractedTemplateLoopMeta = {
  listName: string;
  fields: string[];
};

/**
 * 提取循环块 {{#列表名}}...{{/列表名}} 内部使用到的字段名（用于提示词约束每项对象结构）
 */
export function extractTemplateLoopMetas(html: string): ExtractedTemplateLoopMeta[] {
  const raw = String(html || '');
  const loopRegex = /\{\{#\s*([\w\u4e00-\u9fff]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g;
  const result: ExtractedTemplateLoopMeta[] = [];
  const indexMap = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = loopRegex.exec(raw)) !== null) {
    const listName = String(match[1] || '').trim();
    const body = String(match[2] || '');
    if (!listName) continue;

    const fieldSet = new Set<string>();

    // {{.字段}}
    const dotFieldRegex = /\{\{\.\s*([\w\u4e00-\u9fff]+)\s*\}\}/g;
    let inner: RegExpExecArray | null;
    while ((inner = dotFieldRegex.exec(body)) !== null) {
      const name = String(inner[1] || '').trim();
      if (name) fieldSet.add(name);
    }

    // {{字段}}（排除控制语法）
    const plainFieldRegex = /\{\{(?!#|\^|\/|\.)(\s*[\w\u4e00-\u9fff]+\s*)\}\}/g;
    while ((inner = plainFieldRegex.exec(body)) !== null) {
      const name = String(inner[1] || '').trim();
      if (name) fieldSet.add(name);
    }

    if (indexMap.has(listName)) {
      const existing = result[indexMap.get(listName)!];
      existing.fields = Array.from(new Set([...existing.fields, ...Array.from(fieldSet)]));
      continue;
    }

    indexMap.set(listName, result.length);
    result.push({ listName, fields: Array.from(fieldSet) });
  }

  return result;
}

/**
 * 根据变量名列表生成带默认description的变量定义数组
 */
export function buildDefaultVariables(varNames: string[]): HtmlTemplateVariable[] {
  return varNames.map((name) => ({
    name,
    description: `请填写${name}的值`,
    type: 'text' as const,
  }));
}

/**
 * 根据提取到的变量元数据生成默认变量定义（列表变量默认标记为 array）
 */
export function buildDefaultVariablesFromMetas(metas: ExtractedTemplateVariableMeta[]): HtmlTemplateVariable[] {
  return metas.map((meta) => ({
    name: meta.name,
    description: `请填写${meta.name}的值`,
    type: meta.type
  }));
}
