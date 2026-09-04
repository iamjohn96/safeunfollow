import test from 'node:test';
import assert from 'node:assert/strict';
import { exportTimestamp, persistAnalysisDraft } from '../utils/analysis-draft';
const data = { fingerprint: 'file-a', followers: [], following: [] };
test('export dates reject incomplete, impossible and future dates', () => {
  for (const date of ['', '2026-08', '2026-02-30', '2027-01-01', '0001-01-01']) assert.equal(exportTimestamp(date, '2026-09-04'), undefined);
  assert.equal(exportTimestamp('2026-08-02', '2026-09-04'), Date.parse('2026-08-02T00:00:00Z'));
});
test('draft survives reload and locale changes through the shared cache', () => {
  let raw = JSON.stringify(data);
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  assert.equal(persistAnalysisDraft(storage, data, 'qa_profile', '2026-08-02', '2026-09-04'), true);
  assert.equal(JSON.parse(raw).profileId, 'qa_profile');
  assert.equal(JSON.parse(raw).observedAt, Date.parse('2026-08-02T00:00:00Z'));
  persistAnalysisDraft(storage, data, '', '', '2026-09-04');
  assert.equal(JSON.parse(raw).profileId, '');
  assert.equal(JSON.parse(raw).observedAt, undefined);
});
test('draft cannot overwrite another file and storage failures are contained', () => {
  const storage = { getItem: () => JSON.stringify({ ...data, fingerprint: 'file-b' }), setItem: () => { throw new Error('must not write'); } };
  assert.equal(persistAnalysisDraft(storage, data, 'qa', '2026-08-02', '2026-09-04'), false);
  assert.equal(persistAnalysisDraft({getItem: () => {throw new Error('blocked');}, setItem: () => {}}, data, 'qa', '', '2026-09-04'), false);
});
