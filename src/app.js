import { analyzeFrame, flagsFor, groupSegments, DEFAULT_THRESHOLDS, FLAG_LABELS } from './analyze.js';
import { makeDemoFrame, demoPhaseAt, DEMO_DURATION } from './demo.js';
import { validateFile, validateMetadata, waitForMedia, sampleVideo, LIMITS } from './video.js';
import { createReport, reportToCSV, serializeReport } from './export.js';

const $ = (id) => document.getElementById(id);
let state = { source: null, samples: [], segments: [], frames: [], selected: 0 };
let controller = null;
let objectURL = null;
let complete = false;

function cancelCurrent() { controller?.abort(); controller = null; }
function releaseVideo() {
  const video = $('source-video'); video.pause(); video.removeAttribute('src'); video.load();
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = null;
}
function resetResults() {
  complete = false; $('results').hidden = true;
  $('csv-button').disabled = true; $('json-button').disabled = true;
}
function setBusy(busy) {
  $('analyze-button').disabled = busy;
  $('cancel-button').hidden = !busy;
  $('progress').hidden = !busy;
  $('source-video').controls = !busy;
}

function timeLabel(seconds) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
function setStatus(text, isError = false) { $('status').textContent = text; $('status').classList.toggle('error', isError); }

function runDemo() {
  cancelCurrent(); releaseVideo(); resetResults(); setBusy(false);
  $('run-controls').hidden = true; $('file-input').value = '';
  const width = 320, height = 180;
  state = { source: { kind: 'synthetic', name: 'Synthetic demo — generated frames', duration: DEMO_DURATION, width, height }, samples: [], frames: [], segments: [], selected: 0 };
  for (let time = 0; time < DEMO_DURATION; time++) {
    const phase = demoPhaseAt(time);
    const data = makeDemoFrame(width, height, phase);
    const metrics = analyzeFrame({ data, width, height });
    state.samples.push({ time, status: 'ok', ...metrics, flags: flagsFor(metrics), demoPhase: phase });
    state.frames.push(new ImageData(data, width, height));
  }
  state.segments = groupSegments(state.samples, DEMO_DURATION);
  state.analysisWidth = width; state.analysisHeight = height;
  complete = true;
  $('source-video').hidden = true;
  $('source-metadata').hidden = false;
  $('source-metadata').textContent = 'Synthetic demo · 16 seconds · 320 × 180 · clear → dark → overexposed → blurred';
  setStatus('Demo complete. These are generated frames, not recorded driving footage.');
  renderResults();
}

