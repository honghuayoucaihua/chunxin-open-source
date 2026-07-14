export interface PwaUpdateRegistrationGuard<TCallback> {
  callback: TCallback | null;
  registered: boolean;
}

export function claimPwaUpdateRegistration<TCallback>(
  guard: PwaUpdateRegistrationGuard<TCallback>,
  callback?: TCallback
): boolean {
  if (callback) {
    guard.callback = callback;
  }

  if (guard.registered) {
    return false;
  }

  guard.registered = true;
  return true;
}

export function releasePwaUpdateRegistration<TCallback>(
  guard: PwaUpdateRegistrationGuard<TCallback>
): void {
  guard.registered = false;
}
