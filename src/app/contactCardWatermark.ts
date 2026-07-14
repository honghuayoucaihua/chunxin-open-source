const WATERMARK_MAGIC = [0x58, 0x53, 0x57, 0x31];
const WATERMARK_REPEAT = 5;
const WATERMARK_START_PIXEL = 997;
const WATERMARK_STEP_PIXEL = 6151;
const MAX_WATERMARK_BYTES = 4096;
const CHANNEL_QUANT = 16;

const checksum16 = (bytes: Uint8Array): number => {
  let sum = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    sum = (sum + bytes[index]) & 0xffff;
  }
  return sum;
};

const packetToBits = (packet: Uint8Array): Uint8Array => {
  const bits = new Uint8Array(packet.length * 8);
  let cursor = 0;
  for (let index = 0; index < packet.length; index += 1) {
    const value = packet[index];
    for (let bit = 7; bit >= 0; bit -= 1) {
      bits[cursor] = (value >> bit) & 1;
      cursor += 1;
    }
  }
  return bits;
};

const bitsToBytes = (bits: Uint8Array): Uint8Array => {
  const out = new Uint8Array(Math.ceil(bits.length / 8));
  for (let index = 0; index < bits.length; index += 1) {
    const byteIndex = Math.floor(index / 8);
    out[byteIndex] = (out[byteIndex] << 1) | bits[index];
    if (index % 8 === 7) out[byteIndex] &= 0xff;
  }
  return out;
};

const buildPacket = (token: string): Uint8Array | null => {
  const payload = new TextEncoder().encode(String(token || ''));
  if (payload.length <= 0 || payload.length > MAX_WATERMARK_BYTES) return null;
  const out = new Uint8Array(4 + 2 + payload.length + 2);
  out.set(WATERMARK_MAGIC, 0);
  out[4] = (payload.length >> 8) & 0xff;
  out[5] = payload.length & 0xff;
  out.set(payload, 6);
  const check = checksum16(payload);
  out[out.length - 2] = (check >> 8) & 0xff;
  out[out.length - 1] = check & 0xff;
  return out;
};

const resolvePixelIndex = (sampleIndex: number, totalPixels: number): number => {
  return (WATERMARK_START_PIXEL + sampleIndex * WATERMARK_STEP_PIXEL) % totalPixels;
};

const encodeBitWithQuantization = (value: number, bit: number): number => {
  const bucket = Math.floor(value / CHANNEL_QUANT);
  const wantedParity = bit & 1;
  let nextBucket = bucket;
  if ((nextBucket & 1) !== wantedParity) {
    if (nextBucket <= 0) nextBucket = 1;
    else if (nextBucket >= 15) nextBucket = 14;
    else nextBucket += value % CHANNEL_QUANT < CHANNEL_QUANT / 2 ? -1 : 1;
  }
  return Math.max(0, Math.min(255, nextBucket * CHANNEL_QUANT + Math.floor(CHANNEL_QUANT / 2)));
};

const decodeBitWithQuantization = (value: number): number => {
  const bucket = Math.floor(value / CHANNEL_QUANT);
  return bucket & 1;
};

const writeBit = (pixels: Uint8ClampedArray, pixelIndex: number, bit: number): void => {
  const channelIndex = pixelIndex * 4 + 2;
  pixels[channelIndex] = encodeBitWithQuantization(pixels[channelIndex], bit);
};

const readBit = (pixels: Uint8ClampedArray, pixelIndex: number): number => {
  const channelIndex = pixelIndex * 4 + 2;
  return decodeBitWithQuantization(pixels[channelIndex]);
};

const readBitWithVote = (pixels: Uint8ClampedArray, totalPixels: number, logicalBitIndex: number): number => {
  let ones = 0;
  for (let repeat = 0; repeat < WATERMARK_REPEAT; repeat += 1) {
    const sampleIndex = logicalBitIndex * WATERMARK_REPEAT + repeat;
    const pixelIndex = resolvePixelIndex(sampleIndex, totalPixels);
    ones += readBit(pixels, pixelIndex);
  }
  return ones >= Math.ceil(WATERMARK_REPEAT / 2) ? 1 : 0;
};

export const embedTokenToImageData = (imageData: ImageData, token: string): boolean => {
  const packet = buildPacket(token);
  if (!packet) return false;
  const bits = packetToBits(packet);
  const totalPixels = Math.floor(imageData.data.length / 4);
  if (bits.length * WATERMARK_REPEAT >= totalPixels) return false;
  for (let logicalBitIndex = 0; logicalBitIndex < bits.length; logicalBitIndex += 1) {
    for (let repeat = 0; repeat < WATERMARK_REPEAT; repeat += 1) {
      const sampleIndex = logicalBitIndex * WATERMARK_REPEAT + repeat;
      const pixelIndex = resolvePixelIndex(sampleIndex, totalPixels);
      writeBit(imageData.data, pixelIndex, bits[logicalBitIndex]);
    }
  }
  return true;
};

export const extractTokenFromImageData = (imageData: ImageData): string => {
  const totalPixels = Math.floor(imageData.data.length / 4);
  const headerBits = (4 + 2) * 8;
  const header = new Uint8Array(headerBits);
  for (let index = 0; index < headerBits; index += 1) {
    header[index] = readBitWithVote(imageData.data, totalPixels, index);
  }
  const headerBytes = bitsToBytes(header);
  if (!WATERMARK_MAGIC.every((byte, idx) => headerBytes[idx] === byte)) return '';
  const length = ((headerBytes[4] << 8) | headerBytes[5]) >>> 0;
  if (!length || length > MAX_WATERMARK_BYTES) return '';
  const totalBits = (4 + 2 + length + 2) * 8;
  const allBits = new Uint8Array(totalBits);
  for (let index = 0; index < totalBits; index += 1) {
    allBits[index] = readBitWithVote(imageData.data, totalPixels, index);
  }
  const bytes = bitsToBytes(allBits);
  const payload = bytes.slice(6, 6 + length);
  const expected = ((bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1]) >>> 0;
  if (checksum16(payload) !== expected) return '';
  try {
    return new TextDecoder().decode(payload);
  } catch {
    return '';
  }
};
