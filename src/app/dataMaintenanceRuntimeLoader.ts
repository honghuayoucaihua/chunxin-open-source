export const loadBackupRuntime = async () => {
  const { triggerBackupDownload } = await import('../services/snapshotService');
  return { triggerBackupDownload };
};

export const loadRestoreRuntime = async () => {
  const [{ importBackupFile }, { runRestoreFlow }] = await Promise.all([
    import('../services/snapshotService'),
    import('./restoreFlow')
  ]);
  return { importBackupFile, runRestoreFlow };
};

export const loadDataMaintenanceStatsRuntime = async () => {
  const [{ buildSnapshotPayload }, { estimateTokenUsage }] = await Promise.all([
    import('../services/snapshot/snapshotBuilder'),
    import('../services/tokenUsage')
  ]);

  return {
    buildSnapshotPayload,
    estimateTokenUsage
  };
};

export const loadDataMaintenanceActionRuntime = async () => {
  const [
    { runBackupFlow },
    { runRestoreFlow },
    clearDataFlow,
    snapshotRuntime,
    migrationUtils,
    bootstrapUtils
  ] = await Promise.all([
    import('./backupFlow'),
    import('./restoreFlow'),
    import('./clearDataFlow'),
    import('../services/snapshotService'),
    import('../appStateMigrationUtils'),
    import('../appBootstrapUtils')
  ]);

  return {
    runBackupFlow,
    runRestoreFlow,
    importBackupFile: snapshotRuntime.importBackupFile,
    triggerBackupDownload: snapshotRuntime.triggerBackupDownload,
    runClearAnonymousFlow: clearDataFlow.runClearAnonymousFlow,
    runClearForumFlow: clearDataFlow.runClearForumFlow,
    runClearMailboxFlow: clearDataFlow.runClearMailboxFlow,
    runClearMusicFlow: clearDataFlow.runClearMusicFlow,
    runClearStorageFlow: clearDataFlow.runClearStorageFlow,
    adaptLegacyBackupData: migrationUtils.adaptLegacyBackupData,
    normalizeLegacyContacts: migrationUtils.normalizeLegacyContacts,
    normalizeLegacyMessages: migrationUtils.normalizeLegacyMessages,
    normalizeSoundVibrationSettings: migrationUtils.normalizeSoundVibrationSettings,
    scoreSnapshotShape: migrationUtils.scoreSnapshotShape,
    shouldSkipImportedContact: migrationUtils.shouldSkipImportedContact,
    unwrapImportedBackupData: migrationUtils.unwrapImportedBackupData,
    mergeBuiltInContacts: bootstrapUtils.mergeBuiltInContacts,
    normalizeAiSettings: bootstrapUtils.normalizeAiSettings,
    normalizeAppearanceSettings: bootstrapUtils.normalizeAppearanceSettings
  };
};

let dataMaintenanceHandlerRuntimePromise: Promise<typeof import('./dataMaintenanceHandlerRuntime')> | null = null;

export const loadDataMaintenanceHandlerRuntime = () => {
  if (!dataMaintenanceHandlerRuntimePromise) {
    dataMaintenanceHandlerRuntimePromise = import('./dataMaintenanceHandlerRuntime');
  }
  return dataMaintenanceHandlerRuntimePromise;
};
