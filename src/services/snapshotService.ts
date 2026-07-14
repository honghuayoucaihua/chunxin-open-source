// Re-export everything from the new modular snapshot directory for backward compatibility
export {
  // Image handling
  isBase64Image,
  parseBase64Image,
  extractImages,
  replaceImagesWithRefs,
  restoreImagesFromRefs,

  // Snapshot builder
  estimateDataSize,
  formatFileSize,
  buildSnapshotPayload,

  // ZIP operations
  exportAsZip,
  importFromZip,
  triggerBackupDownload,
  importBackupFile
} from './snapshot';

export type { ImageInfo, SnapshotInput, SnapshotPayload } from './snapshot';
