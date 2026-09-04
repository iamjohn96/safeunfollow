import type { ParsedData } from './parser';

export function exportTimestamp(date: string, today: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return undefined;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) && timestamp > 0 && new Date(timestamp).toISOString().slice(0, 10) === date ? timestamp : undefined;
}

// Update only the current file, never a newer upload opened in another tab.
export function persistAnalysisDraft(storage: Pick<Storage, 'getItem' | 'setItem'>, data: ParsedData, profile: string, date: string, today: string): boolean {
  try {
    const cached = JSON.parse(storage.getItem('lastParsedData') ?? 'null');
    if (!data.fingerprint || cached?.fingerprint !== data.fingerprint) return false;
    storage.setItem('lastParsedData', JSON.stringify({ ...cached, profileId: profile, observedAt: exportTimestamp(date, today) }));
    return true;
  } catch {
    return false;
  }
}
