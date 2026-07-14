import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import JSZip from 'jszip';
import type { SnapshotPayload } from './snapshotBuilder.ts';
import { extractImages, parseBase64Image, replaceImagesWithRefs, restoreImagesFromRefs } from './imageHandling.ts';
import { decryptImportedPayload } from './exportEncryption.ts';

/**
 * 检查是否为原生 Android 环境
 */
function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/**
 * Blob 转 Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timeoutId = setTimeout(() => {
      reader.abort();
      reject(new Error('Blob 读取超时'));
    }, 30000);
    reader.onloadend = () => {
      clearTimeout(timeoutId);
      const base64 = reader.result;
      if (typeof base64 !== 'string') {
        reject(new Error('Blob 读取失败：result 为空'));
        return;
      }
      // 移除 data:application/zip;base64, 前缀
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Data);
    };
    reader.onerror = () => {
      clearTimeout(timeoutId);
      reject(reader.error || new Error('Blob 读取失败'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * 在 Android 原生环境中保存文件
 */
async function saveOnAndroid(
  base64Data: string,
  fileName: string
): Promise<{ success: boolean; error?: string; uri?: string }> {
  const writeOnce = () => Filesystem.writeFile({
    path: `Download/${fileName}`,
    data: base64Data,
    directory: Directory.ExternalStorage,
    recursive: true
  });

  try {
    const result = await writeOnce();

    console.log('[Backup] File saved to:', result.uri);
    return { success: true, uri: result.uri };
  } catch (firstError: any) {
    console.error('[Backup] Filesystem write failed, retry after permission:', firstError);
    try {
      await Filesystem.requestPermissions();
      const result = await writeOnce();
      console.log('[Backup] File saved after permission request:', result.uri);
      return { success: true, uri: result.uri };
    } catch (finalError: any) {
      return {
        success: false,
        error: `保存到 Download 失败: ${finalError?.message || firstError?.message || '请检查存储权限'}`
      };
    }
  }
}

/**
 * 导出为 ZIP 压缩包（推荐方式）
 * 结构：
 * - data.json: 主数据文件（图片已替换为引用）
 * - images/: 图片文件夹
 *   - img_0.png, img_1.jpg, ...
 */
export const exportAsZip = async (
  payload: SnapshotPayload,
  onProgress?: (status: string, progress?: number) => void
): Promise<{ success: boolean; error?: string; size?: number; blob?: Blob }> => {
  try {
    onProgress?.('正在分析数据...', 5);

    // 提取所有图片
    const images = extractImages(payload);
    console.log(`[Backup] Found ${images.size} images`);

    onProgress?.(`正在处理 ${images.size} 张图片...`, 10);

    // 创建 ZIP 文件
    const zip = new JSZip();

    // 替换数据中的图片为引用
    const dataWithRefs = replaceImagesWithRefs(payload, images);

    // 添加主数据文件
    zip.file('data.json', JSON.stringify(dataWithRefs, null, 2));

    // 创建图片文件夹并添加图片
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      let processedImages = 0;
      for (const [path, imgInfo] of images) {
        const parsed = parseBase64Image(imgInfo.originalData);
        if (parsed) {
          const ext = parsed.type.split('/')[1] || 'png';
          imagesFolder.file(`${imgInfo.id}.${ext}`, parsed.base64, { base64: true });
          processedImages++;
          // 进度从 10% 到 60%
          const progress = 10 + Math.round((processedImages / images.size) * 50);
          if (processedImages % 10 === 0 || processedImages === images.size) {
            onProgress?.(`正在处理图片 ${processedImages}/${images.size}...`, progress);
          }
        }
      }
    }

    onProgress?.('正在生成压缩包...', 70);

    // 生成 ZIP blob（确保正确的 MIME 类型）
    let blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      mimeType: 'application/zip' // 明确指定 MIME 类型
    }, (metadata) => {
      // 进度从 70% 到 100%
      const progress = 70 + Math.round(metadata.percent * 0.3);
      if (metadata.percent % 10 === 0 || metadata.percent === 100) {
        onProgress?.(`正在压缩 ${Math.round(metadata.percent)}%...`, progress);
      }
    });

    // 确保 blob 类型正确
    if (blob.type !== 'application/zip') {
      blob = new Blob([blob], { type: 'application/zip' });
    }

    return { success: true, size: blob.size, blob };
  } catch (error: any) {
    console.error('[Backup] ZIP export failed:', error);
    return {
      success: false,
      error: `导出失败: ${error?.message || '未知错误'}`
    };
  }
};

/**
 * 从 ZIP 压缩包导入数据
 */
