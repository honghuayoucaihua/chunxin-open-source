import { jsonResponse, methodNotAllowedResponse, optionsResponse } from '../../cloudflare/pages-functions/response.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse(request, env, 'POST,OPTIONS');
  }

  if (request.method !== 'POST') {
    return methodNotAllowedResponse(request, env, ['POST', 'OPTIONS']);
  }

  return jsonResponse(request, env, {
    success: false,
    error: 'Cloudflare Functions 版已移除 heartbeat 统计接口'
  }, 410);
}
