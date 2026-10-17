const finite = value => Number.isFinite(value) ? value : null;

export function createReport(source, config, samples, segments) {
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    source: { kind: source.kind, name: source.name, duration: finite(source.duration), width: finite(source.width), height: finite(source.height) },
    config: {
      interval: finite(config.interval), analysisWidth: finite(config.analysisWidth), analysisHeight: finite(config.analysisHeight),
      heuristicVersion: String(config.heuristicVersion ?? '1'),
      thresholds: { darkMean: config.thresholds.darkMean, brightPixel: config.thresholds.brightPixel, brightFraction: config.thresholds.brightFraction, lowDetail: config.thresholds.lowDetail },
    },
    samples: samples.map((sample, index) => ({
      index, time: finite(sample.time), status: sample.status,
      brightness: sample.status === 'ok' ? finite(sample.brightness) : null,
      brightFraction: sample.status === 'ok' ? finite(sample.brightFraction) : null,
      detailVariance: sample.status === 'ok' ? finite(sample.detailVariance) : null,
      flags: Array.isArray(sample.flags) ? sample.flags.map(String) : [],
      ...(sample.demoPhase ? { demoPhase: String(sample.demoPhase) } : {}),
      ...(sample.status !== 'ok' ? { message: String(sample.message ?? sample.error ?? 'Frame unavailable') } : {}),
    })),
    segments: segments.map(s => ({ flag: s.flag, start: s.start, end: s.end, firstSample: s.firstSample, lastSample: s.lastSample, sampleCount: s.sampleCount })),
    limitations: [
      'Heuristic flags identify sampled frames for review; they do not measure driving safety or model performance.',
      'Thresholds are illustrative and not validated for the camera or scene. Low texture can resemble blur.',
      'One-second sampling may miss brief events; grouped intervals describe sampling bins rather than exact event boundaries.',
      'Measurements use downsampled encoded RGB pixel values; brightness is not physical luminance.',
      ...(source.kind === 'synthetic' ? ['Synthetic demo: generated pixel scenes, not recorded vehicle footage.'] : []),
    ],
  };
}

export function serializeReport(report) { return JSON.stringify(report, null, 2); }

function csvField(value) {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  let text = String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function reportToCSV(report) {
  const columns = ['sourceKind','sourceName','sourceDuration','sampleIndex','time','status','brightness','brightFraction','detailVariance','flags','demoPhase','samplingInterval','analysisWidth','analysisHeight','darkMeanThreshold','brightPixelThreshold','brightFractionThreshold','lowDetailThreshold'];
  const rows = report.samples.map(s => [report.source.kind, report.source.name, report.source.duration, s.index, s.time, s.status, s.brightness, s.brightFraction, s.detailVariance, s.flags.join(';'), s.demoPhase ?? '', report.config.interval, report.config.analysisWidth, report.config.analysisHeight, report.config.thresholds.darkMean, report.config.thresholds.brightPixel, report.config.thresholds.brightFraction, report.config.thresholds.lowDetail]);
  return [columns, ...rows].map(row => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}
