import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mailboxSource = fs.readFileSync(new URL('../src/mailbox/MailboxSettingsView.tsx', import.meta.url), 'utf8');
const builtinAiSource = fs.readFileSync(new URL('../src/settings/ai/BuiltinAIConfig.tsx', import.meta.url), 'utf8');
const adminFormsSource = fs.readFileSync(new URL('../src/admin/AdminForms.tsx', import.meta.url), 'utf8');
const teamSource = fs.readFileSync(new URL('../src/pages/XushuoTeam.tsx', import.meta.url), 'utf8');
const forumListSource = fs.readFileSync(new URL('../src/forum/ForumListView.tsx', import.meta.url), 'utf8');
const maskEditSource = fs.readFileSync(new URL('../src/profile/MaskEditView.tsx', import.meta.url), 'utf8');
const chatDetailsSource = fs.readFileSync(new URL('../src/app/subviews/chatDetailsSubViews.tsx', import.meta.url), 'utf8');
const htmlTemplateSource = fs.readFileSync(new URL('../src/settings/HtmlTemplateViews.tsx', import.meta.url), 'utf8');
const customTabSource = fs.readFileSync(new URL('../src/settings/skin/CustomTab.tsx', import.meta.url), 'utf8');
const primitiveSource = fs.readFileSync(new URL('../src/utils/UtilsContactFormPrimitives.tsx', import.meta.url), 'utf8');
const skinPrimitiveSource = fs.readFileSync(new URL('../src/settings/skin/SkinPanelPrimitives.tsx', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

function collectSourceFiles(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist', 'dev-dist', 'tests'].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.tsx$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function assertAllSelectsUseUnifiedField(source: string, fileLabel: string) {
  const selectBlocks = source.match(/<select[\s\S]*?<\/select>/g) || [];
  assert.ok(selectBlocks.length > 0, `${fileLabel} 应至少包含一个 select 供统一样式校验`);
  for (const block of selectBlocks) {
    assert.match(block, /app-field-select/, `${fileLabel} 中的 select 应统一使用 app-field-select`);
  }
}

assert.match(mailboxSource, /className="app-field-select h-9 px-2"/, '信箱设置页的面具选择框应复用统一选择框样式');
assert.match(builtinAiSource, /className="app-field-select text-\[14px\] py-1\.5"/, '内置 AI 设置页的模型选择框应复用统一选择框样式');
assert.match(adminFormsSource, /className="app-field-select bg-slate-700\/50 border-white\/10 text-white text-sm"/, '管理面板表单的类型选择框应复用统一选择框样式');
assert.match(teamSource, /className="app-field-select flex-1 min-w-0 px-2 py-1\.5 bg-gray-100 dark:bg-gray-700 render-text-primary text-xs border-none"/, '叙说团队页筛选选择框应复用统一选择框样式');
assert.match(forumListSource, /className="app-field-select text-sm"/, '论坛发帖分类选择框应复用统一选择框样式');
assert.match(maskEditSource, /className="app-field-select app-list-item-input app-list-item-select text-\[14px\] render-text-primary"/, '面具编辑页性别选择框应复用统一选择框样式');
assert.match(chatDetailsSource, /className="app-field-select app-list-item-input app-list-item-select text-\[14px\] render-text-primary"/, '聊天详情子页的关系选择框应复用统一选择框样式');
assert.match(htmlTemplateSource, /className="app-field-select text-xs bg-transparent text-gray-500 py-1 pr-7"/, 'HTML 模板变量类型选择框应复用统一选择框样式');
assert.match(customTabSource, /className="app-field-select"/, '皮肤自定义页的基底皮肤选择框应复用统一选择框样式');
assert.match(primitiveSource, /className="app-field-select app-list-item-input app-list-item-select/, '联系人表单 primitive 中的选择框应以统一选择框类为基础');
assert.match(skinPrimitiveSource, /className="app-field-select mt-1"/, '皮肤 primitive 中的选择框应以内置统一选择框类为默认基础');
assertAllSelectsUseUnifiedField(mailboxSource, '信箱设置页');
assertAllSelectsUseUnifiedField(builtinAiSource, '内置 AI 设置页');
assertAllSelectsUseUnifiedField(adminFormsSource, '管理面板表单');
assertAllSelectsUseUnifiedField(teamSource, '叙说团队页');
assertAllSelectsUseUnifiedField(forumListSource, '论坛列表页');
assertAllSelectsUseUnifiedField(maskEditSource, '面具编辑页');
assertAllSelectsUseUnifiedField(chatDetailsSource, '聊天详情子页');
assertAllSelectsUseUnifiedField(htmlTemplateSource, 'HTML 模板页');
assertAllSelectsUseUnifiedField(customTabSource, '皮肤自定义页');
assertAllSelectsUseUnifiedField(primitiveSource, '联系人表单 primitive');
assertAllSelectsUseUnifiedField(skinPrimitiveSource, '皮肤 primitive');
assert.match(cssSource, /\.app-field-select\s*\{[\s\S]*appearance:\s*none;/, '统一选择框样式应移除原生下拉默认外观');
assert.match(cssSource, /\.app-field-select\s*\{[\s\S]*background-image:/, '统一选择框样式应提供统一箭头');
assert.match(cssSource, /\.app-field-select:focus\s*\{[\s\S]*box-shadow:/, '统一选择框样式应提供统一 focus 状态');

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const selectViolations = collectSourceFiles(repoRoot)
  .flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const selectBlocks = source.match(/<select[\s\S]*?<\/select>/g) || [];
    return selectBlocks
      .filter((block) => !/app-field-select/.test(block))
      .map(() => path.relative(repoRoot, filePath));
  });

assert.deepEqual(selectViolations, [], '业务源码中的 select 不应脱离 app-field-select');
