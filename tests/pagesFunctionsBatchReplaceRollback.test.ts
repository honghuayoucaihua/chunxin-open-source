import assert from 'node:assert/strict';
import { listDonors, listPassphrases, replaceAllPassphrases, replaceDonors } from '../cloudflare/pages-functions/data.js';

const cloneRows = <T>(rows: T[]): T[] => rows.map((item) => ({ ...(item as Record<string, unknown>) } as T));

const createBatchReplaceDb = () => {
  let passphrases = [
    {
      id: 'pp_old_1',
      phrase: '旧口令一',
      limit: 100,
      valid_days: 3,
      is_active: 1,
      created_at: 1710000000000,
      updated_at: 1710000000000
    },
    {
      id: 'pp_old_2',
      phrase: '旧口令二',
      limit: 200,
      valid_days: 0,
      is_active: 1,
      created_at: 1710000001000,
      updated_at: 1710000001000
    }
  ];
  let donors = [
    {
      id: 'donor_old_1',
      name: '旧赞赏者一',
      amount: '10',
      message: '旧留言一',
      date: '2026-05-10',
      created_at: 1710000000000
    },
    {
      id: 'donor_old_2',
      name: '旧赞赏者二',
      amount: '20',
      message: '旧留言二',
      date: '2026-05-11',
      created_at: 1710000001000
    }
  ];

  const getPassphrases = () => passphrases;
  const getDonors = () => donors;

  return {
    tx: [] as string[],
    prepare(sql: string) {
      const self = this as any;
      return {
        bind(...params: any[]) {
          return {
            async first() {
              return null;
            },
            async all() {
              if (sql.includes('SELECT id, phrase, "limit", valid_days, max_uses, max_uses_per_user, is_active FROM passphrases')) {
                return { results: cloneRows(getPassphrases()) };
              }
              if (sql.includes('SELECT id, name, amount, message, date, created_at') && sql.includes('FROM donors')) {
                return { results: cloneRows(getDonors()) };
              }
              return { results: [] };
            },
            async run() {
              if (sql.includes('DELETE FROM passphrases')) {
                passphrases = [];
                return { success: true };
              }

              if (sql.includes('INSERT INTO passphrases')) {
                if (String(params[1] || '').trim() === '失败口令') {
                  throw new Error('passphrase insert failed');
                }
                passphrases.push({
                  id: String(params[0]),
                  phrase: String(params[1]),
                  limit: Number(params[2] || 0),
                  valid_days: Number(params[3] || 0),
                  phrase_expires_days: params[4],
                  max_uses: params[5],
                  max_uses_per_user: params[6],
                  is_active: Number(params[7] || 0),
                  created_at: Number(params[8] || 0),
                  updated_at: Number(params[9] || 0)
                } as any);
                return { success: true };
              }

              if (sql.includes('DELETE FROM donors')) {
                donors = [];
                return { success: true };
              }

              if (sql.includes('INSERT INTO donors')) {
                if (String(params[1] || '').trim() === '失败赞赏者') {
                  throw new Error('donor insert failed');
                }
                donors.push({
                  id: String(params[0]),
                  name: String(params[1]),
                  amount: params[2] == null ? null : String(params[2]),
                  message: params[3] == null ? null : String(params[3]),
                  date: params[4] == null ? null : String(params[4]),
                  created_at: Number(params[5] || 0)
                });
                return { success: true };
              }

              return { success: true };
            }
          };
        },
        async run() {
          return { success: true };
        }
      };
    },
    async batch(statements: Array<{ run(): Promise<{ success: boolean }> }>) {
      const snapshotPassphrases = cloneRows(passphrases);
      const snapshotDonors = cloneRows(donors);
      try {
        for (const stmt of statements) {
          await stmt.run();
        }
      } catch (error) {
        passphrases = snapshotPassphrases;
        donors = snapshotDonors;
        throw error;
      }
    },
    async exec(sql: string) {
      this.tx.push(sql);
      return [{ columns: [], values: [] }];
    }
  };
};

{
  const env = { APP_DB: createBatchReplaceDb() };
  const before = await listPassphrases(env as any);

  await assert.rejects(
    () => replaceAllPassphrases(env as any, [
      { phrase: '新口令一', limit: 300, validDays: 7, isActive: true },
      { phrase: '失败口令', limit: 400, validDays: 0, isActive: true }
    ]),
    /passphrase insert failed/,
    '批量替换口令时，只要其中一条写入失败，就应整体失败'
  );

  const after = await listPassphrases(env as any);
  assert.deepEqual(after, before, '批量替换口令失败后应完整保留旧数据，不能留下半套或空表');
}

{
  const env = { APP_DB: createBatchReplaceDb() };
  const before = await listDonors(env as any);

  await assert.rejects(
    () => replaceDonors(env as any, [
      { name: '新赞赏者一', amount: '30', message: '新留言一', date: '2026-05-12' },
      { name: '失败赞赏者', amount: '40', message: '新留言二', date: '2026-05-13' }
    ]),
    /donor insert failed/,
    '批量替换赞赏者时，只要其中一条写入失败，就应整体失败'
  );

  const after = await listDonors(env as any);
  assert.deepEqual(after, before, '批量替换赞赏者失败后应完整保留旧数据，不能留下半套或空表');
}

console.log('测试通过：批量替换口令与赞赏者在写入失败时会整体回滚，避免后台数据被截断。');
