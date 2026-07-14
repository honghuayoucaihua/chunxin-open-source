export type WechatDialogBridge = {
  alert?: (message: string, title?: string) => void;
  confirm?: (message: string, onConfirm: () => void, title?: string) => void;
  prompt?: (
    message: string,
    defaultValue: string,
    onConfirm: (value?: string) => void,
    title?: string
  ) => void;
};

export type WechatDialogWindow = Window & {
  wechatDialog?: WechatDialogBridge;
};

export const getWechatDialogBridge = (): WechatDialogBridge | undefined => (
  (window as WechatDialogWindow).wechatDialog
);

export const installWechatDialogBridge = (
  runtimeWindow: WechatDialogWindow,
  bridge: WechatDialogBridge
): void => {
  runtimeWindow.wechatDialog = bridge;
};

export const uninstallWechatDialogBridge = (runtimeWindow: WechatDialogWindow): void => {
  delete runtimeWindow.wechatDialog;
};

export const showWechatAlert = (message: string, title?: string): void => {
  const dialog = getWechatDialogBridge();
  if (dialog?.alert) {
    dialog.alert(message, title);
    return;
  }
  window.alert(message);
};

export const confirmWechatAction = (
  message: string,
  onConfirm: () => void,
  title?: string
): void => {
  const dialog = getWechatDialogBridge();
  if (dialog?.confirm) {
    dialog.confirm(message, onConfirm, title);
    return;
  }
  if (window.confirm(message)) {
    onConfirm();
  }
};

export const promptWechatAction = (
  message: string,
  defaultValue: string,
  onConfirm: (value?: string) => void,
  title?: string
): void => {
  const dialog = getWechatDialogBridge();
  if (dialog?.prompt) {
    dialog.prompt(message, defaultValue, onConfirm, title);
    return;
  }
  const nextValue = window.prompt(message, defaultValue);
  if (nextValue !== null) {
    onConfirm(nextValue);
  }
};
