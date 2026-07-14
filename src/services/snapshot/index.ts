// Image handling
export {
  isBase64Image,
  parseBase64Image,
  extractImages,
  replaceImagesWithRefs,
  restoreImagesFromRefs
} from './imageHandling';
export type { ImageInfo } from './imageHandling';

// Snapshot builder
export {
  estimateDataSize,
  formatFileSize,
  buildSnapshotPayload
} from './snapshotBuilder';
export type { SnapshotInput, SnapshotPayload } from './snapshotBuilder';

// ZIP operations
export {
  exportAsZip,
  importFromZip,
  triggerBackupDownload,
  importBackupFile
} from './zipOperations';
