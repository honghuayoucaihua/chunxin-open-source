# 贡献者指南

本文档面向人类贡献者和 AI 编辑助手（Claude Code、Cursor、Codex、Copilot 等），讲清楚如何在本项目里做事不踩坑。

> 第一次接触本仓库的 AI / 人，**至少先把 [§0 开工前必读](#0-开工前必读) 和 [§9 AI 协作守则](#9-ai-协作守则) 读完**。

## 0. 开工前必读

1. 读 [`project-map.md`](project-map.md) 找到你要改的代码在哪一层 / 哪个域。
2. 读 [`audit-plan.md`](audit-plan.md) 确认你要做的事是否撞到了治理路线。
3. 改持久化字段前必读 [`state-and-persistence.md`](state-and-persistence.md) 的"5 步检查清单"。
4. 改皮肤 / 基础组件前必读 [`skin-system.md`](skin-system.md) §6"基础组件统一原则"。
5. 改返回键 / 键盘 / 安全区前必读 [`mobile-compat.md`](mobile-compat.md) §11"真机测试 checklist"。

## 1. 项目结构与模块组织

| 角色 | 路径 |
| --- | --- |
| 入口 / 壳 | `src/App.tsx`、`src/AppCore.tsx`、`src/AppShell.tsx`、`src/DesktopModeShell.tsx` |
| 编排层 | `src/app/`（flow / runtime / handler / lazy） |
| 共享层 | `src/hooks/`、`src/services/`、`src/utils/`、`src/types/` |
| 功能域 | `src/chatroom/`、`src/moments/`、`src/settings/`、`src/community/`、`src/music/`、`src/mailbox/`、`src/official/`、`src/forum/`、`src/finance/`、`src/admin/`、`src/pages/`、`src/profile/`、`src/tabs/`、`src/shell/` |
| 移动端 / 后端 | `android/`、`cloudflare/` |
| 资源 / 产物 | `public/`、`dist/`、`dev-dist/` |
| 部署 | Cloudflare Pages + Pages Functions（`wrangler.toml`） |
| 文档 | `docs/`（本文件夹） |
| 脚本 | `scripts/`（`gx.js`、`run-tests.js`、`resolveApkReleaseMeta.js`） |
| 配置 | 仓库根（`package.json`、`vite.config.ts`、`tsconfig.json`、`tailwind.config.cjs`、`postcss.config.cjs`、`capacitor.config.ts`、`index.html`） |

## 2. 构建 / 测试 / 开发命令

```bash
npm install                     # 安装前端依赖
npm run dev                     # Vite 开发服 (8003)
npm run build                   # 生产构建到 dist/
npm run preview                 # 预览构建产物
npm run typecheck               # tsc --noEmit
npm test                        # 全部测试
npm run verify                  # typecheck + test + build（提交前推荐）

# Android
npm run android:open            # cap sync + 打开 Studio
npm run apk:debug               # gradle debug
npm run apk:release             # gradle release（需要 keystore）

# 版本号
npm run gx                      # patch + buildNumber + 1
npm run gx:minor                # minor 版本递增
npm run gx:major                # major 版本递增

# Cloudflare
npm run cf:types                # 生成 Wrangler 类型
npm run cf:dev                  # 本地预览 Pages Functions（先 npm run build）
npm run cf:deploy               # 部署 dist 到 Cloudflare Pages
```

跑单个测试：

```bash
node --experimental-strip-types tests/snapshotBuilder.test.ts
```

## 3. 编码风格与命名

| 规则 | 详情 |
| --- | --- |
| 缩进 | 2 空格 |
| 引号 | 单引号 `'`，模板字符串例外 |
| 分号 | 显式（不省） |
| 文件命名（组件） | `PascalCase.tsx`（例：`ChatRoomComposer.tsx`） |
| 文件命名（工具） | `camelCase.ts`（例：`emojiTokenResolver.ts`） |
| 导入顺序 | 类型 → 第三方 → 项目相对 → 项目别名 → CSS |
| 路径别名 | `@/` 已配置（指向 `src/`），但目前**全部用相对路径**。新代码**保持一致**，不要混用 |
| 注释 | 仅在"为什么"非显然时写。**禁止描述代码做了什么**——好命名就够 |
| 中文 / 英文 | 文档、注释、用户面向的字符串：**简体中文**；标识符（变量、函数、类型）：英文 |

> 注释红线：不要写"// 修复了 issue #123"、"// 用于 X 流程"、"// 老代码遗留"——这些信息属于 PR 描述和 git history，不属于代码。

## 4. 测试约定

- 测试位于 `tests/*.test.ts`，使用 `node:assert/strict`
- 入口：`npm test`（走 `scripts/run-tests.js`）
- 单测：`node --experimental-strip-types tests/<name>.test.ts`
- 文件名贴近被测对象（例 `tests/apkReleaseSource.test.ts` ↔ `cloudflare/pages-functions/apk-candidate.js`）
- **持久化字段必须有 4 类回归测试**：键缺失、键存在但空数组、键存在但空对象、旧字段迁移
- 类型边界用 `tests/<name>TypeBoundary.test.ts` 命名
- 新加 flow / runtime / loader 切分时，配套 `tests/<name>Boundary.test.ts` 验证 lazy 切片不破坏 import

## 5. 提交与 PR

### 5.1 Commit 信息

历史提交多为极短（如 `233`）。**新提交建议使用** `范围: 摘要` 格式，例如：

```
chatroom: 修复表情气泡宽度
storage: 新增 customStickers 字段，含迁移和回归测试
deploy: 更新 Cloudflare Pages 部署说明
docs: 扩写 project-map 模块依赖图
```

范围参考：`chatroom`、`moments`、`settings`、`community`、`music`、`mailbox`、`forum`、`finance`、`admin`、`hooks`、`services`、`storage`、`snapshot`、`api`、`cloudflare`、`apk`、`android`、`deploy`、`docs`、`tests`、`scripts`、`build`。

### 5.2 PR 模板（建议）

```markdown
## 变更说明
（一句话讲清楚做了什么，**不是把代码翻译成中文**）

## 影响域
- 中枢文件：是 / 否（如果是，列出哪个）
- 持久化字段：是 / 否（如果是，列出新字段）
- 移动端 / 自更新：是 / 否

## 验证
- [ ] npm run typecheck 通过
- [ ] npm test 通过
- [ ] npm run build 通过
- [ ] 真机 / PWA / 桌面模式（涉及 UI 时）

## 截图 / 录屏
（涉及 UI 改动必须附）

## 新增 / 变更环境变量
（如果有）

## 潜在风险
（**仅在确实有风险时写**，没有就不要硬凑这一节）
```

### 5.3 中枢文件改动额外要求

修改下面任一文件，PR 必须**单独说明影响链路、补回归测试、列影响域**：

1. `src/AppCore.tsx`
2. `src/hooks/useAppState.ts`
3. `src/hooks/useAppLifecycle.ts`
4. `src/services/storage.ts`
5. `src/services/snapshot/`
6. `cloudflare/pages-functions/api-router.js`

## 6. 持久化变更 checklist

> 详见 [`state-and-persistence.md`](state-and-persistence.md) §4。

新增 / 修改字段时，至少改 5 个位置：

- [ ] `SnapshotInput` 类型（`src/services/snapshot/snapshotBuilder.ts`）
- [ ] `SnapshotPayload` 类型 + `buildSnapshotPayload` 默认值
- [ ] `useAppLifecycle.ts` 保存路径 + 启动恢复路径
- [ ] `adaptLegacyBackupData` 处理空 / 缺失场景
- [ ] `tests/<name>Persistence.test.ts` 4 类回归

漏一个就一定出 Bug。**不是"可能"，是"一定"**。

## 7. 移动端 checklist

涉及壳层 / 键盘 / 安全区 / 自更新，至少跑：

- [ ] Android 弹键盘 → 输入框抬起，不被遮
- [ ] Android 收键盘 → 底部恢复
- [ ] Android 横竖屏切换 → 安全区刷新
- [ ] Android 返回键在主 Tab 不退出 App
- [ ] iOS PWA 顶部 / 底部安全区生效
- [ ] APK 进后台 5 分钟回前台不丢会话
- [ ] 桌面模式切换不重置导航栈

详见 [`mobile-compat.md`](mobile-compat.md) §11。

## 8. 排查默认排除目录

执行全文搜索 / 统计 / AI 排查时，默认排除：

- `node_modules/`
- `dist/`
- `dev-dist/`
- `android/.gradle/`
- `android/app/build/`
- `dist/apk/`

## 9. AI 协作守则

下面 16 条是反复踩坑总结出来的，AI 编辑器 / 人类协作者**都要遵守**。每一条后面跟着具体场景，知道"什么时候这条会被触发"。

### 9.1 文档 / 注释 / 日志使用简体中文

- **触发**：写 README、`docs/*.md`、用户面向的 toast / 弹窗文案、错误信息
- **不适用**：标识符（变量名、函数名、类型名）、Git commit 一律英文
- **理由**：用户和团队主语言中文，但代码标识符英文便于与生态衔接

### 9.2 大范围排查前先看 project-map 和 audit-plan

- **触发**：用户问"X 功能在哪"、"想优化 Y"、"这个 bug 怎么修"
- **理由**：避免在 `AppCore.tsx` 找不到的功能误以为不存在；避免重做 audit-plan 里已有计划的事

### 9.3 中枢文件改动必须说明影响链路 + 补回归测试

- **触发**：编辑 §5.3 中的 6 个文件
- **理由**：这些文件出 Bug 影响所有用户、所有 Tab、所有数据

### 9.4 修改前先说明方案并等待确认

- **触发**：方案不止一种、改动有架构影响、用户没明确给路径
- **不适用**：用户已经在前面给出明确方向、修边界清楚的小 Bug
- **理由**：避免做完再返工。"先方案，再代码"成本远低于反过来

### 9.5 发现缺陷优先补复现测试再修复

- **触发**：用户报某 Bug，能定位
- **流程**：1) 写一个失败测试复现 → 2) 修复让测试过 → 3) 提交两个 commit（test + fix），或一个 commit 但 PR 描述写清楚
- **理由**：防止下次重新踩同一个坑

