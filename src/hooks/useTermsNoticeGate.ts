import { useCallback, useMemo, useState } from 'react';
import { TERMS_NOTICE_VERSION, TERMS_NOTICE_VERSION_STORAGE_KEY } from '../pages/termsNoticeContent';

const readAgreedTermsVersion = (): string | null => {
  try {
    return localStorage.getItem(TERMS_NOTICE_VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const useTermsNoticeGate = (
  hasAgreedTerms: boolean,
  setHasAgreedTerms: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const [agreedVersion, setAgreedVersion] = useState<string | null>(() => readAgreedTermsVersion());

  const shouldShowTermsNotice = useMemo(() => {
    return !hasAgreedTerms || agreedVersion !== TERMS_NOTICE_VERSION;
  }, [agreedVersion, hasAgreedTerms]);

  const handleAgreeTermsNotice = useCallback(() => {
    try {
      localStorage.setItem(TERMS_NOTICE_VERSION_STORAGE_KEY, TERMS_NOTICE_VERSION);
    } catch {
      // ignore storage failures
    }
    setAgreedVersion(TERMS_NOTICE_VERSION);
    setHasAgreedTerms(true);
  }, [setHasAgreedTerms]);

  return {
    shouldShowTermsNotice,
    handleAgreeTermsNotice
  };
};
