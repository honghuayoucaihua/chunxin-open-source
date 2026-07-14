import { resolveCorsOrigin } from './config.js';

const DEFAULT_ALLOW_HEADERS = 'Content-Type, Authorization, X-Client-ID, X-Session-ID, X-Admin-Key, X-Premium-Token';
const DEFAULT_ALLOW_METHODS = 'GET,POST,OPTIONS';

const appendVaryHeader = (headers, value) => {
  const current = headers.get('Vary');
  if (!current) {
    headers.set('Vary', value);
    return;
  }
  const parts = current.split(',').map((item) => item.trim()).filter(Boolean);
  if (!parts.includes(value)) {
    parts.push(value);
    headers.set('Vary', parts.join(', '));
  }
};

const applyExtraHeaders = (headers, extraHeaders) => {
  if (!extraHeaders) return;
  new Headers(extraHeaders).forEach((value, key) => {
    headers.set(key, value);
  });
};

export const createResponseHeaders = (
  request,
  env,
  {
    contentType = 'application/json; charset=utf-8',
    cacheControl = 'no-store',
    allowMethods = DEFAULT_ALLOW_METHODS,
    extraHeaders
  } = {}
) => {
  const headers = new Headers();
  if (contentType) headers.set('Content-Type', contentType);
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  headers.set('X-Builtin-AI-Backend', 'cloudflare-pages-functions');

  const allowedOrigin = resolveCorsOrigin(request, env);
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Methods', allowMethods);
    headers.set(
      'Access-Control-Allow-Headers',
      request.headers.get('Access-Control-Request-Headers') || DEFAULT_ALLOW_HEADERS
    );
    appendVaryHeader(headers, 'Origin');
  }

  applyExtraHeaders(headers, extraHeaders);
  return headers;
};

export const jsonResponse = (request, env, data, status = 200, extraHeaders) =>
  new Response(JSON.stringify(data), {
    status,
    headers: createResponseHeaders(request, env, { extraHeaders })
  });

export const optionsResponse = (request, env, allowMethods = DEFAULT_ALLOW_METHODS) =>
  new Response(null, {
    status: 204,
    headers: createResponseHeaders(request, env, {
      contentType: null,
      allowMethods,
      extraHeaders: { Allow: allowMethods }
    })
  });

export const methodNotAllowedResponse = (request, env, allowMethods) =>
  jsonResponse(
    request,
    env,
    { error: 'Method not allowed' },
    405,
    { Allow: Array.isArray(allowMethods) ? allowMethods.join(', ') : String(allowMethods || DEFAULT_ALLOW_METHODS) }
  );

export const passthroughResponse = (request, env, upstreamResponse, extraHeaders) => {
  const contentType = upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8';
  const headers = createResponseHeaders(request, env, {
    contentType,
    cacheControl: contentType.includes('text/event-stream') ? 'no-cache' : (upstreamResponse.headers.get('cache-control') || 'no-store'),
    extraHeaders
  });

  if (contentType.includes('text/event-stream')) {
    headers.set('X-Accel-Buffering', 'no');
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers
  });
};
