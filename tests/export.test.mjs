import test from 'node:test';
import assert from 'node:assert/strict';
import { createReport, reportToCSV, serializeReport } from '../src/export.js';
import { DEFAULT_THRESHOLDS } from '../src/analyze.js';

// Small RFC 4180 reader for checking decoded values rather than implementation formatting.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === ',') {
      row.push(field); field = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  assert.equal(quoted, false, 'CSV must close quoted fields');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function fixture(name = 'Synthetic road demo') {
  const source = { kind: 'synthetic', name, duration: 2, width: 320, height: 180 };
  const config = {
    interval: 1,
    analysisWidth: 320,
    thresholds: { ...DEFAULT_THRESHOLDS },
    heuristicVersion: '1',
  };
  const samples = [
    { index: 0, time: 0, status: 'ok', brightness: 34.125, brightFraction: 0.025,
      detailVariance: 12.5, flags: ['dark', 'low-detail'] },
    { index: 1, time: 1, status: 'error', flags: [], error: 'Frame unavailable' },
  ];
  const segments = [
    { flag: 'dark', start: 0, end: 1, firstSample: 0, lastSample: 0, sampleCount: 1 },
    { flag: 'low-detail', start: 0, end: 1, firstSample: 0, lastSample: 0, sampleCount: 1 },
  ];
  return { source, config, samples, segments };
}

test('JSON reports preserve source identity, thresholds, measurements, and limitations', () => {
  const { source, config, samples, segments } = fixture();
  const report = createReport(source, config, samples, segments);
  const parsed = JSON.parse(serializeReport(report));
  assert.ok(parsed.schemaVersion, 'report needs a versioned schema');
  assert.equal(parsed.source.kind, 'synthetic');
  assert.equal(parsed.source.name, source.name);
  assert.deepEqual(parsed.config.thresholds, config.thresholds);
  assert.equal(parsed.samples[0].brightness, 34.125);
  assert.equal(parsed.samples[1].status, 'error');
  assert.deepEqual(parsed.segments, segments);
  assert.ok(parsed.limitations && parsed.limitations.length > 0);
});

test('reports omit transient raw frame and preview data', () => {
  const { source, config, samples, segments } = fixture();
  samples[0].data = new Uint8ClampedArray([7, 8, 9, 255]);
  samples[0].frame = { data: [7, 8, 9, 255], width: 1, height: 1 };
  samples[0].thumbnail = 'data:image/png;base64,PRIVATE_FRAME';
  const serialized = serializeReport(createReport(source, config, samples, segments));
  const parsed = JSON.parse(serialized);
  assert.ok(!('data' in parsed.samples[0]));
  assert.ok(!('frame' in parsed.samples[0]));
  assert.ok(!('thumbnail' in parsed.samples[0]));
  assert.ok(!serialized.includes('PRIVATE_FRAME'));
});

test('CSV preserves delimiters and numeric measurements without inventing error metrics', () => {
  const { source, config, samples, segments } = fixture('road, "camera"\nclip.mp4');
  const rows = parseCSV(reportToCSV(createReport(source, config, samples, segments)));
  assert.ok(rows.length >= 3, 'CSV should include a header and both sample rows');
  const columns = rows[0].map(value => value.toLowerCase().replace(/[^a-z]/g, ''));
  const brightnessIndex = columns.findIndex(value => value === 'brightness' || value === 'meanbrightness');
  const fractionIndex = columns.findIndex(value => value === 'brightfraction');
  const detailIndex = columns.findIndex(value => value === 'detailvariance');
  const statusIndex = columns.findIndex(value => value === 'status');
  assert.ok(brightnessIndex >= 0 && fractionIndex >= 0 && detailIndex >= 0 && statusIndex >= 0);
  for (const row of rows.slice(1)) assert.equal(row.length, rows[0].length);
  const ok = rows.slice(1).find(row => row[statusIndex] === 'ok');
  const failed = rows.slice(1).find(row => row[statusIndex] === 'error');
  assert.ok(ok && failed);
  assert.equal(Number(ok[brightnessIndex]), 34.125);
  assert.equal(Number(ok[fractionIndex]), 0.025);
  assert.equal(Number(ok[detailIndex]), 12.5);
  assert.equal(failed[brightnessIndex], '');
  assert.equal(failed[fractionIndex], '');
  assert.equal(failed[detailIndex], '');
  assert.ok(rows.slice(1).some(row => row.includes(source.name)));
});

test('CSV guards formula-leading source names while leaving computed numeric fields numeric', () => {
  for (const prefix of ['=', '+', '-', '@']) {
    const { source, config, samples, segments } = fixture(`${prefix}dangerous-file.mp4`);
    const rows = parseCSV(reportToCSV(createReport(source, config, samples, segments)));
    const sourceFields = rows.slice(1).flat().filter(value => value.includes('dangerous-file.mp4'));
    assert.ok(sourceFields.length > 0);
    for (const value of sourceFields) {
      assert.equal(value, `'${source.name}`, 'spreadsheet formulas must be escaped as text');
    }
    assert.ok(rows.slice(1).flat().includes('34.125'));
  }
});
