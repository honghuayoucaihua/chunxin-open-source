const normalizeStatus = (value: unknown): string => String(value || '').trim().replace(/\s+/g, ' ');

export const buildStatusTemporalHintText = (status: unknown, subjectLabel = '用户'): string => {
  const text = normalizeStatus(status);
  if (!text) return '';
  return `状态时效：${subjectLabel}状态“${text}”可能是近期或临时状态；引用时要结合当前时间、本轮表达和长期记忆，不要当成永久事实。`;
};

export const buildUserStatusTemporalHint = (status: unknown): string => {
  const text = buildStatusTemporalHintText(status, '用户');
  return text ? `- ${text}` : '';
};

export const buildRoleStatusTemporalHint = (status: unknown): string => {
  const text = buildStatusTemporalHintText(status, '角色');
  return text ? `- ${text}` : '';
};
