export interface ImageInfo {
  id: string;
  originalData: string; // 原始 base64 数据
  type: string; // image/png, image/jpeg 等
}

/**
 * 检查字符串是否为 base64 图片数据
 */
export function isBase64Image(str: string): boolean {
  return typeof str === 'string' && str.startsWith('data:image/');
}

/**
 * 解析 base64 图片数据
 */
export function parseBase64Image(dataUrl: string): { type: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return null;
  return { type: match[1], base64: match[2] };
}

/**
 * 从数据中提取所有图片，返回图片映射表
 */
export function extractImages(data: any, path: string = 'root', images: Map<string, ImageInfo> = new Map()): Map<string, ImageInfo> {
  if (!data || typeof data !== 'object') return images;

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      extractImages(item, `${path}[${index}]`, images);
    });
  } else {
    for (const key of Object.keys(data)) {
      const value = data[key];
      const currentPath = `${path}.${key}`;

      if (isBase64Image(value)) {
        const parsed = parseBase64Image(value);
        if (parsed) {
          const imageId = `img_${images.size}`;
          images.set(currentPath, {
            id: imageId,
            originalData: value,
            type: parsed.type
          });
        }
      } else if (typeof value === 'object') {
        extractImages(value, currentPath, images);
      }
    }
  }

  return images;
}

/**
 * 将数据中的图片替换为引用路径
 */
export function replaceImagesWithRefs(data: any, images: Map<string, ImageInfo>, path: string = 'root'): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item, index) => replaceImagesWithRefs(item, images, `${path}[${index}]`));
  }

  const result: any = {};
  for (const key of Object.keys(data)) {
    const value = data[key];
    const currentPath = `${path}.${key}`;

    if (isBase64Image(value) && images.has(currentPath)) {
      const imgInfo = images.get(currentPath)!;
      // 替换为图片引用
      result[key] = `__IMAGE_REF__:images/${imgInfo.id}.${imgInfo.type.split('/')[1]}`;
    } else if (typeof value === 'object') {
      result[key] = replaceImagesWithRefs(value, images, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 将图片引用还原为 base64 数据
 */
export function restoreImagesFromRefs(data: any, imageMap: Map<string, string>): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => restoreImagesFromRefs(item, imageMap));
  }

  const result: any = {};
  for (const key of Object.keys(data)) {
    const value = data[key];

    if (typeof value === 'string' && value.startsWith('__IMAGE_REF__:')) {
      const imagePath = value.replace('__IMAGE_REF__:', '');
      const fileName = imagePath.split('/').pop() || '';
      if (imageMap.has(fileName)) {
        result[key] = imageMap.get(fileName);
      } else {
        result[key] = value; // 保留引用，后续处理
      }
    } else if (typeof value === 'object') {
      result[key] = restoreImagesFromRefs(value, imageMap);
    } else {
      result[key] = value;
    }
  }

  return result;
}
