/**
 * 图片压缩服务
 * 用于压缩上传的图片，减少存储空间占用
 */

export interface CompressOptions {
  quality?: number;       // 压缩质量 0-1，默认 0.8
  maxSizeKB?: number;     // 最大文件大小 KB，超过则继续压缩，默认 300KB
  maxWidth?: number;      // 最大宽度，超过则等比缩小
  maxHeight?: number;     // 最大高度，超过则等比缩小
  mimeType?: string;      // 输出格式，默认 'image/jpeg'
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  quality: 0.8,
  maxSizeKB: 300,
  maxWidth: 0,
  maxHeight: 0,
  mimeType: 'image/jpeg'
};

/** 将图片绘制到 canvas 并压缩导出 */
const compressWithCanvas = (
  img: HTMLImageElement,
  opts: Required<CompressOptions>
): string => {
  let { width, height } = img;

  // 等比缩小到 maxWidth / maxHeight
  if (opts.maxWidth > 0 && width > opts.maxWidth) {
    height = Math.round(height * (opts.maxWidth / width));
    width = opts.maxWidth;
  }
  if (opts.maxHeight > 0 && height > opts.maxHeight) {
    width = Math.round(width * (opts.maxHeight / height));
    height = opts.maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = opts.quality;
  let dataUrl = canvas.toDataURL(opts.mimeType, quality);

  // 如果超过最大大小，继续降低质量
  const maxBytes = opts.maxSizeKB * 1024;
  while (dataUrl.length > maxBytes * 1.37 && quality > 0.1) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL(opts.mimeType, quality);
  }

  return dataUrl;
};

/**
 * 压缩图片文件
 * @param file 图片文件
 * @param options 压缩选项
 * @returns Promise<string> 压缩后的 base64 Data URL
 */
export const compressImage = async (
  file: File,
  options?: CompressOptions
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(compressWithCanvas(img, opts));
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};

/**
 * 压缩已有的 base64 图片字符串
 * @param dataUrl base64 Data URL
 * @param options 压缩选项
 * @returns Promise<string> 压缩后的 base64 Data URL
 */
export const compressBase64Image = async (
  dataUrl: string,
  options?: CompressOptions
): Promise<string> => {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(compressWithCanvas(img, opts));
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
};

/**
 * 格式化文件大小
 */
export const formatImageSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};