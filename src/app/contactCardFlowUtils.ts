import type { Contact } from '../types';
import { extractFirstJsonObject } from '../utils/chat/aiReplyParser.ts';
import { embedTokenToImageData, extractTokenFromImageData } from './contactCardWatermark.ts';
import { toContactFormPatch } from './contactFormPatchUtils.ts';
import {
  CONTACT_CARD_PREFIX,
  decodeBase64Unicode,
  encodeBase64Unicode,
  extractContactCardPayloadFromBinary,
  injectTextChunkIntoPngDataUrl,
  normalizeContactCardBase64
} from './contactCardCodec.ts';

const CARD_WIDTH = 720;
const CARD_HEIGHT = 420;

const readText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value).trim() : '';
  if (typeof value === 'bigint') return String(value).trim();
  return '';
};

const sanitizeSvgText = (value: unknown): string => readText(value).replace(/[<>&"']/g, '');

const limitText = (value: unknown, maxLength: number): string => readText(value).slice(0, maxLength);

const compactCardContact = (contact: Contact): Partial<Contact> => ({
  id: readText(contact.id),
  name: limitText(contact.name, 20),
  pinyin: limitText(contact.pinyin, 10),
  avatar: readText(contact.avatar),
  isAi: contact.isAi !== false,
  remark: limitText(contact.remark, 20),
  wechatId: limitText(contact.wechatId, 40),
  region: limitText(contact.region, 40),
  signature: limitText(contact.signature, 80),
  status: limitText(contact.status, 40),
  patDesc: limitText(contact.patDesc, 40),
  age: limitText(contact.age, 10),
  gender: contact.gender,
  constellation: limitText(contact.constellation, 20),
  mbti: limitText(contact.mbti, 12),
  occupation: limitText(contact.occupation, 40),
  relationship: limitText(contact.relationship, 30),
  personalityTraits: limitText(contact.personalityTraits, 120),
  hobbies: limitText(contact.hobbies, 120),
  description: limitText(contact.description, 200),
  catchphrase: limitText(contact.catchphrase, 80),
  openingLine: limitText(contact.openingLine, 200),
  persona: limitText(contact.persona, 220),
  background: limitText(contact.background, 220),
  expressionStyle: limitText(contact.expressionStyle, 120),
  balance: Number(contact.balance || 0),
  sentenceRange: contact.sentenceRange,
  replyLimit: Number(contact.replyLimit || 120),
  allowRichActions: !!contact.allowRichActions,
  socialPostLimit: Number(contact.socialPostLimit || 1),
  chatMode: contact.chatMode,
  unreadCount: 0,
  lastMessage: '',
  lastTime: undefined
});

const buildContactCardSvg = (contact: Contact, payload: string, includeAvatar = true): string => {
  const name = sanitizeSvgText(readText(contact.remark) || contact.name || '联系人');
  const wx = sanitizeSvgText(contact.wechatId || contact.id || '');
  const sign = sanitizeSvgText(contact.signature || '');
  const avatar = sanitizeSvgText(contact.avatar || '');
  const avatarImage = includeAvatar && avatar
    ? `<image href="${avatar}" x="56" y="78" width="108" height="108" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
    : '';
  const signatureText = sign
    ? `<text x="56" y="246" font-size="22" font-family="PingFang SC,Microsoft YaHei,Arial" fill="#374151">${sign}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#effaf3"/>
      <stop offset="100%" stop-color="#dff5e9"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <rect x="56" y="78" width="108" height="108" rx="20"/>
    </clipPath>
  </defs>
  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="28" fill="url(#bg)"/>
  <rect x="24" y="24" width="672" height="372" rx="24" fill="#ffffff" opacity="0.92"/>
  <rect x="56" y="78" width="108" height="108" rx="20" fill="#e5e7eb"/>
  ${avatarImage}
  <text x="184" y="124" font-size="40" font-family="PingFang SC,Microsoft YaHei,Arial" fill="#1f2937" font-weight="700">${name}</text>
  <text x="184" y="164" font-size="24" font-family="PingFang SC,Microsoft YaHei,Arial" fill="#6b7280">账号ID：${wx}</text>
  ${signatureText}
  <metadata>${payload}</metadata>
</svg>`;
};

export const buildContactCardPayload = (contact: Contact): string => {
  const payload = {
    v: 1,
    type: 'contact-card',
    ts: Date.now(),
    project: 'xushuo-app',
    contact: compactCardContact(contact)
  };
  const encoded = encodeBase64Unicode(JSON.stringify(payload));
  return encoded ? `${CONTACT_CARD_PREFIX}${encoded}` : '';
};

export const buildContactCardImage = (contact: Contact, payload: string): Promise<string> => {
  const buildFallbackPng = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return '';
    context.fillStyle = '#effaf3';
    context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    context.fillStyle = '#ffffff';
    context.fillRect(24, 24, CARD_WIDTH - 48, CARD_HEIGHT - 48);
    context.fillStyle = '#1f2937';
    context.font = '700 40px "PingFang SC", "Microsoft YaHei", Arial';
    context.fillText(readText(contact.remark) || readText(contact.name) || '联系人', 184, 124);
    context.fillStyle = '#6b7280';
    context.font = '24px "PingFang SC", "Microsoft YaHei", Arial';
    context.fillText(`账号ID：${readText(contact.wechatId) || readText(contact.id) || ''}`, 184, 164);
    const signature = readText(contact.signature).slice(0, 24);
    if (signature) {
      context.fillStyle = '#374151';
      context.font = '22px "PingFang SC", "Microsoft YaHei", Arial';
      context.fillText(signature, 56, 246);
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    embedTokenToImageData(imageData, payload);
    context.putImageData(imageData, 0, 0);
    return injectTextChunkIntoPngDataUrl(canvas.toDataURL('image/png'), 'xushuo-contact', payload);
  };

  const renderSvgToPng = (svgUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CARD_WIDTH;
        canvas.height = CARD_HEIGHT;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        embedTokenToImageData(imageData, payload);
        ctx.putImageData(imageData, 0, 0);
        const png = canvas.toDataURL('image/png');
        resolve(injectTextChunkIntoPngDataUrl(png, 'xushuo-contact', payload));
      };
      img.onerror = () => resolve(null);
      img.src = svgUrl;
    });
  };

  const withAvatarSvgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildContactCardSvg(contact, payload, true))}`;
  const withoutAvatarSvgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildContactCardSvg(contact, payload, false))}`;
  return renderSvgToPng(withAvatarSvgUrl).then((png) => {
    if (png) return png;
    return renderSvgToPng(withoutAvatarSvgUrl).then((fallbackPng) => fallbackPng || buildFallbackPng() || withoutAvatarSvgUrl);
  });
};

export const parseContactCardPayload = (rawText: unknown): Contact | null => {
  const raw = readText(rawText);
  const encodedRaw = raw.startsWith(CONTACT_CARD_PREFIX) ? raw.slice(CONTACT_CARD_PREFIX.length).trim() : raw;
  const decoded = decodeBase64Unicode(normalizeContactCardBase64(encodedRaw));
  if (!decoded) return null;
  const payload = extractFirstJsonObject(decoded);
  if (!payload || payload.v !== 1 || payload.type !== 'contact-card' || payload.project !== 'xushuo-app') return null;
  const contact = payload.contact;
  if (!contact || typeof contact !== 'object') return null;
  const id = readText(contact.id);
  const name = readText(contact.name);
  const avatar = readText(contact.avatar);
  if (!id || !name || !avatar || typeof contact.isAi !== 'boolean') return null;
  return {
    ...contact,
    id,
    name,
    avatar,
    pinyin: readText(contact.pinyin),
    unreadCount: 0,
    isAi: contact.isAi
  } as Contact;
};

export const parseContactFromCardImage = async (file: File): Promise<Contact | null> => {
  const buffer = await file.arrayBuffer().catch(() => null);
  if (buffer) {
    const token = extractContactCardPayloadFromBinary(new Uint8Array(buffer));
    if (token) return parseContactCardPayload(token);
  }
  const text = await file.text().catch(() => '');
  const fromTextToken = text.match(/WXCONTACTCARD:[A-Za-z0-9+/=_-]+/)?.[0] || '';
  if (fromTextToken) return parseContactCardPayload(fromTextToken);

  const objectUrl = URL.createObjectURL(file);
  try {
    const imageElement = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = objectUrl;
    });
    if (!imageElement) return null;
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || canvas.width <= 0 || canvas.height <= 0) return null;
    context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const token = extractTokenFromImageData(imageData).trim();
    return token ? parseContactCardPayload(token) : null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
