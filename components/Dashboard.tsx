'use client';

import { useState, useEffect, useCallback } from 'react';
import { t, type Lang } from '@/utils/i18n';
import { PremiumModal } from './PremiumModal';
import {
  type ParsedData,
  type InstagramAccount,
  computeNonFollowers,
  computeChanges,
  exportToCsv,
} from '@/utils/parser';

interface Snapshot {
  id: string;
  timestamp: number;
  data: ParsedData;
  label: string;
}

interface DashboardProps {
  data: ParsedData;
  lang: Lang;
  onReset?: () => void;
}

function AccountCard({ account }: { account: InstagramAccount }) {
  return (
    <a
      href={`https://instagram.com/${account.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group rounded-lg"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 select-none">
        {account.username[0]?.toUpperCase()}
      </div>
      <span className="text-sm font-medium text-zinc-800 group-hover:text-pink-600 transition-colors truncate">
        @{account.username}
      </span>
      <svg className="w-4 h-4 text-zinc-300 group-hover:text-pink-400 ml-auto flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function LockedOverlay({ lang, onUnlock }: { lang: Lang; onUnlock: () => void }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 backdrop-blur-sm bg-white/70 z-10 flex flex-col items-center justify-center rounded-xl gap-3">
        <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm text-zinc-600 text-center max-w-xs px-4">{t('dashboard.changes.locked', lang)}</p>
        <button
          onClick={onUnlock}
          className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
        >
          {t('dashboard.changes.unlock', lang)}
        </button>
      </div>
      {/* Blurred placeholder rows */}
      <div className="space-y-2 p-4 select-none pointer-events-none" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-zinc-200" />
            <div className="h-4 bg-zinc-200 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard({ data, lang, onReset }: DashboardProps) {
  const [tab, setTab] = useState<'nonfollowers' | 'changes'>('nonfollowers');
  const [isPremium, setIsPremium] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const [search, setSearch] = useState('');

  const nonFollowers = computeNonFollowers(data);

  const loadSnapshots = useCallback(() => {
    try {
      const raw = localStorage.getItem('snapshots');
      if (raw) setSnapshots(JSON.parse(raw));
    } catch {
      setSnapshots([]);
    }
  }, []);

  useEffect(() => {
    setIsPremium(localStorage.getItem('isPremium') === 'true');
    loadSnapshots();
  }, [loadSnapshots]);

  function saveSnapshot() {
    // Gate: free users can only have 1 snapshot
    if (!isPremium && snapshots.length >= 1) {
      setShowModal(true);
      return;
    }

    const newSnap: Snapshot = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      label: new Date().toLocaleDateString(),
      data,
    };

    const updated = [...snapshots, newSnap];
    localStorage.setItem('snapshots', JSON.stringify(updated));
    setSnapshots(updated);
    setSnapshotMsg(t('snapshots.saved', lang));
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotMsg(''), 3000);
  }

  const prevSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const changes = prevSnapshot ? computeChanges(prevSnapshot.data, data) : null;

  const filteredNonFollowers = nonFollowers.filter(a =>
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  function handleExport() {
    exportToCsv(nonFollowers, 'non-followers.csv');
  }

  function handlePremiumVerified() {
    setIsPremium(true);
    setShowModal(false);
  }

  return (
    <>
      {showModal && (
        <PremiumModal lang={lang} onClose={() => setShowModal(false)} onVerified={handlePremiumVerified} />
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-zinc-900">{data.following.length}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Following</div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-zinc-900">{data.followers.length}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Followers</div>
          </div>
          <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 col-span-2 sm:col-span-1">
            <div className="text-2xl font-bold text-pink-600">{nonFollowers.length}</div>
            <div className="text-xs text-pink-400 mt-0.5">Don't follow back</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={saveSnapshot}
            className="text-sm font-medium bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-full transition-colors"
          >
            {t('dashboard.snapshot.save', lang)}
          </button>

          {isPremium && (
            <button
              onClick={handleExport}
              className="text-sm font-medium border border-zinc-200 hover:border-zinc-400 text-zinc-700 px-4 py-2 rounded-full transition-colors"
            >
              {t('dashboard.export', lang)}
            </button>
          )}

          {!isPremium && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm font-medium border border-pink-200 text-pink-600 hover:bg-pink-50 px-4 py-2 rounded-full transition-colors"
            >
              {t('nav.premium', lang)} ✦
            </button>
          )}

          {snapshotMsg && (
            <span className="text-sm text-green-600 font-medium">{snapshotMsg}</span>
          )}
        </div>

        {/* Snapshot saved prompt */}
        {snapshotSaved && onReset && (
          <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-700 flex-1">{t('upload.snapshot_prompt', lang)}</p>
            <button
              onClick={onReset}
              className="text-xs font-semibold text-green-700 hover:text-green-800 underline underline-offset-2 transition-colors flex-shrink-0"
            >
              {t('upload.new_file', lang)} →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 mb-4">
          {(['nonfollowers', 'changes'] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === tabKey ? 'border-pink-600 text-pink-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
            >
              {t(`dashboard.tab.${tabKey}`, lang)}
              {tabKey === 'nonfollowers' && nonFollowers.length > 0 && (
                <span className="ml-1.5 bg-pink-100 text-pink-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {nonFollowers.length}
                </span>
              )}
              {tabKey === 'changes' && changes && (changes.newUnfollowers.length + changes.newFollowers.length) > 0 && (
                <span className="ml-1.5 bg-zinc-100 text-zinc-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {changes.newUnfollowers.length + changes.newFollowers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Non-followers */}
        {tab === 'nonfollowers' && (
          <div>
            {nonFollowers.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-sm">{t('dashboard.nonfollowers.empty', lang)}</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search accounts…"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-zinc-400 mb-2">
                  {t('dashboard.nonfollowers.count', lang, { count: nonFollowers.length })}
                </p>
                <div className="bg-white border border-zinc-100 rounded-xl divide-y divide-zinc-50 overflow-hidden">
                  {filteredNonFollowers.map(account => (
                    <AccountCard key={account.username} account={account} />
                  ))}
                  {filteredNonFollowers.length === 0 && (
                    <p className="text-sm text-zinc-400 text-center py-8">No results for "{search}"</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Changes */}
        {tab === 'changes' && (
          <div>
            {!prevSnapshot ? (
              <div className="text-center py-16 text-zinc-400">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-sm">Save a snapshot first, then upload a new file to see changes.</p>
              </div>
            ) : changes ? (
              !isPremium ? (
                <div className="space-y-4">
                  {/* Section count summaries — always visible for free users */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      {t('dashboard.changes.new_unfollowers', lang)}
                      <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {changes.newUnfollowers.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      {t('dashboard.changes.new_followers', lang)}
                      <span className="ml-auto text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {changes.newFollowers.length}
                      </span>
                    </div>
                  </div>
                  {/* Account lists locked */}
                  <div className="relative min-h-[250px]">
                    <LockedOverlay lang={lang} onUnlock={() => setShowModal(true)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* New unfollowers */}
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      {t('dashboard.changes.new_unfollowers', lang)}
                      <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {changes.newUnfollowers.length}
                      </span>
                    </h3>
                    {changes.newUnfollowers.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-4 text-center">No new unfollowers</p>
                    ) : (
                      <div className="bg-white border border-zinc-100 rounded-xl divide-y divide-zinc-50 overflow-hidden">
                        {changes.newUnfollowers.map(a => <AccountCard key={a.username} account={a} />)}
                      </div>
                    )}
                  </section>

                  {/* New followers */}
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      {t('dashboard.changes.new_followers', lang)}
                      <span className="ml-auto text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {changes.newFollowers.length}
                      </span>
                    </h3>
                    {changes.newFollowers.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-4 text-center">No new followers</p>
                    ) : (
                      <div className="bg-white border border-zinc-100 rounded-xl divide-y divide-zinc-50 overflow-hidden">
                        {changes.newFollowers.map(a => <AccountCard key={a.username} account={a} />)}
                      </div>
                    )}
                  </section>
                </div>
              )
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
