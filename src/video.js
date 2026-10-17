export const LIMITS = Object.freeze({ maxBytes: 200 * 1024 * 1024, maxDuration: 120, analysisWidth: 320, interval: 1 });

export function validateFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) throw new Error('Choose a non-empty video file.');
  if (file.size > LIMITS.maxBytes) throw new Error('This clip is larger than 200 MiB. Choose a smaller file.');
}

export function validateMetadata(duration, width, height) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('The browser could not read a finite clip duration. Try an MP4 or WebM export.');
  if (duration > LIMITS.maxDuration) throw new Error('This clip is longer than 2 minutes. Trim it to 120 seconds or less.');
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 3 || height < 3) throw new Error('The browser could not decode a video track. Try an MP4 or WebM export.');
}

function aborted(signal) { if (signal?.aborted) throw new DOMException('Analysis canceled.', 'AbortError'); }

export function waitForMedia(video, event, signal, timeout = 10000) {
  aborted(signal);
  return new Promise((resolve, reject) => {
    const clean = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener('error', fail); signal?.removeEventListener('abort', cancel); };
    const done = () => { clean(); resolve(); };
    const fail = () => { clean(); reject(new Error('This video cannot be decoded by this browser. Try an MP4 or WebM export.')); };
    const cancel = () => { clean(); reject(new DOMException('Analysis canceled.', 'AbortError')); };
    const timer = setTimeout(() => { clean(); reject(new Error(`Timed out while reading the video (${event}). Try a shorter or re-encoded clip.`)); }, timeout);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', fail, { once: true });
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export async function sampleVideo(video, { signal, onFrame, onProgress }) {
  aborted(signal);
  validateMetadata(video.duration, video.videoWidth, video.videoHeight);
  video.pause();
  if (video.readyState < 2) await waitForMedia(video, 'loadeddata', signal);
  const width = Math.min(LIMITS.analysisWidth, video.videoWidth);
  const height = Math.max(3, Math.round(video.videoHeight * width / video.videoWidth));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const count = Math.ceil(video.duration / LIMITS.interval);
  for (let index = 0; index < count; index++) {
    aborted(signal);
    const time = index * LIMITS.interval;
    try {
      // Explicitly seek even when currentTime is already zero. Metadata/data
      // readiness can precede the first drawable frame in a hidden video.
      const sought = waitForMedia(video, 'seeked', signal);
      video.currentTime = time;
      await sought;
      aborted(signal);
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height);
      onFrame({ time, status: 'ok', frame });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      onFrame({ time, status: 'error', message: error.message });
    }
    onProgress?.((index + 1) / count);
    // Yield between samples so cancel and replacement controls remain responsive.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  aborted(signal);
  return { width, height, count };
}
