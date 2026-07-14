import assert from 'node:assert/strict';
import { revokeBlobUrls, revokeMusicBlobUrls } from '../src/music/musicBlobUrlCleanup.ts';

const originalRevoke = URL.revokeObjectURL;
const revoked: string[] = [];

URL.revokeObjectURL = (url: string) => {
  revoked.push(url);
};

try {
  revokeMusicBlobUrls([
    { id: '1', name: '本地1', artist: '', album: '', source: 'local', isLocal: true, url: 'blob:local-1' },
    { id: '2', name: '本地2', artist: '', album: '', source: 'local', isLocal: true, url: 'blob:local-2' },
    { id: '3', name: '本地重复', artist: '', album: '', source: 'local', isLocal: true, url: 'blob:local-2' },
    { id: '4', name: '网络音乐', artist: '', album: '', source: 'netease', isLocal: false, url: 'blob:remote-like' },
    { id: '5', name: '普通链接', artist: '', album: '', source: 'local', isLocal: true, url: 'https://example.com/a.mp3' }
  ] as any[], new Set(['blob:local-1']));

  assert.deepEqual(revoked, ['blob:local-2'], '只应释放不再保留的本地 blob URL，且同一 URL 不重复释放');

  revokeBlobUrls([
    'blob:restore-1',
    'blob:restore-1',
    'https://example.com/not-blob.mp3',
    'blob:restore-keep'
  ], new Set(['blob:restore-keep']));

  assert.deepEqual(
    revoked,
    ['blob:local-2', 'blob:restore-1'],
    '异步恢复落空时应能直接释放临时 blob URL，且跳过重复和保留项'
  );
} finally {
  URL.revokeObjectURL = originalRevoke;
}

console.log('测试通过：音乐本地 Blob URL 清理不会误释放或重复释放。');
