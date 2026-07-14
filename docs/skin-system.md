# 皮肤系统

本文档讲清楚"叙说·春信"的皮肤是怎么定义的、怎么切换的、改动时要保留什么。新做基础组件统一时务必先读 §6。

> 配套阅读：[`project-map.md`](project-map.md) §10 / §11、[`agents.md`](agents.md) "基础组件统一" 条。

## 1. 设计目的

不同皮肤模仿不同 IM 产品的视觉语言（微信、QQ、Telegram、KakaoTalk、iMessage、Y2K 复古、Noir 暗黑、Liquid Glass …）。皮肤决定**整套视觉风格**，包括：

- 颜色、字号、行高、圆角。
- 顶部栏 / 底部 Tab / 列表项 / 输入框 / 聊天气泡的尺寸与形态。
- 头像形状、消息时间显示策略、是否显示已读状态。
- 桌面侧边栏的宽度与图标大小。

不是简单的"黑色模式 / 白色模式"——是**整套布局参数**。这就要求新加的 UI 组件不能写死任何皮肤特征，必须读 render config。

## 2. 顶层结构

```mermaid
flowchart TB
  Settings[AppearanceSettings<br/>renderSkinId + renderConfig 覆盖] --> Engine[render-engine.ts]
  Engine --> Skins[BUILT_IN_RENDER_SKINS<br/>render-schema.ts]
  Engine --> DarkColors[DARK_SKIN_COLORS]
  Skins --> Cfg[AppRenderConfig<br/>合并完成]
  Engine --> Apply[applyRenderConfigToRoot<br/>写 CSS 变量到 :root]
  Apply --> CSS[全局 CSS 变量]
  CSS --> Comp[组件读 var(--render-xxx)]
```

主要类型（`src/render-schema.ts`）：

```ts
export type BuiltInSkinId =
  | 'wechat' | 'qq' | 'telegram' | 'kakao'
  | 'retro' | 'polkadot' | 'pixel' | 'rose'
  | 'noir' | 'y2k' | 'imessage' | 'liquidglass';

export interface AppRenderConfig {
  skinId: BuiltInSkinId;
  skinName: string;
  colors: RenderColors;
  typography: { fontSize, lineHeight, ... };
  radius: { ... };
  layout: { ... };
  header: HeaderRenderConfig;
  tabs: TabBarRenderConfig;
  list: ListRenderConfig;
  input: InputRenderConfig;
  desktopSidebar: DesktopSidebarRenderConfig;
  chat: ChatRenderConfig; // bubble + meta
}
```

12 个内置皮肤的完整定义都在 `src/render-schema.ts` 的 `BUILT_IN_RENDER_SKINS` 大对象中。每个皮肤是一个 `AppRenderConfig` 实例，逐字段可覆盖。

## 3. 用户配置层

```ts
// AppearanceSettings 字段（src/types/settings.ts）
{
  renderSkinId: BuiltInSkinId;        // 选哪一个内置
  renderConfig?: Partial<AppRenderConfig>;  // 用户自定义覆盖
  themeMode: 'light' | 'dark' | 'auto';     // 暗色策略
  // 19 个 advanced color overrides:
  primaryBgColor, secondaryBgColor, tertiaryBgColor, ...
  // 详见 src/settings/skinConstants.ts ADVANCED_COLOR_KEYS
}
```

合并优先级（`render-engine.ts/resolveRenderConfig`）：

```
内置皮肤 BUILT_IN_RENDER_SKINS[skinId]
   ↓ 浅 spread
   + override.colors
   + override.typography
   + override.radius
   + override.layout
   + override.header / tabs / list / input / desktopSidebar
   + override.chat (含 bubble.* 和 meta.*)
```

暗色策略（`shouldUseDarkColors`）：

- `themeMode = 'dark'` → 强制暗。
- `themeMode = 'light'` → 强制亮。
- `themeMode = 'auto'` → 跟随系统 `prefers-color-scheme`。

暗色匹配（`resolveThemeColors`）：从 `DARK_SKIN_COLORS[skinId]` 取整套暗色 colors，覆盖到 `cfg.colors`。**找不到就回落到 `DARK_SKIN_COLORS.wechat`**。

## 4. 注入到 DOM

```ts
// render-engine.ts
export const applyRenderConfigToRoot = (settings: AppearanceSettings): AppRenderConfig => {
  const cfg = resolveRenderConfig(settings);
  const colors = resolveThemeColors(settings, cfg);
  // 把所有字段写进 :root 的 CSS 变量
  document.documentElement.style.setProperty('--render-color-accent', colors.accent);
  // ... 数十个变量
  return cfg;
};
```

调用点：`src/App.tsx` 启动时和 `useAppLifecycle` 在 `settings` 变化时各调一次。

CSS 变量命名约定：

