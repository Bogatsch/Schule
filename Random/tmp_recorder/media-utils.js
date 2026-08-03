export const MAX_RECORDING_MS = 20_000;

export const VIDEO_MIME_CANDIDATES = Object.freeze([
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm'
]);

export function selectSupportedVideoMimeType(MediaRecorderClass) {
  if (!MediaRecorderClass || typeof MediaRecorderClass.isTypeSupported !== 'function') {
    return null;
  }

  return VIDEO_MIME_CANDIDATES.find((type) => {
    try {
      return MediaRecorderClass.isTypeSupported(type);
    } catch {
      return false;
    }
  }) ?? null;
}

export function formatRecordingTime(milliseconds) {
  const safeMilliseconds = Math.max(0, Math.min(MAX_RECORDING_MS, Number(milliseconds) || 0));
  const minutes = Math.floor(safeMilliseconds / 60_000);
  const seconds = Math.floor((safeMilliseconds % 60_000) / 1_000);
  const tenths = Math.floor((safeMilliseconds % 1_000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function formatPlaybackTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
