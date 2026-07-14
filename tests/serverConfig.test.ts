import assert from 'node:assert/strict';
import {
  getSameOriginServerBaseUrl,
  resolveApiBaseUrl,
  resolveServerBaseUrl
} from '../src/services/serverConfig.ts';

{
  const origin = getSameOriginServerBaseUrl({
    origin: 'https://demo.example.com/',
    protocol: 'https:'
  });
  assert.equal(origin, 'https://demo.example.com', '浏览器 HTTP(S) 场景应优先复用当前同源地址');
}

{
  const origin = getSameOriginServerBaseUrl({
    origin: 'capacitor://localhost',
    protocol: 'capacitor:'
  });
  assert.equal(origin, null, '原生容器协议不应误判为可用同源后端');
}

{
  const origin = getSameOriginServerBaseUrl({
    origin: 'https://localhost',
    protocol: 'https:',
    hostname: 'localhost'
  }, {
    isNativeApp: true
  });
  assert.equal(origin, null, 'Capacitor https://localhost webview 不应误判为可用同源后端');
}

{
  const resolved = resolveServerBaseUrl(undefined, {
    origin: 'https://pages.example.com',
    protocol: 'https:'
  });
  assert.equal(resolved, 'https://pages.example.com', '浏览器未配 VITE_SERVER_URL 时应回落到同源');
}

{
  const resolved = resolveServerBaseUrl(undefined, {
    origin: 'https://localhost',
    protocol: 'https:',
    hostname: 'localhost'
  }, {
    isNativeApp: true
  });
  assert.equal(resolved, 'https://xushuo.cc', '原生容器未配置时应默认回落到新的线上后端');
}

{
  const resolved = resolveApiBaseUrl(undefined, undefined, {
    origin: 'http://localhost:8003',
    protocol: 'http:'
  });
  assert.equal(resolved, 'http://localhost:8003/api', '同源回退后应自动拼出 /api');
}

{
  const resolved = resolveApiBaseUrl('https://api.example.com/', '/api/', {
    origin: 'https://pages.example.com',
    protocol: 'https:'
  });
  assert.equal(resolved, '/api', '显式配置相对 API Base 时应保留相对路径');
}

{
  const resolved = resolveApiBaseUrl(undefined, undefined, {
    origin: 'https://localhost',
    protocol: 'https:',
    hostname: 'localhost'
  }, {
    isNativeApp: true
  });
  assert.equal(resolved, 'https://xushuo.cc/api', '原生容器默认 API Base 应切到新的线上后端');
}

console.log('测试通过：serverConfig 会在浏览器优先走同源 /api，并让原生容器回落到新的线上后端。');
