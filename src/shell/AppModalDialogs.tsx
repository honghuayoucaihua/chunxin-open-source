import React from 'react';
import type { ProgressDialogState } from '../AppShell';
import type { UiDialogState } from '../types';

interface AppModalDialogsProps {
  uiDialog: UiDialogState;
  setUiDialog: (dialog: UiDialogState) => void;
  uiDialogInput: string;
  setUiDialogInput: (value: string) => void;
  progressDialog?: ProgressDialogState;
}

const AppModalDialogs: React.FC<AppModalDialogsProps> = ({
  uiDialog,
  setUiDialog,
  uiDialogInput,
  setUiDialogInput,
  progressDialog
}) => {
  const handleBackdropClick = () => {
    if (!uiDialog) return;
    if (uiDialog.dismissOnBackdrop === false) return;
    setUiDialog(null);
  };

  return (
    <>
      {uiDialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40" onClick={handleBackdropClick}>
          <div className="w-[86%] max-w-[360px] app-surface-panel rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="app-surface-header text-center">
              {uiDialog.title && <div className="text-[15px] font-semibold mb-2">{uiDialog.title}</div>}
            </div>
            <div className="app-surface-body text-center">
              <div className="text-[13px] render-text-secondary leading-relaxed whitespace-pre-line">{uiDialog.message}</div>
              {uiDialog.type === 'prompt' && (
                <textarea
                  className="mt-3 w-full min-h-[140px] max-h-[45vh] border render-border rounded-md px-3 py-2 text-[14px] bg-transparent outline-none resize-y leading-relaxed"
                  rows={6}
                  value={uiDialogInput}
                  onChange={(e) => setUiDialogInput(e.target.value)}
                />
              )}
            </div>
            <div className="app-surface-footer">
              {uiDialog.type !== 'alert' && (
                <button
                  className="app-button app-button-muted app-footer-button whitespace-nowrap"
                  onClick={() => {
                    setUiDialog(null);
                    uiDialog.onCancel?.();
                  }}
                >{uiDialog.cancelText || '取消'}</button>
              )}
              <button
                className="app-button app-button-muted app-footer-button whitespace-nowrap"
                style={{ color: 'var(--app-accent-color)' }}
                onClick={() => {
                  const handler = uiDialog.onConfirm;
                  const type = uiDialog.type;
                  const value = uiDialogInput;
                  if (type === 'prompt') {
                    const shouldClose = handler?.(value);
                    if (shouldClose === false) return;
                    setUiDialog(null);
                    return;
                  }
                  setUiDialog(null);
                  handler?.();
                }}
              >{uiDialog.confirmText || '确定'}</button>
            </div>
          </div>
        </div>
      )}

      {progressDialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60" style={{ touchAction: 'none' }}>
          <div className="w-[86%] max-w-[320px] app-surface-panel rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
            {progressDialog.title && (
              <div className="text-[15px] font-semibold mb-3 text-center">{progressDialog.title}</div>
            )}
            <div className="text-[13px] render-text-secondary text-center mb-4">{progressDialog.message}</div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
              {progressDialog.progress !== undefined ? (
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressDialog.progress))}%`,
                    backgroundColor: 'var(--app-accent-color)'
                  }}
                />
              ) : (
                <div
                  className="h-full w-1/3 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--app-accent-color)', animation: 'indeterminate 1.5s infinite linear' }}
                />
              )}
            </div>
            {progressDialog.progress !== undefined && (
              <div className="text-[12px] render-text-tertiary text-center">{Math.round(progressDialog.progress)}%</div>
            )}
            {progressDialog.cancellable && progressDialog.onCancel && (
              <button
                className="mt-4 w-full app-button app-button-muted border render-border"
                onClick={progressDialog.onCancel}
              >
                取消
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AppModalDialogs;