### 9.6 交付时只在有真实风险时才列"潜在问题"

- **触发**：PR 描述、回复用户的"做完了"消息
- **不适用**：本次改动确实无风险、无未完成项
- **理由**：硬凑出来的"潜在问题"会让真正重要的风险淹没

### 9.7 基础组件统一时抽语义骨架，不抹平视觉

- **触发**：想做"统一所有按钮 / 卡片 / 列表项"
- **正确做法**：抽变体接口（`variant="default" | "noir" | ...`），主题用 CSS 变量
- **错误做法**：写死圆角 / 阴影 / 颜色，让所有皮肤看起来一样
- **详见**：[`skin-system.md`](skin-system.md) §6

### 9.8 用户已确认总体方向后不要每轮重复征求确认

- **触发**：用户已经回了"可以，按这个做"
- **不适用**：遇到真实阻塞（依赖缺失、需要破坏性操作、改动超出原方案）
- **理由**：每次确认增加用户负担。AI 倾向过度谨慎，需要主动克服

### 9.9 持久化字段同时核对"即时写入源"和"刷新恢复源"

- **触发**：调试"改了下次刷新就丢"问题
- **流程**：检查 `useAppLifecycle.ts` 的保存 + 恢复两段是否都涵盖新字段；测试"键存在但值为空数组"场景
- **理由**：只补一边等于"功能能用，但用户清空数据后会被默认值覆盖"

