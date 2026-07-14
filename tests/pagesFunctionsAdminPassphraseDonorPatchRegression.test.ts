import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import {
  updateDonor,
  updatePassphrase
} from '../cloudflare/pages-functions/data.js';

const existingPassphraseRow = {
  id: 'pp_1',
  phrase: '旧口令',
  limit: 888,
  valid_days: 30,
  phrase_expires_days: null,
  max_uses: null,
  max_uses_per_user: null,
  is_active: 0
};

const existingDonorRow = {
  id: 'donor_1',
  name: '旧赞赏者',
  amount: '66',
  message: '旧留言',
  date: '2026-05-01'
};

{
  const updates: Array<any[]> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active FROM passphrases WHERE id = ? LIMIT 1')) {
                return existingPassphraseRow;
              }
              if (sql.includes('UPDATE passphrases SET') && sql.includes('RETURNING id')) {
                updates.push(params);
                return { id: 'pp_1' };
              }
              return null;
            },
            async run() {
              return { success: true };
            },
            async all() {
              return { results: [] };
            }
          };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };

  const result = await updatePassphrase({ APP_DB: db } as any, 'pp_1', {
    validDays: 7
  });

  assert.deepEqual(result, {
    id: 'pp_1',
    phrase: '旧口令',
    limit: 888,
    validDays: 7,
    phraseExpiresDays: null,
    maxUses: null,
    maxUsesPerUser: null,
    isActive: false
  }, '口令部分更新时应保留未传字段，而不是把旧口令或旧额度覆盖掉');
  assert.equal(updates.length, 1);
  assert.equal(updates[0][0], '旧口令');
  assert.equal(updates[0][1], 888);
  assert.equal(updates[0][2], 7);
  assert.equal(updates[0][3], null);
  assert.equal(updates[0][4], null);
  assert.equal(updates[0][5], null);
  assert.equal(updates[0][6], 0);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/passphrases/pp_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        limit: 99
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active FROM passphrases WHERE id = ? LIMIT 1')) {
                    return existingPassphraseRow;
                  }
                  if (sql.includes('UPDATE passphrases SET') && sql.includes('RETURNING id')) {
                    return { id: 'pp_1' };
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 200, '口令部分更新应返回 200');
  const body = await response.json();
  assert.equal(body.success, true);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/passphrases/pp_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        phrase: '   '
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active FROM passphrases WHERE id = ? LIMIT 1')) {
                    return existingPassphraseRow;
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '显式清空口令时应返回 400');
  const body = await response.json();
  assert.equal(body.error, '口令不能为空');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/passphrases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        phrase: '   ',
        limit: 100
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare() {
          return {
            bind() {
              return {
                async first() {
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '新增口令时也应拦截空白口令');
  const body = await response.json();
  assert.equal(body.error, '口令不能为空');
}

{
  const updates: Array<any[]> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT id, name, amount, message, date FROM donors WHERE id = ? LIMIT 1')) {
                return existingDonorRow;
              }
              if (sql.includes('UPDATE donors SET') && sql.includes('RETURNING id')) {
                updates.push(params);
                return { id: 'donor_1' };
              }
              return null;
            },
            async run() {
              return { success: true };
            },
            async all() {
              return { results: [] };
            }
          };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };

  const result = await updateDonor({ APP_DB: db } as any, 'donor_1', {
    message: '新留言'
  });

  assert.deepEqual(result, {
    id: 'donor_1',
    name: '旧赞赏者',
    amount: '66',
    message: '新留言',
    date: '2026-05-01'
  }, '赞赏记录部分更新时应保留未传字段，而不是把名称金额等旧数据清空');
  assert.equal(updates.length, 1);
  assert.equal(updates[0][0], '旧赞赏者');
  assert.equal(updates[0][1], '66');
  assert.equal(updates[0][2], '新留言');
  assert.equal(updates[0][3], '2026-05-01');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/donors/donor_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        amount: '88'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT id, name, amount, message, date FROM donors WHERE id = ? LIMIT 1')) {
                    return existingDonorRow;
                  }
                  if (sql.includes('UPDATE donors SET') && sql.includes('RETURNING id')) {
                    return { id: 'donor_1' };
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 200, '赞赏记录部分更新应返回 200');
  const body = await response.json();
  assert.equal(body.success, true);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/donors/donor_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        name: '   '
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT id, name, amount, message, date FROM donors WHERE id = ? LIMIT 1')) {
                    return existingDonorRow;
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '显式清空赞赏者名称时应返回 400');
  const body = await response.json();
  assert.equal(body.error, '名称不能为空');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/donors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        name: '   ',
        amount: '66'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare() {
          return {
            bind() {
              return {
                async first() {
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '新增赞赏记录时也应拦截空白名称');
  const body = await response.json();
  assert.equal(body.error, '名称不能为空');
}

console.log('测试通过：口令与赞赏记录的新增/部分更新会保留旧字段，并稳定拦截空白必填字段。');
