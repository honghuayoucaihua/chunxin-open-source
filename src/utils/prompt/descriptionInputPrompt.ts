type DescriptionInputPromptCapabilities = {
  descriptionFeatureEnabled?: boolean;
  descriptionSayEnabled?: boolean;
  descriptionDoEnabled?: boolean;
};

type DescriptionInputPromptLineOptions = {
  linePrefix?: string;
};

const getEnabledDescriptionInputLabels = (
  capabilities: DescriptionInputPromptCapabilities
): string[] => [
  ...(capabilities.descriptionSayEnabled ? ['说'] : []),
  ...(capabilities.descriptionDoEnabled ? ['做'] : [])
];

const hasDescriptionInputDoEnabled = (
  capabilities: DescriptionInputPromptCapabilities
): boolean => capabilities.descriptionFeatureEnabled === true && capabilities.descriptionDoEnabled === true;

const buildDefaultCapabilitySuffix = (
  labels: string[]
): string => {
  const explanations = [
    labels.includes('说') ? '“说”表示用户聊天正文' : '',
    labels.includes('做') ? '“做”表示用户行为描述' : ''
  ].filter(Boolean);
  return explanations.length > 0
    ? `发送；${explanations.join('，')}。`
    : '发送。';
};

export const buildDescriptionInputCapabilityLine = (
  capabilities: DescriptionInputPromptCapabilities,
  options: DescriptionInputPromptLineOptions & {
    labelPrefix?: string;
    lineSuffix?: string;
  } = {}
): string => {
  if (!capabilities.descriptionFeatureEnabled) return '';
  const labels = getEnabledDescriptionInputLabels(capabilities);
  if (labels.length === 0) return '';
  const linePrefix = options.linePrefix || '';
  const labelPrefix = options.labelPrefix || '前端说做开关：当前允许用户使用';
  const lineSuffix = options.lineSuffix ?? buildDefaultCapabilitySuffix(labels);
  return `${linePrefix}${labelPrefix}${labels.join('、')}${lineSuffix}`;
};

export const buildDescriptionInputDoPriorityLine = (
  capabilities: DescriptionInputPromptCapabilities,
  options: DescriptionInputPromptLineOptions = {}
): string => {
  if (!hasDescriptionInputDoEnabled(capabilities)) return '';
  const linePrefix = options.linePrefix || '';
  return `${linePrefix}当历史里出现只有【动作】或【用户行为】没有正文的用户消息时，表示用户主动使用了“做”发送，应优先按用户行为语义理解；回复中的动作字段仍必须遵守当前模式开关。`;
};

export const buildDescriptionInputHistorySemanticLine = (
  capabilities: DescriptionInputPromptCapabilities,
  markers: string[],
  options: DescriptionInputPromptLineOptions = {}
): string => {
  if (!capabilities.descriptionFeatureEnabled) return '';
  const normalizedMarkers = markers
    .map((marker) => String(marker || '').trim())
    .filter(Boolean);
  if (normalizedMarkers.length === 0) return '';
  const linePrefix = options.linePrefix || '';
  return `${linePrefix}若历史中出现仅含${normalizedMarkers.join('或')}或【用户行为】的用户消息，表示用户主动使用了前端“说/做”发送，应优先按该语义理解；不要把这些标签当成可模仿的回复格式。`;
};