### 9.10 历史功能名 / 旧入口语义不明确时先核对真实页面用途

- **触发**：用户说"修一下 X 页面"，但你看代码不确定 X 指哪个页面
- **错误做法**：猜一个页面动手
- **正确做法**：先 grep 真实路由 / 截图 / 用 dev server 实际访问，再动手
- **理由**：本项目有"公众号"、"信箱"、"论坛"这种容易混淆的功能名

### 9.11 新增功能页 / 表单页默认保持简约

- **触发**：加一个新页面 / 表单
- **要求**：首屏只放核心输入，可选参数折叠到"高级设置"
- **错误做法**：把所有可配置项一次性铺满
- **理由**：用户大多数情况不需要调高级项；初次见到一堆字段会放弃

### 9.12 AI 结果页必须考虑 Markdown 渲染、流式更新、加载态

- **触发**：写新 AI 结果展示页（占卜、AI 生成内容、聊天 AI 回复）
- **要求**：
  - Markdown 不能裸显示原始 `####`、`*` 等符号
  - 流式更新有视觉反馈（光标 / 进度）
  - 加载中明确（不能看起来像卡死）
- **理由**：用户分不清"AI 在思考"和"App 卡了"

### 9.13 占卜表单必须要求输入明确问题

- **触发**：占卜相关改动
- **要求**：除 `daily`（今日运势）外，所有占卜类型必须强制输入 `question`
- **删除占卜类型时**：同步清理类型枚举、默认值、校验、历史恢复、页面文案——**不能只删入口**
- **详见**：[`api.md`](api.md) §5

