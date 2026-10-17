export const DEFAULT_THRESHOLDS = Object.freeze({
  darkMean: 35, brightPixel: 245, brightFraction: 0.35, lowDetail: 60,
});

export const FLAG_LABELS = Object.freeze({
  dark: 'Dark', overexposed: 'Overexposed', 'low-detail': 'Low detail / possible blur',
});

export function analyzeFrame({ data, width, height }, thresholds = DEFAULT_THRESHOLDS) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3) {
    throw new RangeError('Frames must be at least 3 × 3 pixels.');
  }
  if (!data || data.length !== width * height * 4) {
    throw new RangeError('Frame data must contain one RGBA value per pixel.');
  }
  const gray = new Float64Array(width * height);
  let sum = 0, bright = 0;
  for (let p = 0; p < gray.length; p++) {
    const i = p * 4;
    const value = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (!Number.isFinite(value)) throw new TypeError('Frame channels must be finite numbers.');
    gray[p] = value;
    sum += value;
    if (value >= thresholds.brightPixel) bright++;
  }
  let lapSum = 0, lapSquare = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      lapSum += lap;
      lapSquare += lap * lap;
      count++;
    }
  }
  return {
    brightness: sum / gray.length,
    brightFraction: bright / gray.length,
    detailVariance: Math.max(0, lapSquare / count - (lapSum / count) ** 2),
  };
}

export function flagsFor(metrics, thresholds = DEFAULT_THRESHOLDS) {
  if (![metrics.brightness, metrics.brightFraction, metrics.detailVariance].every(Number.isFinite)) {
    throw new TypeError('Flagging requires finite frame measurements.');
  }
  const flags = [];
  if (metrics.brightness < thresholds.darkMean) flags.push('dark');
  if (metrics.brightFraction > thresholds.brightFraction) flags.push('overexposed');
  if (metrics.detailVariance < thresholds.lowDetail) flags.push('low-detail');
  return flags;
}

export function groupSegments(samples, duration, interval = 1) {
  if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(interval) || interval <= 0) {
    throw new RangeError('Duration and sampling interval must be valid.');
  }
  const segments = [];
  const open = new Map();
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!Number.isFinite(sample.time) || sample.time < 0 || sample.time >= duration) {
      open.clear();
      continue;
    }
    const flags = sample.status === 'ok' ? new Set(sample.flags ?? []) : new Set();
    for (const flag of open.keys()) if (!flags.has(flag)) open.delete(flag);
    for (const flag of flags) {
      const nextTime = samples[i + 1]?.time;
      const binEnd = Math.min(duration, sample.time + interval,
        Number.isFinite(nextTime) && nextTime > sample.time ? nextTime : Infinity);
      let segment = open.get(flag);
      if (!segment || segment.lastSample !== i - 1 || Math.abs(segment.end - sample.time) > 1e-6) {
        segment = { flag, start: sample.time, end: binEnd, firstSample: i, lastSample: i, sampleCount: 1 };
        segments.push(segment);
      } else {
        segment.end = binEnd;
        segment.lastSample = i;
        segment.sampleCount++;
      }
      open.set(flag, segment);
    }
  }
  return segments.sort((a, b) => a.start - b.start || a.flag.localeCompare(b.flag));
}
