import assert from 'node:assert/strict';
import { synthesizeMiniMaxAudio } from '../src/services/minimaxTtsService.ts';

const originalFetch = globalThis.fetch;

const aiSettings = {
  minimaxTTS: {
    enabled: true,
    region: 'official' as const,
    apiKey: 'test-key',
    groupId: 'test-group',
    model: 'speech-01'
  }
};

const createHangingFetch = () => async (_input: RequestInfo | URL, init?: RequestInit) => {
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

{
  globalThis.fetch = createHangingFetch();

  try {
    await assert.rejects(
      () => synthesizeMiniMaxAudio({
        aiSettings,
        text: '请求超时测试',
        voiceId: 'voice-test',
        requestTimeoutMs: 5
      }),
      /MiniMax TTS request timeout/,
      'MiniMax 语音生成请求长时间无响应时应主动超时'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  let calls = 0;
  const audioUrl = 'https://example.com/generated.mp3';
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ audio_url: audioUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return await createHangingFetch()(_input, init);
  };

  try {
    const result = await synthesizeMiniMaxAudio({
      aiSettings,
      text: '音频链接超时测试',
      voiceId: 'voice-test',
      audioFetchTimeoutMs: 5
    });

    assert.equal(result, audioUrl, '音频链接下载超时时应回退为原始链接，避免语音功能卡死');
    assert.equal(calls, 2, '不应对卡住的音频链接进行额外重试');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      message: 'bad key',
      api_key: 'secret-minimax-key',
      Authorization: 'Bearer secret-token'
    }
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    await synthesizeMiniMaxAudio({
      aiSettings: {
        minimaxTTS: {
          ...aiSettings.minimaxTTS,
          apiKey: 'secret-minimax-key'
        }
      },
      text: '错误脱敏测试',
      voiceId: 'voice-test'
    });
    assert.fail('MiniMax 错误响应应抛出异常');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.doesNotMatch(message, /secret-minimax-key|secret-token/, 'MiniMax 错误提示不应暴露密钥或 token');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('测试通过：MiniMax 语音请求会超时退出，音频链接下载卡住时会安全回退。');