export const importFromZip = async (
  file: File,
  onProgress?: (status: string, progress?: number) => void
): Promise<{ success: boolean; data?: SnapshotPayload; error?: string }> => {
  try {
    onProgress?.('正在读取压缩包...', 5);

    const zip = await JSZip.loadAsync(file);

    // 读取主数据文件
    const dataFile = zip.file('data.json');
    if (!dataFile) {
      return { success: false, error: '无效的备份文件：缺少 data.json' };
    }

    onProgress?.('正在解析数据...', 10);
    const jsonStr = await dataFile.async('string');
    const data: SnapshotPayload = JSON.parse(jsonStr);

    // 检查是否有图片文件夹
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      onProgress?.('正在加载图片...', 15);

      // 构建图片映射表
      const imageMap = new Map<string, string>();
      const imageFiles = Object.keys(zip.files).filter(f => f.startsWith('images/') && !zip.files[f].dir);

      let loadedImages = 0;
      for (const imagePath of imageFiles) {
        const imgFile = zip.file(imagePath);
        if (imgFile) {
          const base64 = await imgFile.async('base64');
          const fileName = imagePath.split('/').pop() || '';
          const ext = fileName.split('.').pop() || 'png';
          imageMap.set(fileName, `data:image/${ext};base64,${base64}`);

          loadedImages++;
          // 进度从 15% 到 90%
          const progress = 15 + Math.round((loadedImages / imageFiles.length) * 75);
          if (loadedImages % 10 === 0 || loadedImages === imageFiles.length) {
            onProgress?.(`正在加载图片 ${loadedImages}/${imageFiles.length}...`, progress);
          }
        }
      }

      onProgress?.('正在还原数据引用...', 95);
      // 将图片引用还原为 base64 数据
      const restoredData = restoreImagesFromRefs(data, imageMap);
      return { success: true, data: restoredData };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Backup] ZIP import failed:', error);
    return {
      success: false,
      error: `导入失败: ${error?.message || '文件格式错误'}`
    };
  }
};

/**
 * 触发备份下载（ZIP 格式）
 */
export const triggerBackupDownload = async (
  payload: SnapshotPayload,
  onProgress?: (status: string, progress?: number) => void
): Promise<{ success: boolean; error?: string; size?: number; uri?: string }> => {
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `叙说-备份-${dateStr}.zip`;

    // 导出为 ZIP
    const result = await exportAsZip(payload, onProgress);

    if (!result.success || !result.blob) {
      return { success: false, error: result.error };
    }

    const size = result.size || 0;

    // 在 Android 原生环境中使用 Filesystem 插件
    if (isNativeAndroid()) {
      console.log('[Backup] Using Filesystem plugin for Android');

      // 将 blob 转为 base64
      const base64Data = await blobToBase64(result.blob);

      const saveResult = await saveOnAndroid(base64Data, fileName);
      if (saveResult.success) {
        return {
          success: true,
          size,
          uri: saveResult.uri
        };
      }
      return { ...saveResult, size };
    }

    // Web 环境：使用 Blob URL 下载
    const blob = result.blob;
    // 创建带有正确类型的 blob
    const downloadBlob = new Blob([blob], { type: 'application/zip' });
    const url = URL.createObjectURL(downloadBlob);
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName; // xushuo-backup-YYYY-MM-DD.zip

      document.body.appendChild(a);
      a.click();

      // 延长清理时间，确保下载已开始
      setTimeout(() => {
        if (a.parentNode) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (downloadError) {
      URL.revokeObjectURL(url);
      throw downloadError;
    }

    return { success: true, size };
  } catch (error: any) {
    console.error('[Backup] 导出失败:', error);
    return {
      success: false,
      error: error?.message || '导出失败，请重试'
    };
  }
};

/**
 * 导入数据（自动识别 ZIP 或 JSON 格式）
 */
export const importBackupFile = async (
  file: File,
  onProgress?: (status: string, progress?: number) => void
): Promise<{ success: boolean; data?: SnapshotPayload; error?: string; format?: 'zip' | 'json' }> => {
  const fileName = file.name.toLowerCase();

  // ZIP 格式
  if (fileName.endsWith('.zip')) {
    const result = await importFromZip(file, onProgress);
    return { ...result, format: 'zip' };
  }

  // JSON 格式（兼容旧版）
  if (fileName.endsWith('.json')) {
    onProgress?.('正在读取 JSON 文件...', 10);
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const { data } = decryptImportedPayload(parsed);
      onProgress?.('正在解析数据...', 50);
      return { success: true, data, format: 'json' };
    } catch (e: any) {
      return { success: false, error: `JSON 解析失败: ${e?.message || '格式错误'}` };
    }
  }

  return { success: false, error: '不支持的文件格式，请选择 .zip 或 .json 文件' };
};
