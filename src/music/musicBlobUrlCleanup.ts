import type { PlayerTrack } from './musicCommon.ts';

const isLocalBlobTrackUrl = (track: PlayerTrack): boolean => (
  !!track.isLocal && typeof track.url === 'string' && track.url.startsWith('blob:')
);

export const revokeBlobUrls = (urls: string[], keepUrls: Set<string> = new Set()): void => {
  const revoked = new Set<string>();
  urls.forEach((url) => {
    if (!url.startsWith('blob:') || keepUrls.has(url) || revoked.has(url)) return;
    revoked.add(url);
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore revoke failures
    }
  });
};

export const revokeMusicBlobUrls = (tracks: PlayerTrack[], keepUrls: Set<string> = new Set()): void => {
  revokeBlobUrls(
    tracks
      .filter(isLocalBlobTrackUrl)
      .map((track) => track.url || ''),
    keepUrls
  );
};
