import assert from 'node:assert/strict';
import { uploadCommunityShare } from '../cloudflare/pages-functions/data.js';

const createMockDb = () => ({
  prepare(sql: string) {
    return {
      async run() {
        return { success: true };
      },
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
      }
    };
  }
});

{
  const keys: string[] = [];
  const env = {
    APP_DB: createMockDb(),
    COMMUNITY_BUCKET: {
      async put(key: string) {
        keys.push(key);
      }
    }
  };

  await uploadCommunityShare(env as any, {
    type: 'contact',
    name: '分享1',
    description: '',
    author_name: '作者',
    author_password: '密码',
    payload: { contacts: [], messages: {} },
    cover_image: 'data:image/png;base64,AAAA'
  }, 'client-1');

  await uploadCommunityShare(env as any, {
    type: 'contact',
    name: '分享2',
    description: '',
    author_name: '作者',
    author_password: '密码',
    payload: { contacts: [], messages: {} },
    cover_image: 'data:image/png;base64,AAAA'
  }, 'client-1');

  assert.equal(keys.length, 2, '两次上传都应写入封面');
  assert.notEqual(keys[0], keys[1], '同一帖子重复上传封面时应使用不同对象键');
  assert.match(keys[0], /^community\/covers\/cs_/);
  assert.match(keys[1], /^community\/covers\/cs_/);
}

console.log('测试通过：社区封面对象键不会在多次上传中复用。');
