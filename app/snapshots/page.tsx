'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { t, type Lang } from '@/utils/i18n';
import { type ParsedData } from '@/utils/parser';
import { compareAudience, decodeSnapshots } from '@/utils/audience';
import { audienceCopy } from '@/utils/audience-copy';
import { ChangeSummary } from '@/components/AudienceInsights';
import { PremiumModal } from '@/components/PremiumModal';
import { usePremium } from '@/utils/use-premium';

interface Snapshot {
  id: string;
  timestamp: number;
  label: string;
  data: ParsedData;
}

function SnapshotCard({
  snap,
  isSelected,
  onSelect,
  onDelete,
  lang,
}: {
  snap: Snapshot;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  lang: Lang;
}) {
  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all flex items-center gap-4 ${
        isSelected ? 'border-pink-300 ring-1 ring-pink-200' : 'border-zinc-100 hover:border-zinc-200'
      }`}
    >
      <button
        onClick={onSelect}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected ? 'border-pink-500 bg-pink-500' : 'border-zinc-200'
        }`}
        aria-pressed={isSelected}
        aria-label={`Select snapshot from ${snap.label}`}
      >
        {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900">{snap.label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {snap.data.following.length} following · {snap.data.followers.length} followers
        </p>
      </div>

      <button
        onClick={onDelete}
        className="text-xs text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
        aria-label={`Delete snapshot from ${snap.label}`}
      >
        {t('snapshots.delete', lang)}
      </button>
    </div>
  );
}

function SnapshotsContent({ initialLang }: { initialLang: Lang }) {
  const lang = initialLang;
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPremium, setIsPremium] = usePremium();
  const [showModal, setShowModal] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('snapshots');
      // Restore browser-only snapshot history after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSnapshots(decodeSnapshots(raw));
    } catch {
      setSnapshots([]);
      setStorageError(true);
    }
  }, []);

  function deleteSnapshot(id: string) {
    const updated = snapshots.filter(s => s.id !== id);
    try {
      localStorage.setItem('snapshots', JSON.stringify(updated));
      setSnapshots(updated);
      setSelected(prev => prev.filter(s => s !== id));
      setStorageError(false);
    } catch { setStorageError(true); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const langParam = lang !== 'en' ? `?lang=${lang}` : '';
  const localHistory = {
    en: 'This history stays only in this browser and device. Clearing site data, private browsing, or switching devices can remove or hide it.',
    pt: 'Este histórico fica somente neste navegador e dispositivo. Limpar dados do site, usar navegação privada ou trocar de dispositivo pode removê-lo.',
    ru: 'История хранится только в этом браузере и на этом устройстве. Очистка данных сайта, приватный режим или смена устройства могут удалить её.',
    es: 'Este historial queda solo en este navegador y dispositivo. Borrar los datos del sitio, usar navegación privada o cambiar de dispositivo puede eliminarlo.',
  }[lang];

  // Comparison results
  const ordered = snapshots.filter(s => selected.includes(s.id)).sort((a, b) => (a.data.observedAt ?? a.timestamp) - (b.data.observedAt ?? b.timestamp));
  const compareA = ordered[0];
  const compareB = ordered[1];
  const changes = compareA && compareB ? compareAudience(compareA.data, compareB.data) : null;

  return (
    <>
      {showModal && (
        <PremiumModal
          lang={lang}
          onClose={() => setShowModal(false)}
          onVerified={() => { setIsPremium(true); setShowModal(false); }}
        />
      )}

      <section className="max-w-2xl mx-auto px-4 py-10" aria-labelledby="snapshots-heading">
        {storageError && <p role="alert">{audienceCopy[lang].storage}</p>}
        <div className="mb-8">
          <h1 id="snapshots-heading" className="text-2xl font-bold text-zinc-900 mb-1">
            {t('snapshots.title', lang)}
          </h1>
          <p className="text-sm text-zinc-500">{t('snapshots.subtitle', lang)}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{localHistory}</p>
        </div>

        {!isPremium && snapshots.length >= 1 && (
          <div className="mb-6 p-4 bg-pink-50 border border-pink-100 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-pink-700 flex-1">{t('snapshots.limit', lang)}</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 transition-colors flex-shrink-0"
            >
              Upgrade →
            </button>
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <div className="text-4xl mb-3">📸</div>
            <p className="text-sm mb-4">{t('snapshots.empty', lang)}</p>
            <Link
              href={`/upload${langParam}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink-600 hover:text-pink-700 transition-colors"
            >
              Upload now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {snapshots.map(snap => (
              <SnapshotCard
                key={snap.id}
                snap={snap}
                isSelected={selected.includes(snap.id)}
                onSelect={() => toggleSelect(snap.id)}
                onDelete={() => deleteSnapshot(snap.id)}
                lang={lang}
              />
            ))}
          </div>
        )}

        {/* Compare results */}
        {selected.length === 2 && (
          <div className="mt-4">
            {!isPremium ? (
              <div className="p-6 bg-white border border-zinc-100 rounded-2xl text-center">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-600 mb-3">{t('dashboard.changes.locked', lang)}</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
                >
                  {t('dashboard.changes.unlock', lang)}
                </button>
              </div>
            ) : changes ? (
              <div className="space-y-6 bg-white border border-zinc-100 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-zinc-700">
                  Comparing: {compareA?.label} → {compareB?.label}
                </h2>

                <ChangeSummary a={compareA.data} b={compareB.data} lang={lang} />
                <section>
                  <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    {t('dashboard.changes.new_unfollowers', lang)}
                    <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                      {changes.newUnfollowers.length}
                    </span>
                  </h3>
                  {changes.newUnfollowers.length === 0 ? (
                    <p className="text-sm text-zinc-400">No new unfollowers</p>
                  ) : (
                    <ul className="space-y-1">
                      {changes.newUnfollowers.map(a => (
                        <li key={a.username}>
                          <a
                            href={`https://instagram.com/${a.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-zinc-700 hover:text-pink-600 transition-colors"
                          >
                            @{a.username}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    {t('dashboard.changes.new_followers', lang)}
                    <span className="ml-auto text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                      {changes.newFollowers.length}
                    </span>
                  </h3>
                  {changes.newFollowers.length === 0 ? (
                    <p className="text-sm text-zinc-400">No new followers</p>
                  ) : (
                    <ul className="space-y-1">
                      {changes.newFollowers.map(a => (
                        <li key={a.username}>
                          <a
                            href={`https://instagram.com/${a.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-zinc-700 hover:text-green-600 transition-colors"
                          >
                            @{a.username}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : <p role="status" className="text-sm text-amber-700">{audienceCopy[lang].legacy}</p>}
          </div>
        )}

        {selected.length === 1 && snapshots.length >= 2 && (
          <p className="text-xs text-zinc-400 text-center mt-2">Select one more snapshot to compare</p>
        )}
      </section>
    </>
  );
}

export default function SnapshotsPage({ initialLang = 'en' }: { initialLang?: Lang }) {
  return <SnapshotsContent initialLang={initialLang} />;
}