- 颜色：`--render-color-<key>`
- 排版：`--render-font-size`、`--render-line-height`
- 圆角：`--render-radius-<part>`
- 布局：`--render-layout-<part>`
- 顶栏：`--render-header-<key>`
- Tab：`--render-tab-<key>`
- 输入：`--render-input-<key>`
- 桌面侧边栏：`--render-desktop-sidebar-<key>`
- 聊天：`--render-chat-<key>`、`--render-chat-bubble-<key>`、`--render-chat-meta-<key>`

> 组件**不要直接写颜色**。即使是临时灰色，也应该用 `var(--render-color-textTertiary)` 或类似变量。

## 5. 高级覆盖与 DIY

| 类型 | 入口 | 优先级 |
| --- | --- | --- |
| 切换内置皮肤 | `SkinSettingsView.tsx → PresetTab` | 最低（提供基底） |
| 修改主题色 | `PresetTab` 12 个 `THEME_COLOR_PRESETS` 一键 | 修改 `renderConfig.colors.accent + bubbleMe + bubbleTextMe` |
| 自定义颜色 | `CustomTab.tsx`，逐字段 | 写进 `renderConfig.colors` |
| 高级覆盖（19 个 key） | `AdvancedTab.tsx` | 写进 `AppearanceSettings` 顶层字段（与 renderConfig 平级），优先级**高于** renderConfig.colors。这是历史遗留，现在仍兼容 |
| 字体 / 圆角 / 布局 | `AdvancedTab.tsx` 内子组 | 写进 `renderConfig.<part>` |
| 聊天气泡尺寸 | `ChatTab.tsx` | 写进 `renderConfig.chat.bubble` |
| 图标替换 | `IconTab.tsx`，169+ 个 FA icon 可换 | 写进 `iconOverrides`（与 renderConfig 分离） |
| 整套主题导入导出 | `SkinSettingsView.tsx` 顶部菜单 | 通过 `skinThemeUtils.normalizeImportedTheme` 校验 |

DIY 主题数据结构 `DIYThemePreset`（`src/types/...` 或 `src/render-schema.ts`，由 `cloneRenderConfig` + `upsertTheme` 管理）：

```ts
{
  id: string;
  name: string;
  basedOn: BuiltInSkinId;       // 基底皮肤
  config: AppRenderConfig;       // 完整快照（不是 partial）
}
```

存储在 `AppearanceSettings.diyThemes` 中，用户可命名、保存多个。

## 6. 基础组件统一原则（**重要**）

> 这一节是 [`agents.md`](agents.md) 反复强调的红线。

### 6.1 抽语义骨架，不抹平视觉

错误示范 ❌：

```tsx
// 想统一所有"卡片"组件，于是写了一个固定圆角和阴影的 Card
function Card({ children }) {
  return <div className="rounded-lg shadow-md p-4 bg-white">{children}</div>;
}
```

问题：

- Y2K 皮肤的卡片应该是大圆角 + 渐变 + 描边，不是圆角小阴影。
- Noir 皮肤的卡片是无圆角 + 单像素白边 + 黑底。
- 微信卡片是 8px 圆角 + 1px 边框 + 几乎无阴影。

正确做法 ✅：

```tsx
// 抽变体接口，皮肤通过 CSS 变量决定视觉
function Card({ children, variant = 'default' }) {
  return <div className={`render-card render-card--${variant}`}>{children}</div>;
}
```

```css
.render-card {
  border-radius: var(--render-radius-card, 8px);
  background: var(--render-card-bg, var(--render-color-bgSecondary));
  border: var(--render-card-border, 1px solid var(--render-color-border));
  box-shadow: var(--render-card-shadow, none);
  padding: var(--render-card-padding, 16px);
}
```

### 6.2 保留个性

需要保留的视觉特征：

- **圆角**（每套皮肤可能差异很大，从 0 到 28）
- **尺寸**（Y2K 比微信普遍大 10–20%）
- **留白**（iMessage 比 Telegram 紧凑得多）
- **特殊布局**（Pixel 皮肤是像素风等宽字体，行高不同；Liquid Glass 用半透明叠加）
- **皮肤特征**（Noir 是单色白边，Polkadot 是波点背景；这些不是 bug，是设计）

### 6.3 检查清单

新做"统一组件"前问自己：

1. 我抽的是**结构**（按钮 / 卡片 / 列表项）还是**视觉**（圆角 16 / 阴影 / 蓝色）？后者不要抽。
2. 我能不能让现有的 12 个皮肤在切换时**视觉差异保留**？如果切换后看不出区别，就说明抽错了。
3. 我有没有写死颜色 / 圆角 / 字体？应该全部走 `var(--render-*)`。
4. 我有没有覆盖 `Noir` / `Y2K` / `Liquid Glass` 这些极端皮肤的特殊处理？这些往往不是默认值能 cover 的。

