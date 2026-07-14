import assert from 'node:assert/strict';

(globalThis as any).localStorage = {
  getItem() {
    throw new Error('localStorage unavailable');
  },
  setItem() {
    throw new Error('localStorage unavailable');
  },
  removeItem() {
    throw new Error('localStorage unavailable');
  },
  clear() {
    throw new Error('localStorage unavailable');
  }
};

{
  const { getBuiltinAIUsage, sendBuiltinAIRequest } = await import('../src/services/builtinAI.ts');
  const originalFetch = globalThis.fetch;
  let proxyClientId = '';

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/api/models')) {
      return new Response(JSON.stringify({
        models: ['free/cc'],
        defaultModel: 'free/cc',
        dailyLimit: 5,
        serverTracked: false
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.endsWith('/api/proxy')) {
      proxyClientId = new Headers(init?.headers).get('X-Client-ID') || '';
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'ok' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch url: ${url}`);
  };

  try {
    const response = await sendBuiltinAIRequest({
      model: 'free/cc',
      messages: [{ role: 'user', content: '你好' }]
    });
    assert.equal(response.success, true, '本地存储不可用时，成功的 AI 响应不应被保存失败拖成失败');
    assert.equal(response.content, 'ok');
    assert.match(proxyClientId, /^client_/, '本地存储不可用时仍应发送临时客户端标识');
    assert.equal(getBuiltinAIUsage().count, 1, '本地存储不可用时应在当前运行内用内存兜底记录次数');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const {
    clearCommunityAuthorCredentials,
    getLocalLikedIds,
    readCommunityAuthorCredentials,
    saveCommunityAuthorCredentials,
    saveLocalLikedIds,
    uploadCommunityShare
  } = {
    ...(await import('../src/community/communityService.ts')),
    ...(await import('../src/community/communityAuthorStorage.ts'))
  };
  const originalFetch = globalThis.fetch;
  let uploadClientId = '';

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/api/community/upload')) {
      uploadClientId = new Headers(init?.headers).get('X-Client-ID') || '';
      return new Response(JSON.stringify({
        id: 'cs_storage_fallback',
        created_at: 123
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch url: ${url}`);
  };

  try {
    assert.deepEqual(
      readCommunityAuthorCredentials(),
      { authorName: '', authorPassword: '' },
      '本地存储不可用时，社区作者信息读取应安全返回空值'
    );
    assert.doesNotThrow(
      () => saveCommunityAuthorCredentials('作者', '密码'),
      '本地存储不可用时，记住社区作者信息不应影响上传'
    );
    assert.doesNotThrow(
      () => clearCommunityAuthorCredentials(),
      '本地存储不可用时，退出社区作者登录不应抛错'
    );
    assert.deepEqual([...getLocalLikedIds()], [], '本地点赞状态读取失败时应安全返回空集合');
    assert.doesNotThrow(() => saveLocalLikedIds(new Set(['cs_1'])), '本地点赞状态保存失败不应影响页面操作');
    const response = await uploadCommunityShare({
      type: 'contact',
      name: '测试分享',
      payload: { contacts: [], messages: {} },
      author_name: '作者',
      author_password: '密码'
    } as any);
    assert.equal(response.id, 'cs_storage_fallback');
    assert.match(uploadClientId, /^client_/, '社区请求在本地存储不可用时仍应发送临时客户端标识');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('测试通过：本地存储不可用时，关键请求仍能用内存兜底继续执行。');