async function chooseFile(file) {
  if (!file) return;
  cancelCurrent(); releaseVideo(); resetResults(); setBusy(false);
  $('run-controls').hidden = true; $('source-metadata').hidden = true;
  state = { source: null, samples: [], segments: [], frames: [], selected: 0 };
  const run = new AbortController(); controller = run;
  try {
    validateFile(file);
    setStatus('Reading video metadata…');
    const video = $('source-video');
    objectURL = URL.createObjectURL(file);
    const loaded = waitForMedia(video, 'loadedmetadata', run.signal);
    video.src = objectURL; video.load();
    await loaded;
    if (run.signal.aborted) return;
    validateMetadata(video.duration, video.videoWidth, video.videoHeight);
    state.source = { kind: 'local-video', name: file.name, duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    $('source-metadata').hidden = false;
    $('source-metadata').textContent = `${file.name} · ${video.duration.toFixed(2)} seconds · ${video.videoWidth} × ${video.videoHeight} · ${Math.ceil(video.duration)} samples planned`;
    $('run-controls').hidden = false;
    setStatus('Clip ready. Analysis samples one frame per second at a maximum width of 320 pixels.');
  } catch (error) {
    if (error.name !== 'AbortError') { setStatus(error.message, true); releaseVideo(); }
  } finally { if (controller === run) controller = null; }
}

async function analyzeLocal() {
  if (!state.source || state.source.kind !== 'local-video') return;
  cancelCurrent(); resetResults();
  const run = new AbortController(); controller = run;
  state.samples = []; state.frames = []; state.segments = [];
  $('progress').value = 0; setBusy(true); setStatus('Analyzing the clip locally…');
  try {
    const dimensions = await sampleVideo($('source-video'), {
      signal: run.signal,
      onFrame(result) {
        if (run.signal.aborted) return;
        if (result.status === 'ok') {
          const metrics = analyzeFrame(result.frame);
          state.samples.push({ time: result.time, status: 'ok', ...metrics, flags: flagsFor(metrics) });
          state.frames.push(result.frame);
        } else { state.samples.push({ time: result.time, status: 'error', message: result.message, flags: [] }); state.frames.push(null); }
      },
      onProgress(value) { if (!run.signal.aborted) { $('progress').value = value; setStatus(`Analyzing locally · ${state.samples.length} / ${Math.ceil(state.source.duration)} sampled frames`); } },
    });
    if (run.signal.aborted) return;
    state.analysisWidth = dimensions.width; state.analysisHeight = dimensions.height;
    state.segments = groupSegments(state.samples, state.source.duration);
    const failures = state.samples.filter(s => s.status !== 'ok').length;
    complete = failures === 0;
    setStatus(failures ? `Analysis incomplete: ${failures} sampled frame(s) could not be decoded. Missing samples are marked; exports are disabled. Try re-encoding the clip.` : `Analysis complete · ${state.samples.length} sampled frames. Select a moment to inspect.`, failures > 0);
    $('source-video').hidden = false;
    renderResults();
  } catch (error) {
    if (error.name === 'AbortError') {
      if (controller === run) setStatus('Analysis canceled. No incomplete report was created. You can analyze the clip again.');
    } else if (controller === run) setStatus(error.message, true);
  } finally {
    if (controller === run) {
      controller = null; setBusy(false);
      if (!run.signal.aborted && !$('results').hidden && state.samples.length) showSample(state.selected);
    }
  }
}

function renderResults() {
  $('results').hidden = false;
  $('csv-button').disabled = !complete; $('json-button').disabled = !complete;
  const flagged = state.samples.filter(s => s.status === 'ok' && s.flags.length).length;
  $('sample-summary').textContent = `${state.samples.length} samples · ${flagged} with a review flag`;
  $('end-time').textContent = timeLabel(state.source.duration);
  $('timeline').replaceChildren();
  state.samples.forEach((sample, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sample${sample.flags?.length ? ' flagged' : ''}${sample.status !== 'ok' ? ' missing' : ''}`;
    const description = sample.status === 'ok' ? (sample.flags.map(f => FLAG_LABELS[f]).join(', ') || 'No heuristic flag') : 'Frame unavailable';
    button.title = `${timeLabel(sample.time)} — ${description}`;
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => showSample(index));
    $('timeline').append(button);
  });
  $('interval-count').textContent = `${state.segments.length} intervals`;
  $('intervals').replaceChildren();
  if (!state.segments.length) {
    const message = document.createElement('p'); message.className = 'muted';
    message.textContent = 'No heuristic flags in the sampled frames. This does not establish that the clip is suitable for driving.';
    $('intervals').append(message);
  }
  state.segments.forEach(segment => {
    const button = document.createElement('button'); button.className = 'interval';
    const label = document.createElement('span'); label.textContent = FLAG_LABELS[segment.flag];
    const time = document.createElement('span'); time.className = 'time'; time.textContent = `${timeLabel(segment.start)} – ${timeLabel(segment.end)} · ${segment.sampleCount} ${segment.sampleCount === 1 ? 'sample' : 'samples'} ↗`;
    button.append(label, time); button.addEventListener('click', () => showSample(segment.firstSample)); $('intervals').append(button);
  });
  showSample(0);
}

function showSample(index) {
  state.selected = index;
  const sample = state.samples[index];
  $('source-label').textContent = state.source.kind === 'synthetic' ? 'SYNTHETIC DEMO — GENERATED FRAMES' : 'LOCAL VIDEO · SAMPLED FRAME';
  $('frame-time').textContent = timeLabel(sample.time);
  $('sample-heading').textContent = `Sample at ${timeLabel(sample.time)}`;
  $('sample-flags').replaceChildren();
  const flagLabels = sample.status !== 'ok' ? ['Frame unavailable'] : sample.flags.map(f => FLAG_LABELS[f]);
  if (!flagLabels.length) flagLabels.push('No heuristic flag');
  flagLabels.forEach(text => { const span = document.createElement('span'); span.className = `badge${!sample.flags?.length ? ' clear' : ''}${sample.status !== 'ok' ? ' error' : ''}`; span.textContent = text; $('sample-flags').append(span); });
  const canvas = $('preview'); const ctx = canvas.getContext('2d');
  if (state.frames[index]) { const frame = state.frames[index]; canvas.width = frame.width; canvas.height = frame.height; ctx.putImageData(frame, 0, 0); }
  else { ctx.fillStyle = '#17262d'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  $('frame-note').textContent = state.source.kind === 'synthetic' ? `Generated ${sample.demoPhase} frame. Flags are computed from its pixels.` : `Preview at analysis resolution. Inspect the original clip below for context.`;
  $('metric-brightness').textContent = sample.status === 'ok' ? sample.brightness.toFixed(1) : '—';
  $('metric-exposure').textContent = sample.status === 'ok' ? `${(sample.brightFraction * 100).toFixed(1)}%` : '—';
  $('metric-detail').textContent = sample.status === 'ok' ? sample.detailVariance.toFixed(1) : '—';
  $('brightness-meter').style.width = sample.status === 'ok' ? `${sample.brightness / 255 * 100}%` : '0';
  $('exposure-meter').style.width = sample.status === 'ok' ? `${sample.brightFraction * 100}%` : '0';
  $('detail-meter').style.width = sample.status === 'ok' ? `${Math.min(100, sample.detailVariance / 300 * 100)}%` : '0';
  [...$('timeline').children].forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
  if (state.source.kind === 'local-video' && !controller) {
    $('source-video').pause(); $('source-video').currentTime = Math.min(sample.time, state.source.duration);
  }
}

$('demo-button').addEventListener('click', runDemo);
$('file-input').addEventListener('change', (event) => chooseFile(event.target.files[0]));
$('analyze-button').addEventListener('click', analyzeLocal);
$('cancel-button').addEventListener('click', () => controller?.abort());
function downloadReport(format) {
  if (!complete) return;
  const report = createReport(state.source, { interval: LIMITS.interval, analysisWidth: state.analysisWidth, analysisHeight: state.analysisHeight, thresholds: DEFAULT_THRESHOLDS, heuristicVersion: '1' }, state.samples, state.segments);
  const content = format === 'csv' ? reportToCSV(report) : serializeReport(report);
  const url = URL.createObjectURL(new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `road-video-check-${state.source.kind === 'synthetic' ? 'synthetic' : 'local'}-${new Date().toISOString().replaceAll(':', '-')}.${format}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('csv-button').addEventListener('click', () => downloadReport('csv'));
$('json-button').addEventListener('click', () => downloadReport('json'));
window.addEventListener('pagehide', () => { cancelCurrent(); releaseVideo(); });
