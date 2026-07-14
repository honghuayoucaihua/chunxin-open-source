import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import {
  createDivinationHistoryItem,
  requestDivinationStream,
  upsertDivinationHistory
} from '../services/divinationService';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard';
import type { DivinationDraft, DivinationHistoryItem } from '../types';

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseDivinationFlowParams = {
  divinationSubmitting: boolean;
  setDivinationDraft: SetState<DivinationDraft>;
  setDivinationSubmitting: SetState<boolean>;
  setCurrentDivinationRecord: SetState<DivinationHistoryItem | null>;
  setDivinationHistory: SetState<DivinationHistoryItem[]>;
  pushSubView: (subView: 'divinationResult' | 'divinationHistory') => void;
  showToast: (message: string) => void;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
};

export const useDivinationFlow = (params: UseDivinationFlowParams) => {
  const {
    divinationSubmitting,
    setDivinationDraft,
    setDivinationSubmitting,
    setCurrentDivinationRecord,
    setDivinationHistory,
    pushSubView,
    showToast
  } = params;
  const divinationSubmittingRef = useRef(false);

  const handleSubmitDivination = useCallback(async (draft: DivinationDraft) => {
    if (divinationSubmitting || divinationSubmittingRef.current) return;
    divinationSubmittingRef.current = true;
    const runtimeResetEpoch = captureRuntimeResetEpoch();
    const isDivinationRequestCurrent = () => !isRuntimeResetEpochStale(runtimeResetEpoch);
    const startedAt = Date.now();
    const pendingId = `divination-pending-${startedAt}`;
    const pendingTitle = `${draft.question.trim().slice(0, 24) || '未命名问题'}`;
    flushSync(() => {
      setDivinationDraft(draft);
      setDivinationSubmitting(true);
      setCurrentDivinationRecord({
        id: pendingId,
        createdAt: startedAt,
        requestId: '',
        title: pendingTitle,
        draft: {
          ...draft,
          question: draft.question.trim()
        },
        type: draft.type,
        divination: null,
        interpretation: ''
      });
      pushSubView('divinationResult');
    });
    try {
      const response = await requestDivinationStream(draft, {
        onMeta: (meta) => {
          if (!isDivinationRequestCurrent()) return;
          setCurrentDivinationRecord((prev) => {
            if (!prev || prev.id !== pendingId) return prev;
            return {
              ...prev,
              requestId: String(meta.requestId || prev.requestId || ''),
              type: (meta.type || prev.type) as DivinationHistoryItem['type'],
              divination: meta.divination ?? prev.divination,
              title: meta.type ? (draft.question.trim().slice(0, 24) || '未命名问题') : prev.title
            };
          });
        },
        onText: (chunk) => {
          if (!isDivinationRequestCurrent()) return;
          setCurrentDivinationRecord((prev) => {
            if (!prev || prev.id !== pendingId) return prev;
            return {
              ...prev,
              interpretation: `${prev.interpretation || ''}${chunk}`
            };
          });
        }
      });
      if (!isDivinationRequestCurrent()) return;
      const record = createDivinationHistoryItem(draft, response);
      setCurrentDivinationRecord(record);
      setDivinationHistory((prev) => upsertDivinationHistory(prev, record));
    } catch (error) {
      if (!isDivinationRequestCurrent()) return;
      showToast(getErrorMessage(error) || '占卜失败，请稍后重试');
    } finally {
      divinationSubmittingRef.current = false;
      if (!isDivinationRequestCurrent()) return;
      setDivinationSubmitting(false);
    }
  }, [divinationSubmitting, pushSubView, setCurrentDivinationRecord, setDivinationDraft, setDivinationHistory, setDivinationSubmitting, showToast]);

  const handleOpenDivinationHistory = useCallback(() => {
    pushSubView('divinationHistory');
  }, [pushSubView]);

  const handleSelectDivinationHistory = useCallback((item: DivinationHistoryItem) => {
    setCurrentDivinationRecord(item);
    pushSubView('divinationResult');
  }, [pushSubView, setCurrentDivinationRecord]);

  return {
    handleSubmitDivination,
    handleOpenDivinationHistory,
    handleSelectDivinationHistory
  };
};