## 7. 关键文件速查

| 文件 | 职责 |
| --- | --- |
| `src/render-schema.ts` | 12 套内置皮肤定义 + 类型 |
| `src/render-engine.ts` | resolveRenderConfig / applyRenderConfigToRoot / 暗色策略 |
| `src/settings/SkinSettingsView.tsx` | 设置页主入口 |
| `src/settings/skin/PresetTab.tsx` | 12 套内置切换 + 主题色一键 |
| `src/settings/skin/CustomTab.tsx` | 颜色自定义 |
| `src/settings/skin/AdvancedTab.tsx` | 19 个高级覆盖 + 字体 / 圆角 / 布局 |
| `src/settings/skin/ChatTab.tsx` | 聊天气泡专属设置 |
| `src/settings/skin/IconTab.tsx` | 图标替换 |
| `src/settings/skin/colorMixUtils.ts` | 颜色混合 / hex/rgba 转换 |
| `src/settings/skin/SkinPanelPrimitives.tsx` | 设置面板内部基础组件 |
| `src/settings/skinConstants.ts` | `COLOR_KEYS`、`THEME_COLOR_PRESETS`、`ADVANCED_COLOR_KEYS`、`META_TEXT_COLOR_KEYS`、`ICON_ITEMS` |
| `src/settings/skinThemeUtils.ts` | `cloneRenderConfig`、`upsertTheme`、`normalizeImportedTheme`、`parseCssFromAIText` |
| `src/shell/SkinIcon.tsx` | 皮肤切换菜单显示 |

## 8. 测试

| 测试文件 | 关注点 |
| --- | --- |
| `tests/legacyUiPrimitiveUsage.test.ts` | 老组件没有被替换为不带变体的硬编码版 |
| `tests/momentSettingVariants.test.ts` | 朋友圈卡片在不同皮肤下变体生效 |
| `tests/momentStyleVariants.test.ts` | 朋友圈样式变体 |
| `tests/forumMomentPrimitives.test.ts`、`forumMusicVariants.test.ts` | 论坛 / 音乐变体 |
| `tests/musicPrimitives.test.ts` | 音乐组件原语 |
| `tests/selectionPrimitives.test.ts` | 选择类组件变体 |
| `tests/skinMenuPositionRegression.test.ts` | 皮肤菜单定位回归 |
| `tests/noirMenuTheme.test.ts` | Noir 主题菜单专项 |
| `tests/tailwindLocalCompileSetup.test.ts` | Tailwind 配置只扫 src/，不漏皮肤层 |

## 9. 暗色模式陷阱

`DARK_SKIN_COLORS` 字典每个皮肤一份独立的暗色配色，**不是 `cfg.colors` 的反相**。这是为了让 Y2K 暗色不会因为简单反相变得难看，由设计师手工调过。

如果要新增内置皮肤：

1. 在 `BUILT_IN_RENDER_SKINS` 加亮色版本。
2. 在 `DARK_SKIN_COLORS` 加暗色版本（**必须，否则 fall back 到 wechat 暗色看起来很怪**）。
3. 测：`themeMode='auto'` 切换系统 dark 时观察是否仍美观。

## 10. 自定义 CSS 透传（AI 生成的样式）

`SkinSettingsView` 提供"从 AI 描述生成 CSS"功能，由 `skinThemeUtils.parseCssFromAIText` 解析。这是为了让用户用自然语言"我想要更复古的感觉，背景偏黄"，AI 返回 CSS 片段，前端解析进 `renderConfig.colors` 等结构化字段。

> 不要直接 inject 任意 CSS string——`parseCssFromAIText` 限制只接受白名单属性，避免 XSS。新加 AI 生成皮肤入口时一定要走这个解析器。

## 11. 排查指引

| 现象 | 先看哪里 |
| --- | --- |
| 切换皮肤后某组件还是旧色 | 该组件是否硬编码颜色，没读 `var(--render-color-*)` |
| 暗色模式下颜色不对 | `DARK_SKIN_COLORS[skinId]` 是否定义；不要在组件层判断 dark |
| Noir 皮肤白边丢了 | 组件是否覆盖了 `border` / `outline` 而没有提供变体 |
| Liquid Glass 半透明背景看不见 | 组件是否在外层加了不透明 `background-color`，覆盖了透明效果 |
| 设置里颜色改了不生效 | `applyRenderConfigToRoot` 调用时机；检查 `useAppLifecycle` 监听 settings 是否触发 |
| AI 生成主题导入失败 | `normalizeImportedTheme` 校验失败；检查必填字段 |
| 桌面模式下侧边栏宽度异常 | `desktopSidebar.width` 是否在新皮肤里漏定义 |
