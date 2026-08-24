const MEDIABUNNY_VERSION = '1.55.2';
const MEDIABUNNY_URL = new URL(
  `./vendor/mediabunny/mediabunny-${MEDIABUNNY_VERSION}.min.js?v=${MEDIABUNNY_VERSION}`,
  import.meta.url
).href;

let mediabunnyLoadPromise = null;

export class VideoConversionError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = 'VideoConversionError';
    this.code = code;
  }
}

function createAbortError() {
  return new DOMException('Die MP4-Konvertierung wurde abgebrochen.', 'AbortError');
}

function getLoadedMediabunny() {
  const library = globalThis.Mediabunny;
  if (
    !library
    || typeof library.Input !== 'function'
    || typeof library.Output !== 'function'
    || typeof library.Conversion?.init !== 'function'
  ) {
    return null;
  }
  return library;
}

function loadMediabunny() {
  const loaded = getLoadedMediabunny();
  if (loaded) {
    return Promise.resolve(loaded);
  }
  if (mediabunnyLoadPromise) {
    return mediabunnyLoadPromise;
  }
  if (typeof document === 'undefined') {
    return Promise.reject(new VideoConversionError(
      'library-unavailable',
      'Der lokale MP4-Konverter ist nicht verfügbar.'
    ));
  }

  mediabunnyLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MEDIABUNNY_URL;
    script.async = true;
    script.dataset.mediabunnyLoader = MEDIABUNNY_VERSION;
    script.addEventListener('load', () => {
      const library = getLoadedMediabunny();
      if (library) {
        resolve(library);
      } else {
        reject(new VideoConversionError(
          'library-unavailable',
          'Der lokale MP4-Konverter konnte nicht gestartet werden.'
        ));
      }
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new VideoConversionError(
        'library-unavailable',
        'Der lokale MP4-Konverter konnte nicht geladen werden.'
      ));
    }, { once: true });
    document.head.append(script);
  }).catch((error) => {
    mediabunnyLoadPromise = null;
    throw error;
  });

  return mediabunnyLoadPromise;
}

export function isWebMVideo(mimeType) {
  return String(mimeType || '').split(';', 1)[0].trim().toLowerCase() === 'video/webm';
}

export async function convertWebMToMp4(blob, {
  title = '',
  signal = null,
  onProgress = null
} = {}) {
  if (!(blob instanceof Blob) || blob.size <= 0 || !isWebMVideo(blob.type)) {
    throw new VideoConversionError('invalid-input', 'Es wurde kein gültiges WebM-Video übergeben.');
  }
  if (signal?.aborted) {
    throw createAbortError();
  }
  if (typeof globalThis.VideoDecoder !== 'function' || typeof globalThis.VideoEncoder !== 'function') {
    throw new VideoConversionError(
      'unsupported',
      'Dieses Gerät unterstützt die lokale Videokonvertierung nicht.'
    );
  }

  onProgress?.({ phase: 'loading', progress: 0 });
  const library = await loadMediabunny();
  if (signal?.aborted) {
    throw createAbortError();
  }

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
    canEncodeVideo
  } = library;

  if (typeof canEncodeVideo !== 'function' || !(await canEncodeVideo('avc'))) {
    throw new VideoConversionError(
      'unsupported',
      'Dieses Gerät kann kein H.264-Video für eine MP4-Datei erzeugen.'
    );
  }

  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob)
  });
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: false }),
    target
  });
  let conversion = null;
  const abortConversion = () => {
    void conversion?.cancel();
  };

  try {
    conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: 'avc',
        forceTranscode: true,
        hardwareAcceleration: 'prefer-hardware',
        keyFrameInterval: 2,
        quality: new Quality('high')
      },
      audio: { discard: true },
      tags: title ? { title } : {}
    });

    if (signal?.aborted) {
      throw createAbortError();
    }
    if (!conversion.isValid) {
      throw new VideoConversionError(
        'unsupported',
        'Die Video-Codecs dieses Geräts erlauben keine MP4-Konvertierung.'
      );
    }

    signal?.addEventListener('abort', abortConversion, { once: true });
    conversion.onProgress = (progress) => {
      onProgress?.({
        phase: 'converting',
        progress: Math.max(0, Math.min(1, Number(progress) || 0))
      });
    };
    await conversion.execute();

    if (signal?.aborted) {
      throw createAbortError();
    }
    if (!(target.buffer instanceof ArrayBuffer) || target.buffer.byteLength <= 0) {
      throw new VideoConversionError('empty-output', 'Die erzeugte MP4-Datei ist leer.');
    }

    onProgress?.({ phase: 'finalizing', progress: 1 });
    return new Blob([target.buffer], { type: 'video/mp4' });
  } catch (error) {
    if (signal?.aborted || error?.name === 'ConversionCanceledError') {
      throw createAbortError();
    }
    if (error instanceof VideoConversionError) {
      throw error;
    }
    throw new VideoConversionError(
      'conversion-failed',
      'Das WebM-Video konnte auf diesem Gerät nicht in MP4 umgewandelt werden.',
      error
    );
  } finally {
    signal?.removeEventListener('abort', abortConversion);
    if (conversion && conversion.state !== 'done' && conversion.state !== 'canceled') {
      await conversion.cancel().catch(() => {});
    }
    input.dispose();
  }
}
