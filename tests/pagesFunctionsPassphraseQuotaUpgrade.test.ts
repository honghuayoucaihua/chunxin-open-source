import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => {
  const usageRecords: any[][] = [];
  const dailyUsageSql: string[] = [];
  const passphrase = {
    id: 'pp_quota',
    phrase: '提升额度',
    limit: 20,
    valid_days: 7,
    phrase_expires_days: null,
    max_uses: null,
    max_uses_per_user: null,
    is_active: 1,
    created_at: Date.now()
  };

  return {
    usageRecords,
    dailyUsageSql,
    prepare(sql: string) {
      if (sql.includes('daily_usage')) {
        dailyUsageSql.push(sql);
      }

      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active, created_at FROM passphrases WHERE phrase = ? AND is_active = 1 LIMIT 1')) {
                return String(params[0] || '') === passphrase.phrase ? passphrase : null;
              }
              if (sql.includes('SELECT COUNT(*) AS total FROM passphrase_usage')) {
                return { total: 0 };
              }
              if (sql.includes('SELECT value FROM app_settings WHERE key = ? LIMIT 1')) {
                return null;
              }
              return null;
            },
            async run() {
              if (sql.includes('INSERT INTO passphrase_usage')) {
                usageRecords.push(params);
              }
              return { success: true };
            },
            async all() {
              return { results: [] };
            }
          };
        },
        async run() {
          return { success: true };
        },
        async all() {
          return { results: [] };
        }
      };
    }
  };
};

{
  const db = createMockDb();
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/verify-passphrase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': 'client-a'
      },
      body: JSON.stringify({
        passphrase: '提升额度',
        clientId: 'client-a'
      })
    }),
    env: {
      APP_DB: db,
      PREMIUM_TOKEN_SECRET: 'test-secret',
      BUILTIN_AI_DAILY_LIMIT: '5'
    }
  } as any);

  assert.equal(response.status, 200, '有效口令应兑换成功');
  const body = await response.json();
  assert.equal(body.success, true, '响应应标记兑换成功');
  assert.equal(typeof body.token, 'string', '兑换成功应返回高级凭证');
  assert.equal(body.premiumLimit, 20, '响应应返回口令提升后的每日上限');
  assert.equal(body.usage.limit, 20, 'usage 中应包含提升后的每日上限');
  assert.equal(body.usage.remaining, 20, '后端只返回新上限，不计算用户本地已用次数');
  assert.equal(body.usage.isPremium, true, 'usage 应标记高级状态');
  assert.equal(body.usage.serverTracked, false, '兑换后的额度仍应由前端本地统计');
  assert.equal(db.usageRecords.length, 1, '口令兑换次数限制仍应记录兑换行为');
  assert.equal(db.dailyUsageSql.length, 0, '兑换口令不应读写服务端每日使用次数表');
}

console.log('测试通过：口令兑换只提升本地每日上限，不恢复服务端每日额度统计。');
