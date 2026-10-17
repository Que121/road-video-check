// Test helper: add a finite Segment.Info.Duration to browser MediaRecorder WebM.
// Original, minimal EBML manipulation for the generated fixture only.
function vint(bytes, offset, isId = false) {
  let length = 1;
  while (length <= 8 && !(bytes[offset] & (1 << (8 - length)))) length++;
  if (length > 8 || offset + length > bytes.length) throw new Error('Invalid EBML variable integer.');
  let value = isId ? bytes[offset] : bytes[offset] & ((1 << (8 - length)) - 1);
  let unknown = !isId && value === ((1 << (8 - length)) - 1);
  for (let i = 1; i < length; i++) { value = value * 256 + bytes[offset + i]; unknown = unknown && bytes[offset + i] === 255; }
  return { length, value, unknown };
}
function elements(bytes, start, end) {
  const found = [];
  for (let at = start; at < end;) {
    const id = vint(bytes, at, true), size = vint(bytes, at + id.length);
    const data = at + id.length + size.length;
    const next = size.unknown ? end : data + size.value;
    if (next > end || next <= at) throw new Error('Invalid EBML element boundary.');
    found.push({ id: id.value, start: at, sizeStart: at + id.length, size, data, end: next });
    at = next;
  }
  return found;
}
function encodeSize(value, length) {
  if (value >= 2 ** (7 * length) - 1) throw new Error('Fixture EBML size does not fit.');
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) { bytes[i] = value % 256; value = Math.floor(value / 256); }
  bytes[0] |= 1 << (8 - length);
  return bytes;
}
export async function withWebmDuration(blob, durationSeconds) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const segment = elements(bytes, 0, bytes.length).find(e => e.id === 0x18538067);
  if (!segment) throw new Error('WebM Segment not found.');
  const info = elements(bytes, segment.data, segment.end).find(e => e.id === 0x1549A966);
  if (!info || info.size.unknown) throw new Error('Finite WebM Info not found.');
  const children = elements(bytes, info.data, info.end);
  const scale = children.find(e => e.id === 0x2AD7B1);
  let timecodeScale = 1000000;
  if (scale) { timecodeScale = 0; for (const byte of bytes.slice(scale.data, scale.end)) timecodeScale = timecodeScale * 256 + byte; }
  const duration = children.find(e => e.id === 0x4489);
  const value = durationSeconds * 1e9 / timecodeScale;
  if (duration && [4, 8].includes(duration.end - duration.data)) {
    const view = new DataView(bytes.buffer);
    if (duration.end - duration.data === 4) view.setFloat32(duration.data, value, false);
    else view.setFloat64(duration.data, value, false);
    return new Blob([bytes], { type: blob.type });
  }
  if (duration) throw new Error(`Unexpected existing duration encoding (${duration.end - duration.data} bytes).`);
  const entry = new Uint8Array(11); entry.set([0x44, 0x89, 0x88]); new DataView(entry.buffer).setFloat64(3, value, false);
  const result = new Uint8Array(bytes.length + entry.length);
  result.set(bytes.slice(0, info.end)); result.set(entry, info.end); result.set(bytes.slice(info.end), info.end + entry.length);
  result.set(encodeSize(info.size.value + entry.length, info.size.length), info.sizeStart);
  if (!segment.size.unknown) result.set(encodeSize(segment.size.value + entry.length, segment.size.length), segment.sizeStart);
  return new Blob([result], { type: blob.type });
}
