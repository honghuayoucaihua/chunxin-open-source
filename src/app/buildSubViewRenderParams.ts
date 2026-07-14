import { buildContentSubViewRenderParams } from './subviewRenderParams/contentSubViewRenderParams';
import { buildConversationSubViewRenderParams } from './subviewRenderParams/conversationSubViewRenderParams';
import { buildRelationshipSubViewRenderParams } from './subviewRenderParams/relationshipSubViewRenderParams';
import { buildToolingSubViewRenderParams } from './subviewRenderParams/toolingSubViewRenderParams';
import type { AppSubViewRenderParams } from './subviewRenderParams/types';

export const buildSubViewRenderParams = (options: AppSubViewRenderParams): AppSubViewRenderParams => ({
  ...buildConversationSubViewRenderParams(options),
  ...buildRelationshipSubViewRenderParams(options),
  ...buildToolingSubViewRenderParams(options),
  ...buildContentSubViewRenderParams(options)
});
