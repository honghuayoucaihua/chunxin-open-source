const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBinaryString = (bytes) => {
  let output = '';
  for (const byte of bytes) {
    output += String.fromCharCode(byte);
  }
  return output;
};

const fromBinaryString = (input) => {
  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    bytes[i] = input.charCodeAt(i);
  }
  return bytes;
};

export const base64UrlEncode = (input) => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  const base64 = btoa(toBinaryString(bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const base64UrlDecode = (input) => {
  const padded = `${String(input || '').replace(/-/g, '+').replace(/_/g, '/')}${'==='.slice((String(input || '').length + 3) % 4)}`;
  return fromBinaryString(atob(padded));
};

const getSecret = (env) => String(
  env.PREMIUM_TOKEN_SECRET
  || env.BUILTIN_AI_PREMIUM_TOKEN_SECRET
  || env.CF_PAGES_PREMIUM_TOKEN_SECRET
  || ''
).trim();

const importHmacKey = async (secret) => {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

export const sha256Hex = async (input) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(input || '')));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
};

export const generateId = (prefix = 'id') => (
  `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
);

export const isValidAdminKey = (candidate, env = {}) => {
  const expected = String(env.ADMIN_KEY || '').trim();
  return !!expected && String(candidate || '').trim() === expected;
};

export const readPremiumTokenFromRequest = (request) => {
  const direct = String(request.headers.get('x-premium-token') || '').trim();
  if (direct) return direct;
  const authorization = String(request.headers.get('authorization') || '').trim();
  if (!authorization) return '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
};

export const issuePremiumToken = async (payload, env = {}) => {
  const secret = getSecret(env);
  if (!secret) {
    throw new Error('Missing PREMIUM_TOKEN_SECRET');
  }

  const body = {
    v: 1,
    tier: 'premium',
    iat: Date.now(),
    ...payload
  };
  const encoded = base64UrlEncode(JSON.stringify(body));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
};

export const verifyPremiumToken = async (token, env = {}) => {
  const secret = getSecret(env);
  if (!secret || !token) return { ok: false, payload: null, reason: 'missing' };

  const [encodedPayload, encodedSignature] = String(token || '').split('.');
  if (!encodedPayload || !encodedSignature) {
    return { ok: false, payload: null, reason: 'malformed' };
  }

  const key = await importHmacKey(secret);
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(encodedSignature),
    encoder.encode(encodedPayload)
  );
  if (!isValid) {
    return { ok: false, payload: null, reason: 'signature' };
  }

  let payload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload)));
  } catch {
    return { ok: false, payload: null, reason: 'payload' };
  }

  const exp = Number(payload?.exp || 0);
  if (Number.isFinite(exp) && exp > 0 && Date.now() > exp) {
    return { ok: false, payload, reason: 'expired' };
  }

  return { ok: true, payload, reason: '' };
};
