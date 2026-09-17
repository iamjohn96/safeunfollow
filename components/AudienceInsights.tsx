'use client';
import { useState } from 'react';
import { cleanupCandidates, compareAudience, previousSnapshot, type Snapshot } from '@/utils/audience';
import { audienceCopy } from '@/utils/audience-copy';
import type { ParsedData } from '@/utils/parser';
import { t, type Lang } from '@/utils/i18n';
import { FREE_PREVIEW_LIMIT } from '@/utils/premium-offer';

import { SentenceLines } from '@/components/SentenceLines';
const premiumNotice = {
  en: 'Comparisons between exports require Lifetime Access.',
  pt: 'Comparações entre exportações exigem o acesso vitalício.',
  ru: 'Для сравнения экспортов нужен пожизненный доступ.',
  es: 'Las comparaciones entre exportaciones requieren el acceso de por vida.',
};

export function ChangeSummary({ a, b, lang }: { a: ParsedData; b: ParsedData; lang: Lang }) {
  const c = audienceCopy[lang];
  const result = compareAudience(a, b);
  if (!result) return <p className="text-sm text-zinc-500"><SentenceLines text={c.pending} /></p>;
  const percent = (n: number | null) => n === null ? '—' : `${(n * 100).toFixed(1)}%`;
  return <div className="space-y-3">
    <p className="text-sm">{c.interval}: {new Date(result.previous.observedAt!).toISOString().slice(0, 10)} → {new Date(result.current.observedAt!).toISOString().slice(0, 10)}</p>
    <dl className="grid grid-cols-2 gap-3">
      {[[c.gained, result.newFollowers.length], [c.lost, result.newUnfollowers.length], [c.net, result.net], [c.ratio, percent(result.mutualRatio)], [c.loss, percent(result.lossRate)]].map(([label, value]) => <div key={label} className="rounded-lg bg-zinc-50 p-3"><dt className="text-xs text-zinc-600">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}
    </dl><p className="text-xs text-zinc-500"><SentenceLines text={c.note} /></p>
  </div>;
}

export function AudienceInsights({ data, snapshots, lang, isPremium, onUnlock }: { data: ParsedData; snapshots: Snapshot[]; lang: Lang; isPremium: boolean; onUnlock?: () => void }) {
  const c = audienceCopy[lang];
  const [keep, setKeep] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState('');
  const previous = previousSnapshot(snapshots, data);
  // Persistent protections are loaded explicitly when the user opens this panel.
  const [opened, setOpened] = useState(false);
  function open() {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(`audience-keep-v1:${data.profileId}`) ?? '[]');
      if (!Array.isArray(saved) || !saved.every(x => typeof x === 'string')) throw new Error('invalid');
      setKeep(saved); setOpened(true);
    } catch { setError(c.storage); }
  }
  function toggle(name: string) {
    const next = keep.includes(name) ? keep.filter(n => n !== name) : [...keep, name];
    try { localStorage.setItem(`audience-keep-v1:${data.profileId}`, JSON.stringify(next)); setKeep(next); setError(''); }
    catch { setError(c.storage); }
  }
  const candidates = cleanupCandidates(data, isPremium ? snapshots : [], keep);
  const filtered = candidates.filter(a => filter === 'all' || a.category === filter);
  // Free users see the first FREE_PREVIEW_LIMIT candidates of the selected category only.
  const shownLimit = isPremium ? limit : Math.min(limit, FREE_PREVIEW_LIMIT);
  return <section className="my-6 rounded-2xl border border-pink-100 bg-white p-5 space-y-4">
    <h2 className="font-semibold">{c.title}</h2>
    {isPremium && previous ? <ChangeSummary a={previous.data} b={data} lang={lang} /> : <p className="text-sm text-zinc-500"><SentenceLines text={isPremium ? c.pending : premiumNotice[lang]} /></p>}
    <h3 className="font-semibold">{c.cleanup}</h3><p className="text-xs text-zinc-500"><SentenceLines text={c.warning} /></p>
    {!opened ? <button className="text-pink-600 underline" onClick={open}>{c.cleanup}</button> : <>
      <label className="block text-sm">{c.cleanup}<select className="block w-full border rounded p-2 mt-1" value={filter} onChange={e => { setFilter(e.target.value); setLimit(30); }}>
        <option value="all">{c.all} ({candidates.length})</option>
        {(['keep', 'recent', 'persistent', 'previouslyMutual', 'uncertain'] as const).map(key => <option key={key} value={key}>{c[key]} ({candidates.filter(a => a.category === key).length})</option>)}
      </select></label>
      <ul className="space-y-3">{filtered.slice(0, shownLimit).map(a => <li className="flex items-center justify-between gap-2 border-b pb-2" key={a.username}><div className="min-w-0"><p className="truncate">@{a.username}</p><p className="text-xs text-zinc-500"><SentenceLines text={c[a.category]} /></p></div><button className="text-sm text-pink-600" aria-label={`${keep.includes(a.username) ? c.restore : c.keep} @${a.username}`} onClick={() => toggle(a.username)}>{keep.includes(a.username) ? c.restore : c.keep}</button></li>)}</ul>
      {isPremium && filtered.length > limit && <button onClick={() => setLimit(n => n + 30)} className="text-pink-600">{c.more}</button>}
      {!isPremium && filtered.length > shownLimit && (
        <div className="rounded-xl border border-pink-100 bg-pink-50/60 p-3 text-center">
          <p className="text-sm text-zinc-700 mb-2"><SentenceLines text={t('dashboard.preview.locked', lang, { shown: shownLimit, total: filtered.length })} /></p>
          {onUnlock && <button onClick={onUnlock} data-cta="cleanup-gate-unlock" className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2 rounded-full">{t('dashboard.preview.unlock', lang, { total: filtered.length })}</button>}
        </div>
      )}
    </>}
    {error && <p role="alert"><SentenceLines text={error} /></p>}
  </section>;
}
