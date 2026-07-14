export type DivinationType =
  | 'liuyao'
  | 'meihua'
  | 'qimen'
  | 'ssgw'
  | 'tarot'
  | 'tarot_single';

export type DivinationMethod = 'default' | 'random' | 'number';

export type DivinationOutputLength = '简短' | '详细';

export type DivinationInterpretationStyle = '专业' | '温和' | '直接';

export interface DivinationSupplementaryInfo {
  gender: '' | '男' | '女';
  birthYear: string;
  interpretationStyle: DivinationInterpretationStyle;
  outputLength: DivinationOutputLength;
}

export interface DivinationDraft {
  type: DivinationType;
  question: string;
  datetime: string;
  method: DivinationMethod;
  divinationNumber: string;
  signNumber: string;
  spreadType: string;
  date: string;
  temperature: string;
  supplementaryInfo: DivinationSupplementaryInfo;
}

export interface DivinationApiResponse {
  ok: boolean;
  requestId?: string;
  type: DivinationType;
  divination?: any;
  interpretation?: string;
  usage?: any;
  error?: {
    code?: string;
    message?: string;
  };
}

export interface DivinationHistoryItem {
  id: string;
  createdAt: number;
  requestId: string;
  title: string;
  draft: DivinationDraft;
  type: DivinationType;
  divination: any;
  interpretation: string;
  usage?: any;
}
