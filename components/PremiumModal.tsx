'use client';

import { useState } from 'react';
import { t, type Lang } from '@/utils/i18n';
import { trackFunnel } from '@/utils/analytics';

interface PremiumModalProps {
  lang: Lang;
  onClose: () => void;
  onVerified: () => void;
}

export function PremiumModal({ lang, onClose, onVerified }: PremiumModalProps) {
  const [email, setEmail] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'success' | 'fail'>('idle');
  const [tab, setTab] = useState<'yearly' | 'monthly'>('yearly');

  const monthlyUrl = process.env.NEXT_PUBLIC_DODO_MONTHLY_URL ?? '#';
  const yearlyUrl = process.env.NEXT_PUBLIC_DODO_YEARLY_URL ?? '#';

  async function handleVerify() {
    if (!email.includes('@')) return;
    setVerifyState('loading');
    try {
      const res = await fetch(`/api/premium/check?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.isPremium) {
        localStorage.setItem('isPremium', 'true');
        localStorage.setItem('premiumEmail', email);
        setVerifyState('success');
        setTimeout(onVerified, 1200);
      } else {
        setVerifyState('fail');
      }
    } catch {
      setVerifyState('fail');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 px-6 pt-6 pb-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label={t('common.close', lang)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-bold mb-1">{t('modal.title', lang)}</h2>
          <p className="text-sm text-white/80">{t('modal.subtitle', lang)}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Features */}
          <ul className="space-y-2">
            {(['modal.feature1', 'modal.feature2', 'modal.feature3'] as const).map(key => (
              <li key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">✓</span>
                {t(key, lang)}
              </li>
            ))}
          </ul>

          {/* Plan toggle */}
          <div className="bg-zinc-50 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setTab('yearly')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'yearly' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {t('modal.yearly_label', lang)}
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{t('modal.yearly_save', lang)}</span>
            </button>
            <button
              onClick={() => setTab('monthly')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'monthly' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {t('modal.monthly_label', lang)}
            </button>
          </div>

          {/* CTA button */}
          <a
            href={tab === 'yearly' ? yearlyUrl : monthlyUrl}
            onClick={() => trackFunnel('premium_checkout_click', lang, { plan: tab })}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {tab === 'yearly' ? t('modal.buy_yearly', lang) : t('modal.buy_monthly', lang)}
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex-1 border-t border-zinc-200" />
            {t('modal.verify_title', lang)}
            <span className="flex-1 border-t border-zinc-200" />
          </div>

          {/* Email verify */}
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setVerifyState('idle'); }}
              placeholder={t('modal.verify_placeholder', lang)}
              className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
            />
            <button
              onClick={handleVerify}
              disabled={verifyState === 'loading' || !email.includes('@')}
              className="bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {verifyState === 'loading' ? '…' : t('modal.verify_btn', lang)}
            </button>
          </div>

          {verifyState === 'success' && (
            <p className="text-sm text-green-600 font-medium text-center">{t('modal.verify_success', lang)}</p>
          )}
          {verifyState === 'fail' && (
            <p className="text-sm text-red-500 text-center">{t('modal.verify_fail', lang)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
