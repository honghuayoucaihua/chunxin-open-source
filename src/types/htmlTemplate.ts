export interface HtmlTemplateVariable {
  name: string;           // 变量名，对应 {{变量名}}
  description: string;    // 告诉AI该填什么
  example?: string;       // 示例值
  type?: 'text' | 'number' | 'array';
}

export interface HtmlTemplate {
  id: string;
  name: string;           // 如 "冰箱储备清单"
  description?: string;
  usageNote?: string;     // 备注；不参与自动触发
  htmlContent: string;    // HTML模板，含 {{变量}} 占位符
  variables: HtmlTemplateVariable[];
  enabled: boolean;
  createdAt: number;
  updatedAt?: number;
  encryptedReadOnly?: boolean;
  encryptedHiddenRaw?: string;
}