### 9.14 Markdown 渲染至少覆盖标题 1-6 级

- **触发**：写自定义 Markdown 渲染器（不用 react-markdown 等三方库时）
- **错误做法**：只覆盖 H1/H2，导致 `####` 裸显示
- **理由**：AI 生成内容大量使用 H4/H5 分段

### 9.15 自实现 Markdown 一次性覆盖块级 + 行内常见语法

- **触发**：同 9.14
- **必须覆盖**：标题、列表、引用、代码块、分隔线、链接、删除线、表格、行内 code、加粗、斜体
- **错误做法**：用户连续反馈"还少这种"、"还少那种"，每次只补一种
- **理由**：用户体验断崖；一次性覆盖成本远低于反复补

### 9.16 改动有真实阻塞时再请求确认，否则继续推进

- **触发**：执行过程中遇到不在原方案的问题
- **判断标准**：
  - 真实阻塞：依赖缺失 / 破坏性操作 / 严重偏离原方案 → 停下确认
  - 非阻塞：原方案小调整 / 命名分歧 / 局部优化 → 直接推进
- **理由**：与 9.8 互补，避免过度打断

## 10. 何时使用 / 不使用 worktree

worktree 不是默认工作流。**仅在用户明确说"用 worktree"或本文档明确指引时才用**。

普通工作流：

```bash
git checkout -b feat/some-feature
# 改代码
git commit
gh pr create
```

只有需要"同时维护两个分支的工作目录"时才用 worktree（罕见）。

## 11. 何时使用 EnterPlanMode

如果你是 Claude Code 等带 plan 模式的 AI：

- **该用**：多步骤架构改动、多文件迁移、引入新依赖、影响中枢文件
- **不必用**：单文件 typo、一行 bugfix、明确指令的局部改动

详细见 Claude Code 文档。

## 12. 何时调用 Agent / Task 工具（仅 AI 助手）

- **Explore Agent**：跨多文件的"哪里定义了 X"、"X 在哪些地方被使用"
- **Plan Agent**：超出当前对话能 hold 的复杂方案
- **Foreground vs Background**：Foreground 适用于"我需要它的结果继续"，Background 适用于"独立任务并行做"
- **避免在主对话和子代理之间重复劳动**

## 13. 何时改 docs/

- 改了中枢文件 → 同步更新 `project-map.md` 第 11 节
- 加了新持久化字段 → 同步更新 `state-and-persistence.md` 末尾"已知字段"
- 改了部署流程 → 同步更新 `pages-functions-deploy.md`；影响 APK 发布时同步 `README.md` / `mobile-compat.md`
- 加了新功能域 → 同步更新 `project-map.md` §5 速查表
- 加了新协作规则（被踩坑反复纠正过 3 次以上）→ 加到本文件 §9

## 14. 联系方式与升级路径

- 项目主仓：见 README
- 报 Bug：在 GitHub Issues
- 治理路线问题：见 [`audit-plan.md`](audit-plan.md)，按阶段提 Issue
- 文档错漏：直接改 PR；docs/ 下所有 .md 都接受 PR
