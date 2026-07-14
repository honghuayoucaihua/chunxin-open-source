import assert from 'node:assert/strict';
import {
  MUSIC_API,
  fetchMusicJson,
  fetchMusicTrackLyric,
  resolveMusicTrackCover,
  resolveMusicTrackUrl,
  searchMusicTracks
} from '../src/music/musicCommon.ts';

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

{
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    return await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(signal.reason || new Error('aborted'));
        return;
      }
      signal?.addEventListener('abort', () => {
        reject(signal.reason || new Error('aborted'));
      }, { once: true });
    });
  };

  try {
    await assert.rejects(
      () => fetchMusicJson(MUSIC_API, 5),
      /Music API timeout/,
      '音乐接口长时间无响应时应主动超时，避免页面一直等待'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  globalThis.fetch = async () => new Response('{}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
  console.warn = () => {};

  try {
    assert.deepEqual(await searchMusicTracks('netease', '测试'), [], '音乐搜索接口异常时应安全返回空结果');
    assert.equal(
      await resolveMusicTrackUrl('netease', { id: '1', name: '歌', artist: '歌手', album: '专辑', source: 'netease' }),
      '',
      '音乐播放地址接口异常时应安全返回空字符串'
    );
    assert.equal(
      await resolveMusicTrackCover('netease', { id: '1', name: '歌', artist: '歌手', album: '专辑', source: 'netease', picId: 'pic_1' }),
      '',
      '音乐封面接口异常时应安全返回空字符串'
    );
    assert.equal(
      await fetchMusicTrackLyric('netease', '1'),
      '',
      '音乐歌词接口异常时应安全返回空字符串'
    );
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }
}

console.log('测试通过：音乐外部接口会超时退出，并在异常时安全降级。');
