# Cloudflare Pages Functions 部署

这份文档对应当前仓库的 Cloudflare 迁移方案：**前端、动态接口和轻量后台都部署在 Cloudflare**，不再要求先起一套独立 Docker 后端。

## 1. 架构

- `Cloudflare Pages`：前端静态站点
- `Pages Functions`：`/api/*` 动态接口
- `D1`：AI 配置、口令、公告、赞助、APK 元数据、社区数据；每日额度只在前端本地记录，不写入服务端
- `R2`：社区封面图等对象资源
- `GitHub Actions + R2`：APK 自动构建、候选审核与文件分发

## 2. 已迁移接口

- `POST /api/proxy`
- `POST /api/divination`
- `GET /api/models`
- `GET /api/test`
- `GET /api/usage/status`
- `POST /api/verify-passphrase`
- `GET /api/team/notices`
- `GET /api/app/version`
- `GET /api/app/check-update`
- `GET/POST/... /api/community/*`
- `GET/PUT/DELETE/... /api/admin/*`

`POST /api/heartbeat` 和统计类接口在 Functions 版已废弃，保留的兼容入口会返回 `410`。

## 3. Pages 项目配置

1. Cloudflare Dashboard → Pages → Create project → Connect to Git
2. 选择仓库和分支
3. 构建配置：
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js version: `22`

仓库根目录的 `functions/` 会被自动识别为 Pages Functions。
仓库里的 [wrangler.toml](../wrangler.toml) 可以作为 Git 集成部署的配置来源，`pages_build_output_dir`、D1 和 R2 绑定都放这里维护；敏感值仍然放 Pages 项目的 Secrets。

## 4. Cloudflare 资源

至少需要创建这些资源并绑定到 Pages 项目：

- `D1` 数据库：建议绑定名 `APP_DB`
- `R2` 桶：建议绑定名 `COMMUNITY_BUCKET`

如果你暂时不启用社区封面图，`R2` 可以先不绑，但社区上传里的 `data:image/*` 封面将无法保存。

## 5. 环境变量

### 必填

```text
SYSHUO_API_URL=https://your-proxy.example.com/v1/chat/completions
SYSHUO_API_KEY=your-key
ADMIN_KEY=change-me
PREMIUM_TOKEN_SECRET=replace-with-a-long-random-string
```

### 占卜可选

```text
DIVINATION_API_URL=https://your-divination.example.com/api/v1/divination
DIVINATION_API_KEY=your-divination-key
```

### AI 行为可选

```text
BUILTIN_AI_MODELS=free/cc,free/grok-3-mini
BUILTIN_AI_DEFAULT_MODEL=free/cc
BUILTIN_AI_FALLBACK_MODEL=free/cc
BUILTIN_AI_DAILY_LIMIT=500
BUILTIN_AI_PREMIUM_DAILY_LIMIT=2000
BUILTIN_AI_MAX_CONTEXT_CHARS=50000
BUILTIN_AI_PROXY_TIMEOUT_MS=180000
BUILTIN_AI_RATE_LIMIT_MAX=20
BUILTIN_AI_RATE_LIMIT_WINDOW_MS=60000
```

### 跨域可选

```text
ALLOWED_ORIGINS=https://your-site.pages.dev,https://your-custom-domain.com
```

纯同域 Pages 部署通常不用单独填 `ALLOWED_ORIGINS`。

敏感值不要写进 `wrangler.toml`。当前仓库已经补了：

- [wrangler.toml](../wrangler.toml)
- [.dev.vars.example](../.dev.vars.example)

推荐这样设置 secret：

```bash
npx wrangler secret put SYSHUO_API_KEY
npx wrangler secret put DIVINATION_API_KEY
npx wrangler secret put ADMIN_KEY
npx wrangler secret put PREMIUM_TOKEN_SECRET
```

本地开发可以复制 `.dev.vars.example` 为 `.dev.vars` 再填值，`.gitignore` 已忽略。

## 5.1 从旧 Docker/SQLite 迁移数据

如果你手上有旧服务导出的 `data_*.tar.gz`，仓库已经带了完整迁移脚本：

```bash
npm run cf:migrate -- ./data_6LrFp.tar.gz
```

这会在本地私有目录 `.cloudflare-migrate/` 中完成四步：

1. 解压旧 `usage.db` 和 `uploads/`
2. 生成 D1 导入 SQL
3. 批量上传社区封面图到 `COMMUNITY_BUCKET`
4. 分批导入生产和预览 D1

如果你只想导入生产或预览，可以手动执行：

```bash
node scripts/migrate-cloudflare-from-tar.mjs ./data_6LrFp.tar.gz .cloudflare-migrate production
node scripts/migrate-cloudflare-from-tar.mjs ./data_6LrFp.tar.gz .cloudflare-migrate preview
```

## 6. D1 初始化

首次部署前，先在本地或 CI 执行一次 D1 schema 初始化。当前 schema 定义在：

- [cloudflare/pages-functions/data.js](../cloudflare/pages-functions/data.js)

如果你用 `wrangler` 管理 Pages 资源，推荐把建库和绑定一并纳入脚本化流程；至少要确保生产库首次收到请求时有权限执行 schema。

## 7. 前端环境变量

推荐：

- `VITE_SERVER_URL` 留空
- `VITE_API_BASE_URL` 留空

这样浏览器会优先走当前站点同域 `/api`。原生容器若未额外配置 `VITE_SERVER_URL` / `VITE_API_BASE_URL`，会默认回落到 `https://xushuo.cc/api`，让 APK 直接接到新的 Functions 后端。

## 8. 行为差异

当前 Functions 版和旧 Docker 后端相比，已经保留了主要前台能力，但有这些差异：

- 统计面板已移除
- `heartbeat` 已废弃
- 本地 APK 扫描流程已移除
- APK 文件本体推荐由 GitHub Actions 自动构建后上传到 R2
- 候选 APK 仍然需要后台手动“发布候选包”后才会下发给用户
- AI 权限只区分“普通次数 / 高级次数”，不再区分免费模型和高级模型

## 9. 部署后验证

按这个顺序验收：

1. 打开站点，进入 AI 设置，确认 `/api/models` 正常返回模型。
2. 点击“检测模型连接”，确认 `/api/test` 和 `/api/proxy` 正常。
3. 在后台验证口令保存、AI 配置保存。
4. 打开团队页，确认公告、赞助加载成功。
5. 打开社区页，确认列表、上传、点赞、举报、删除都工作。
6. Android 端检查 `/api/app/check-update` 返回的下载地址是否指向 R2 公网域名。
