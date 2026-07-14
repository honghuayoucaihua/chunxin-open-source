export interface BubbleTemplate {
  id: string;
  name: string;
  description?: string;
  cssContent: string;
  enabled: boolean;
  createdAt: number;
  updatedAt?: number;
  encryptedReadOnly?: boolean;
  encryptedHiddenRaw?: string;
}
