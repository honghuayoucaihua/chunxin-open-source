export const CONTACT_CARD_IMAGE_FETCH_TIMEOUT_MS = 15000;

const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = String(reader.result || '');
      const base64 = value.includes(',') ? value.split(',')[1] : value;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

export const fetchContactCardImageBlob = async (
  imageUrl: string,
  timeoutMs = CONTACT_CARD_IMAGE_FETCH_TIMEOUT_MS
): Promise<Blob> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Contact card image request failed with status ${response.status}`);
    }
    return await response.blob();
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const resolveBase64ImageData = async (imageDataUrl: string): Promise<string> => {
  const directBase64 = imageDataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,([\s\S]+)$/i)?.[1];
  if (directBase64) return directBase64;
  const blob = await fetchContactCardImageBlob(imageDataUrl);
  return blobToBase64(blob);
};
