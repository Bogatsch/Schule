export const MAX_RECORDING_MS = 3 * 60_000;

export const VIDEO_MIME_CANDIDATES = Object.freeze([
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1.42001E',
  'video/mp4'
]);

// Die Kamera wird nach 60 Bildern pro Sekunde gefragt. Der Wert ist bewusst nur
// ein Wunsch: Geräte ohne 60-Hz-Modus liefern weiterhin ihre höchste Bildrate,
// statt die Aufnahme mit einer harten Bedingung scheitern zu lassen.
export const CAMERA_TARGET_FRAME_RATE = 60;

// Doppelte Bildrate braucht bei gleicher Bildqualität etwa die doppelte
// Datenrate. Die Aufnahme richtet sich deshalb nach der Bildrate, die die Kamera
// tatsächlich liefert: 4 Mbit/s bei 30 Bildern, 8 Mbit/s bei 60 Bildern.
export const REFERENCE_FRAME_RATE = 30;
export const MIN_VIDEO_BITRATE = 4_000_000;
export const MAX_VIDEO_BITRATE = 8_000_000;

export function videoBitrateForFrameRate(frameRate) {
  const fps = Number(frameRate);
  if (!Number.isFinite(fps) || fps <= 0) {
    return MIN_VIDEO_BITRATE;
  }
  const bitrate = Math.round((fps / REFERENCE_FRAME_RATE) * MIN_VIDEO_BITRATE);
  return Math.min(MAX_VIDEO_BITRATE, Math.max(MIN_VIDEO_BITRATE, bitrate));
}

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

export const DELAY_MIN_SECONDS = 1;
export const DELAY_MAX_SECONDS = 60;
export const DELAY_DEFAULT_SECONDS = 15;

// Der Drehregler nutzt wie ein Backofenknopf keinen vollen Kreis, sondern einen
// 270-Grad-Bogen mit totem Winkel unten. 0 Grad zeigt dabei nach oben.
export const DELAY_KNOB_SWEEP_DEGREES = 270;

export function clampDelaySeconds(value) {
  const seconds = Math.round(Number(value));
  if (!Number.isFinite(seconds)) {
    return DELAY_DEFAULT_SECONDS;
  }
  return Math.min(DELAY_MAX_SECONDS, Math.max(DELAY_MIN_SECONDS, seconds));
}

export function delayKnobProgress(seconds) {
  return (clampDelaySeconds(seconds) - DELAY_MIN_SECONDS) / (DELAY_MAX_SECONDS - DELAY_MIN_SECONDS);
}

export function delaySecondsToKnobAngle(seconds) {
  const half = DELAY_KNOB_SWEEP_DEGREES / 2;
  return -half + delayKnobProgress(seconds) * DELAY_KNOB_SWEEP_DEGREES;
}

export function knobAngleToDelaySeconds(angle) {
  const numeric = Number(angle);
  if (!Number.isFinite(numeric)) {
    return DELAY_DEFAULT_SECONDS;
  }
  const half = DELAY_KNOB_SWEEP_DEGREES / 2;
  // Auf (-180, 180] normieren, damit der tote Winkel zum jeweils näheren Ende zieht.
  const normalized = ((((numeric + 180) % 360) + 360) % 360) - 180;
  const bounded = Math.min(half, Math.max(-half, normalized));
  const progress = (bounded + half) / DELAY_KNOB_SWEEP_DEGREES;
  return clampDelaySeconds(
    DELAY_MIN_SECONDS + progress * (DELAY_MAX_SECONDS - DELAY_MIN_SECONDS)
  );
}

// Die verzögerte Wiedergabe puffert JPEG-Einzelbilder im Arbeitsspeicher. Der
// Speicherbedarf hängt an der Anzahl der Bilder, nicht an der Bildrate: Kurze
// Vorläufe laufen deshalb mit voller Bildrate, lange dünnen sie so weit aus,
// dass der Puffer bei rund 30 MB bleibt.
export const DELAY_TARGET_FPS = 30;
export const DELAY_MIN_FPS = 15;
export const DELAY_MAX_BUFFERED_FRAMES = 900;

export function delayCaptureFps(seconds) {
  const budgetFps = DELAY_MAX_BUFFERED_FRAMES / clampDelaySeconds(seconds);
  return Math.min(DELAY_TARGET_FPS, Math.max(DELAY_MIN_FPS, budgetFps));
}

export function delayCaptureIntervalMs(seconds) {
  return 1000 / delayCaptureFps(seconds);
}

export function formatDelayCountdown(milliseconds) {
  const remaining = Number(milliseconds);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return '0';
  }
  return String(Math.min(DELAY_MAX_SECONDS, Math.ceil(remaining / 1000)));
}
