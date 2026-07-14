# 开发者 API（v1）

本文档描述本项目对外开放的开发者 API，用于生成占卜数据并由 AI 输出解读（支持 SSE 流式）。

> 这是**对外开放的接口文档**，使用者是第三方开发者；内部前端调用见 `src/services/divinationService.ts`。

## 目录

- [1. 基础信息](#1-基础信息)
- [2. 鉴权](#2-鉴权)
- [3. 通用约定](#3-通用约定)
- [4. 错误模型与状态码](#4-错误模型与状态码)
- [5. 接口：POST /api/v1/divination](#5-接口post-apiv1divination)
- [6. 错误码与含义](#6-错误码与含义)
- [7. curl 测试用例](#7-curl-测试用例)
- [8. 客户端集成示例](#8-客户端集成示例)
- [9. 常见问题与最佳实践](#9-常见问题与最佳实践)
- [10. 版本与变更](#10-版本与变更)

## 1. 基础信息

| 项 | 值 |
| --- | --- |
| Base URL | `https://sydf.cc` |
| API 版本前缀 | `/api/v1` |
| 完整入口 | `https://sydf.cc/api/v1/divination` |
| 时区 | 后端固定按 **北京时间（UTC+8）** 进行排盘 / 干支 / 节气相关计算 |
| 解读语言 | 固定 **简体中文**（不可切换） |
| 协议 | HTTPS only（HTTP 会被 301 跳转） |

## 2. 鉴权

本 API 使用单个 Key 进行鉴权（项目方分配）。客户端请求头**二选一**：

```http
Authorization: Bearer <DEV_API_KEY>
```

或：

```http
X-Api-Key: <DEV_API_KEY>
```

**Key 不能放在 URL query**——会被代理日志记录、被浏览器 history 留存。

## 3. 通用约定

### 3.1 内容协商

- 请求体：`Content-Type: application/json`（必须 UTF-8）
- 非流式响应：`Content-Type: application/json; charset=utf-8`
- 流式响应：`Content-Type: text/event-stream; charset=utf-8`

### 3.2 时间格式

| 字段 | 格式 |
| --- | --- |
| `options.datetime` | ISO 8601，**建议带时区偏移**，例 `2026-03-16T12:00:00+08:00`。无偏移时按北京时间解释 |
| `options.date` | `YYYY-MM-DD`，不带时区 |

### 3.3 字符串规范化

- `question` 会经过空白合并（连续多个空格压缩为一个）
- 长度建议 ≤ 200 字符；超过部分可能被截断
- 不接受零宽字符 / Unicode bidi 控制字符

### 3.4 请求 ID

- 每次请求服务端会分配 `requestId`，在响应中返回
- 客户端可在请求头加 `X-Request-Id: <自定义 ID>` 用于自定义跟踪
- 排查问题时请提供 `requestId`，否则后端无法定位日志

## 4. 错误模型与状态码

### 4.1 状态码语义

| HTTP | 含义 |
| --- | --- |
| 200 | 请求处理完成（流式模式下 200 + `event: error` 也算"完成但失败"） |
| 400 | 请求体格式错 / 参数缺失 / 占卜数据生成失败 |
| 401 | Key 无效或缺失 |
| 429 | 触发限流（IP / Key / 全局） |
| 500 | 服务端内部异常（应被立即修复） |
| 502 | AI 上游不可用 |

### 4.2 错误响应结构

非流式：

```json
{
  "ok": false,
  "requestId": "req_2025xxxxxxxxxx",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API Key 无效或缺失",
    "details": {}
  }
}
```

流式：

```text
event: error
data: {"requestId":"req_xxx","code":"AI_REQUEST_FAILED","message":"上游超时"}
```

### 4.3 限流策略

- 维度：每个 Key + 客户端 IP
- 默认窗口：60 秒
- 默认配额：每 Key 60 次 / 分钟、每 IP 30 次 / 分钟
- 超限：HTTP 429，响应头含 `Retry-After: <秒数>`
- **不要在客户端硬编码重试间隔**——读 `Retry-After`，并加抖动

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
Content-Type: application/json

{"ok": false, "error": {"code": "RATE_LIMITED", "message": "请求过于频繁"}}
```

### 4.4 重试建议

- 401 / 400：**不要重试**，是请求本身的问题
- 429：按 `Retry-After` 等待 + 随机抖动
- 502：指数退避（1s → 2s → 4s …）最多 3 次；流式模式下 SSE 错误事件也按此处理
- 网络错误（DNS / TCP）：指数退避 + 最多 3 次

## 5. 接口：POST `/api/v1/divination`

一个统一接口覆盖所有占卜类型：

| `type` | 中文名 | `question` | 备注 |
| --- | --- | --- | --- |
| `daily` | 今日运势（日家奇门） | 不需要 | 可选 `options.date` |
| `liuyao` | 六爻 | 必填 | `options.method`（default / random / number） |
| `meihua` | 梅花易数 | 必填 | `options.method`、`divinationNumber` |
| `qimen` | 奇门遁甲（转盘法） | 必填 | `options.datetime` |
| `ssgw` | 三山国王灵签 | 必填 | `options.signNumber` 不传则随机 |
| `tarot` | 塔罗（多牌阵） | 必填 | `options.spreadType` 默认 `three` |
| `tarot_single` | 塔罗（单牌） | 必填 | 无额外参数 |

### 5.1 请求头

```http
POST /api/v1/divination HTTP/1.1
Host: sydf.cc
Content-Type: application/json
Authorization: Bearer <DEV_API_KEY>
Accept: application/json    # 或 text/event-stream（流式）
```

### 5.2 请求体（JSON）

```json
{
  "type": "liuyao",
  "question": "我最近换工作是否顺利？",
  "stream": true,
  "debug": false,
  "options": {
    "datetime": "2026-03-16T12:00:00+08:00",
    "method": "default",
    "divinationNumber": 123,
    "spreadType": "three",
    "signNumber": 8,
    "date": "2026-03-16",
    "temperature": 0.7,
    "supplementaryInfo": {
      "gender": "男",
      "birthYear": 1990,
      "interpretationStyle": "专业",
      "outputLength": "详细"
    }
  }
}
```

#### 顶级字段

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `type` | ✅ | string | 占卜类型，见上表 |
| `question` | 部分 | string | 除 `daily` 外必填；最多 200 字符 |
| `stream` | ❌ | boolean | 是否使用 SSE 流式输出，默认 `false` |
| `debug` | ❌ | boolean | 是否返回 / 推送调试信息（prompt / raw），默认 `false`。可能体积大、含敏感信息 |
| `options` | ❌ | object | 各类型专用参数 |

#### `options` 字段

| 字段 | 适用类型 | 类型 | 说明 |
| --- | --- | --- | --- |
| `datetime` | 通用 | ISO 8601 | 指定起卦 / 排盘时间，建议带 `+08:00` |
| `method` | `liuyao` / `meihua` / `qimen` | enum | `default` \| `random` \| `number` |
| `divinationNumber` | `meihua` / `liuyao` | int | `method=number` 时必填 |
| `date` | `daily` | `YYYY-MM-DD` | 不传默认今天（北京时间） |
| `signNumber` | `ssgw` | int 1–100 | 不传则随机抽签 |
| `spreadType` | `tarot` | enum | 见 §5.2.1 |
| `temperature` | 通用 | number | 0–1，传给 AI 的 temperature；超出范围会被截断 |
| `supplementaryInfo` | 通用 | object | 影响解读风格 / 长度 |

#### 5.2.1 `tarot.spreadType` 可用值

与项目内置牌阵一致：

```text
single        - 单牌
three         - 过去-现在-未来
love          - 爱情牌阵
career        - 事业牌阵
decision      - 决断牌阵
celtic        - 凯尔特十字
chakra        - 七脉轮
year          - 年度十二宫
mindBodySpirit - 身心灵
horseshoe     - 马蹄形
```

#### 5.2.2 `supplementaryInfo` 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `gender` | string | "男" / "女" / "其他"，影响人称指代 |
| `birthYear` | int | 1900–当前年，用于推算年龄段 |
| `interpretationStyle` | enum | "专业" / "通俗" / "诙谐" / "诗意" |
| `outputLength` | enum | "简短" / "标准" / "详细" |

### 5.3 非流式响应（`stream: false`）

#### 成功

```json
{
  "ok": true,
  "requestId": "req_xxxx",
  "type": "liuyao",
  "divination": {
    // 排盘数据，结构因 type 而异
    "yao": ["阴", "阳", "阴", "阳", "阴", "阳"],
    "stems": "甲子", "branches": "乙丑",
    "...": "更多字段"
  },
  "interpretation": "AI 解读文本（Markdown 格式）",
  "usage": {
    "promptTokens": 850,
    "completionTokens": 1200,
    "totalTokens": 2050
  }
}
```

#### 失败示例

```json
{
  "ok": false,
  "requestId": "req_xxxx",
  "error": {
    "code": "DIVINATION_FAILED",
    "message": "数字起卦需要 divinationNumber",
    "details": { "expectedRange": [1, 9999] }
  }
}
```

### 5.4 流式响应（`stream: true`，SSE）

返回 `Content-Type: text/event-stream`。

事件顺序：

1. 服务端先发送 `event: meta`（包含占卜数据与 requestId）
2. 随后透传 OpenAI 兼容的 `data: {choices}` 流式数据，最后 `data: [DONE]`
3. 若发生错误，会发送 `event: error` 并关闭连接

完整事件流示例：

```text
event: meta
data: {"requestId":"req_xxx","type":"liuyao","divination":{...排盘...}}

data: {"id":"chat-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"## "},"index":0}]}

data: {"id":"chat-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"卦象解读\n\n"},"index":0}]}

data: {"id":"chat-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"本次得卦"},"index":0}]}

data: {"id":"chat-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."},"index":0}]}

data: [DONE]
```

错误时：

```text
event: meta
data: {"requestId":"req_xxx","type":"liuyao","divination":{...}}

event: error
data: {"requestId":"req_xxx","code":"AI_REQUEST_FAILED","message":"上游 502"}
```

注意：

- `EventSource`（浏览器原生 SSE）**仅支持 GET**，无法直接用于本 POST SSE 接口。请使用 `fetch()` + `ReadableStream` 自行解析（见 §8.2）
- 流式模式下，即使 AI 报错，HTTP 状态也是 200。**不要靠 HTTP code 判定是否成功**——必须解析 `event: error`
- `[DONE]` 是字符串字面量，不是 JSON。解析时单独判断
- 服务端心跳：每 15 秒发送一个空注释行 `:keepalive`，客户端可忽略

## 6. 错误码与含义

| `code` | HTTP | 含义 | 客户端处理 |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | 401 | 未提供 Key 或 Key 不匹配 | 检查 Key，**不要重试** |
| `BAD_REQUEST` | 400 | 请求体不是 JSON / 参数缺失 / 类型错误 | 修请求，**不要重试** |
| `DIVINATION_FAILED` | 400 | 生成占卜数据失败（数字起卦超范围、日期非法等） | 修参数 |
| `RATE_LIMITED` | 429 | 触发限流 | 按 `Retry-After` 等待 |
| `AI_REQUEST_FAILED` | 502 | 请求 AI 代理失败 | 指数退避重试 |
| `AI_ERROR` | 502 / SSE error | AI 代理返回非 2xx | 指数退避重试 |
| `AI_BAD_RESPONSE` | 502 / SSE error | AI 返回格式不符合预期 | 指数退避重试 |
| `STREAM_ERROR` | SSE error | SSE 读取过程中发生异常 | 重新发起请求 |

## 7. curl 测试用例

### 7.1 六爻（非流式，default 起卦法）

```bash
curl -s https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DEV_API_KEY>" \
  -d '{
    "type": "liuyao",
    "question": "我最近换工作是否顺利？",
    "stream": false,
    "options": {
      "method": "default",
      "supplementaryInfo": { "outputLength": "详细" }
    }
  }'
```

### 7.2 今日运势（指定日期）

```bash
curl -s https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "daily",
    "stream": false,
    "options": { "date": "2026-03-16" }
  }'
```

### 7.3 塔罗（三牌阵，流式）

```bash
curl -N https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "tarot",
    "question": "我和 TA 的关系接下来会如何发展？",
    "stream": true,
    "options": { "spreadType": "three" }
  }'
```

`-N` 关键，禁用 curl 缓冲，让 SSE 实时输出。

### 7.4 梅花易数（数字起卦）

```bash
curl -s https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "meihua",
    "question": "今年事业能否有突破？",
    "stream": false,
    "options": {
      "method": "number",
      "divinationNumber": 384,
      "supplementaryInfo": {
        "interpretationStyle": "专业",
        "outputLength": "标准"
      }
    }
  }'
```

### 7.5 三山国王灵签（指定签号）

```bash
curl -s https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "ssgw",
    "question": "近期出行是否平安？",
    "stream": false,
    "options": { "signNumber": 38 }
  }'
```

### 7.6 奇门遁甲（指定时间）

```bash
curl -s https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "qimen",
    "question": "本月健康状态如何？",
    "stream": false,
    "options": {
      "datetime": "2026-03-16T08:30:00+08:00",
      "supplementaryInfo": { "gender": "女", "birthYear": 1995 }
    }
  }'
```

### 7.7 塔罗单牌（流式）

```bash
curl -N https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "tarot_single",
    "question": "今天该专注什么？",
    "stream": true
  }'
```

### 7.8 调试模式（非流式）

```bash
curl -s https://sydf.cc/api/v1/divination \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <DEV_API_KEY>" \
  -d '{
    "type": "liuyao",
    "question": "测试用",
    "stream": false,
    "debug": true,
    "options": { "method": "random" }
  }' | jq '.debug'
```

`debug: true` 会在响应中返回 `prompt`（送给 AI 的 prompt）、`raw`（AI 原始响应）等字段，用于排查问题。**不要在生产上长期开启**——体积大、含敏感数据。

## 8. 客户端集成示例

### 8.1 Node.js 非流式

```ts
async function divine() {
  const res = await fetch('https://sydf.cc/api/v1/divination', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEV_API_KEY}`
    },
    body: JSON.stringify({
      type: 'liuyao',
      question: '今年财运如何？',
      stream: false,
      options: { method: 'default' }
    })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error.message);
  console.log(json.interpretation);
}
```

### 8.2 浏览器 / Node.js 流式（fetch + ReadableStream）

```ts
async function divineStream(onChunk: (text: string) => void) {
  const res = await fetch('https://sydf.cc/api/v1/divination', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      type: 'tarot',
      question: '...',
      stream: true,
      options: { spreadType: 'three' }
    })
  });
  if (!res.body) throw new Error('no stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let meta: any = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE 按 \n\n 分割事件
    const events = buf.split('\n\n');
    buf = events.pop() || '';   // 最后一段可能不完整，留到下一轮

    for (const evt of events) {
      const lines = evt.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      if (event === 'meta') {
        meta = JSON.parse(data);
        continue;
      }
      if (event === 'error') {
        const err = JSON.parse(data);
        throw new Error(`${err.code}: ${err.message}`);
      }
      if (data === '[DONE]') return meta;
      try {
        const chunk = JSON.parse(data);
        const piece = chunk.choices?.[0]?.delta?.content;
        if (piece) onChunk(piece);
      } catch {
        // 忽略心跳 / 注释行
      }
    }
  }
  return meta;
}
```

### 8.3 Python（requests，非流式）

```python
import requests
import os

resp = requests.post(
    'https://sydf.cc/api/v1/divination',
    headers={
        'Content-Type': 'application/json',
        'X-Api-Key': os.environ['DEV_API_KEY'],
    },
    json={
        'type': 'liuyao',
        'question': '近期换工作是否顺利？',
        'stream': False,
        'options': {'method': 'default'}
    },
    timeout=60,
)
data = resp.json()
if not data['ok']:
    raise RuntimeError(data['error']['message'])
print(data['interpretation'])
```

### 8.4 Python（httpx，流式）

```python
import httpx
import json

with httpx.Client(timeout=120.0) as c:
    with c.stream(
        'POST',
        'https://sydf.cc/api/v1/divination',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {API_KEY}",
            'Accept': 'text/event-stream',
        },
        json={
            'type': 'tarot',
            'question': '...',
            'stream': True,
            'options': {'spreadType': 'three'}
        },
    ) as resp:
        buffer = ''
        for chunk in resp.iter_text():
            buffer += chunk
            while '\n\n' in buffer:
                evt, buffer = buffer.split('\n\n', 1)
                lines = evt.split('\n')
                event = 'message'
                data = ''
                for line in lines:
                    if line.startswith('event:'):
                        event = line[6:].strip()
                    elif line.startswith('data:'):
                        data += line[5:].strip()
                if not data:
                    continue
                if event == 'meta':
                    meta = json.loads(data)
                    print('meta:', meta['requestId'])
                elif event == 'error':
                    raise RuntimeError(json.loads(data))
                elif data == '[DONE]':
                    print('done')
                else:
                    obj = json.loads(data)
                    delta = obj['choices'][0]['delta'].get('content', '')
                    print(delta, end='', flush=True)
```

## 9. 常见问题与最佳实践

### 9.1 `stream: true` 但收到 JSON 而非 SSE？

检查 `Accept` 请求头是否带 `text/event-stream`，并确认服务端没有被中间代理缓冲。

### 9.2 SSE 在 Cloudflare / Nginx 后断流

中间代理可能在静默期超过 60 秒后切断连接。客户端应捕获网络错误并重连；服务端心跳每 15 秒会发 `:keepalive`，正常代理不会断。

### 9.3 占卜结果的 Markdown 渲染

服务端返回的 `interpretation` 是 Markdown，至少覆盖：标题（H1–H6）、列表、引用、加粗 / 斜体 / 删除线、代码块、分隔线、链接、表格。客户端渲染必须**全部支持**，否则用户会看到 `####` 等裸符号。

### 9.4 时间敏感的 `qimen` / `liuyao`

奇门遁甲与六爻的排盘结果**与时间强相关**。如果你想复现某次结果，必须保留 `options.datetime` 一致；服务端**不会**给同一时间同一问题相同的解读，但排盘数据会一致。

### 9.5 `daily` 跨日的处理

`daily` 类型的"今天"按**北京时间**判断。如果你的客户端在其他时区，建议显式传 `options.date`。

### 9.6 用户匿名化

请求中**不要**传用户真实姓名 / 身份证 / 联系方式。`question` 字段可能进入 AI 训练日志（取决于上游配置）。

### 9.7 调试 `requestId`

每个请求都返回 `requestId`，建议客户端把 `requestId` + `question` 保存到本地。出问题联系项目方时一并提供。

## 10. 版本与变更

### v1.0（当前）

- 7 种占卜类型
- 流式 / 非流式双模式
- 北京时间排盘
- 简体中文解读

### 兼容性承诺

- 字段**只增不删**（如需移除会先标记 deprecated 至少 90 天）
- 新增字段默认值不会破坏旧客户端
- 错误码列表只增，已有 `code` 不会改语义
- 限流默认值如果调整会提前公告

### 升级路径

未来可能的 v2 版本会启用新的 base path `/api/v2/`；v1 至少**维护到 v2 GA 后 180 天**。

---

如有问题，提供 `requestId` 联系项目方。
