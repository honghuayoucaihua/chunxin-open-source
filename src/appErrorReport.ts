import { redactSensitiveText, sanitizeHttpLogUrl } from './services/httpService.ts';

type ErrorReportInput = {
  error?: unknown;
  componentStack?: string;
  now?: string;
  userAgent?: string;
  url?: string;
};

const normalizeErrorText = (error: unknown): string => {
  if (error instanceof Error) return error.toString();
  return String(error || 'Unknown Error');
};

const normalizeErrorStack = (error: unknown): string => {
  return error instanceof Error ? String(error.stack || '') : '';
};

export const buildAppErrorReport = ({
  error,
  componentStack = '',
  now = new Date().toISOString(),
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  url = typeof location !== 'undefined' ? location.href : ''
}: ErrorReportInput): string => {
  const safeUrl = sanitizeHttpLogUrl(url);
  const report = [
    `Time: ${now}`,
    `URL: ${safeUrl}`,
    `UA: ${userAgent}`,
    '',
    '[Error]',
    normalizeErrorText(error),
    '',
    '[Stack]',
    normalizeErrorStack(error),
    '',
    '[ComponentStack]',
    componentStack
  ].join('\n');
  return redactSensitiveText(report);
};
