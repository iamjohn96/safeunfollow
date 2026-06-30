'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { t, detectLang, type Lang } from '@/utils/i18n';
import { PremiumModal } from '@/components/PremiumModal';
import { Suspense } from 'react';

const conversionCopy = {
  en: {
    heroFlowLabel: 'The safe two-step workflow',
    heroFlow: ['Request Instagram Data', 'Upload the ZIP to SafeUnfollow'],
    trust: [
      { icon: '🔐', title: 'No Login or Connection', desc: 'Your Instagram credentials are never requested.' },
      { icon: '🚫', title: 'No OAuth or Instagram API', desc: 'SafeUnfollow never asks for account access.' },
      { icon: '🛡️', title: 'Zero Ban Risk', desc: 'Nothing logs in, follows, unfollows, or acts on your account.' },
      { icon: '📦', title: 'Data ZIP Workflow', desc: 'You choose the official Instagram export to analyze.' },
    ],
    comparisonSubtitle: 'SafeUnfollow analyzes a file you control. Login-based apps need some form of account access.',
    safeColumn: 'SafeUnfollow',
    alternativeColumn: 'Login-based apps',
    comparisonRows: [
      ['Instagram login', 'Not required', 'Required'],
      ['OAuth / account connection', 'Never', 'Often required'],
      ['Instagram API', 'Not used', 'May be used'],
      ['How it works', 'You upload an Instagram data ZIP', 'The app accesses your account'],
      ['Automated account activity', 'None', 'Varies by app'],
      ['Account ban risk', 'Zero — no account access', 'Account-access risk'],
    ],
    premiumEyebrow: 'Start free. Upgrade when you need history.',
    premiumSecondary: 'Run a free ZIP check first',
    premiumNote: 'Premium adds change tracking and exports. It never changes the no-login, no-account-connection workflow.',
  },
  ko: {
    heroFlowLabel: '안전한 2단계 이용 방식',
    heroFlow: ['Instagram 데이터 요청', 'SafeUnfollow에 ZIP 업로드'],
    trust: [
      { icon: '🔐', title: '로그인·계정 연결 없음', desc: 'Instagram 로그인 정보를 요청하지 않습니다.' },
      { icon: '🚫', title: 'OAuth·Instagram API 없음', desc: 'SafeUnfollow는 계정 접근 권한을 요구하지 않습니다.' },
      { icon: '🛡️', title: '계정 정지 위험 없음', desc: '계정에 로그인하거나 자동 활동을 수행하지 않습니다.' },
      { icon: '📦', title: '데이터 ZIP 기반', desc: '공식 Instagram 내보내기 파일을 직접 선택해 분석합니다.' },
    ],
    comparisonSubtitle: 'SafeUnfollow는 사용자가 직접 선택한 파일만 분석합니다. 로그인 기반 앱은 계정 접근이 필요합니다.',
    safeColumn: 'SafeUnfollow',
    alternativeColumn: '로그인 기반 언팔 앱',
    comparisonRows: [
      ['Instagram 로그인', '필요 없음', '필요'],
      ['OAuth / 계정 연결', '사용 안 함', '주로 필요'],
      ['Instagram API', '사용 안 함', '사용할 수 있음'],
      ['작동 방식', 'Instagram 데이터 ZIP 직접 업로드', '앱이 계정에 접근'],
      ['자동화된 계정 활동', '없음', '앱마다 다름'],
      ['계정 정지 위험', '없음 — 계정 접근 없음', '계정 접근에 따른 위험'],
    ],
    premiumEyebrow: '무료로 시작하고, 기록이 필요할 때 업그레이드하세요.',
    premiumSecondary: '먼저 무료로 ZIP 확인하기',
    premiumNote: '프리미엄은 변경 추적과 내보내기 기능을 추가합니다. 로그인·계정 연결 없는 방식은 그대로 유지됩니다.',
  },
} as const;

function LandingContent() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>('en');
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    // Locale detection depends on browser APIs and must run after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLang(searchParams));
  }, [searchParams]);

  const langParam = lang !== 'en' ? `?lang=${lang}` : '';
  const localizedConversionCopy = lang === 'en' || lang === 'ko' ? conversionCopy[lang] : null;

  const faqs = [
    { q: t('faq.q1', lang), a: t('faq.a1', lang) },
    { q: t('faq.q2', lang), a: t('faq.a2', lang) },
    { q: t('faq.q3', lang), a: t('faq.a3', lang) },
    { q: t('faq.q4', lang), a: t('faq.a4', lang) },
  ];

  const howSteps = [
    {
      num: '01',
      title: t('how.step1.title', lang),
      desc: t('how.step1.desc', lang),
      icon: '📥',
    },
    {
      num: '02',
      title: t('how.step2.title', lang),
      desc: t('how.step2.desc', lang),
      icon: '📂',
    },
    {
      num: '03',
      title: t('how.step3.title', lang),
      desc: t('how.step3.desc', lang),
      icon: '⬆️',
    },
    {
      num: '04',
      title: t('how.step4.title', lang),
      desc: t('how.step4.desc', lang),
      icon: '✅',
    },
  ];
  const visibleHowSteps = lang === 'en' || lang === 'ko' ? howSteps : howSteps.slice(0, 3);

  const features = [
    {
      icon: '🛡️',
      title: t('features.safe.title', lang),
      desc: t('features.safe.desc', lang),
    },
    {
      icon: '🔒',
      title: t('features.private.title', lang),
      desc: t('features.private.desc', lang),
    },
    {
      icon: '⚡',
      title: t('features.instant.title', lang),
      desc: t('features.instant.desc', lang),
    },
  ];

  return (
    <>
      {showModal && (
        <PremiumModal lang={lang} onClose={() => setShowModal(false)} onVerified={() => setShowModal(false)} />
      )}

      {/* Hero */}
      <section className="bg-white border-b border-zinc-100" aria-labelledby="hero-heading">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 text-pink-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
            {t('hero.badge', lang)}
          </div>

          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight tracking-tight mb-5">
            {t('hero.headline', lang)}
          </h1>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-8 leading-relaxed">
            {t('hero.subheadline', lang)}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/guide${langParam}`}
              className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors shadow-lg shadow-pink-200"
            >
              {t('hero.cta', lang)}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href={`/upload${langParam}`}
              className="inline-flex items-center justify-center border border-zinc-200 bg-white hover:border-pink-200 hover:text-pink-600 text-zinc-700 font-semibold px-7 py-3.5 rounded-full text-sm transition-colors"
            >
              {t('hero.cta_secondary', lang)}
            </Link>
          </div>

          {localizedConversionCopy ? (
            <div className="mt-10 max-w-2xl mx-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 text-left">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400 text-center mb-4">
                {localizedConversionCopy.heroFlowLabel}
              </p>
              <ol className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-3" aria-label={localizedConversionCopy.heroFlowLabel}>
                {localizedConversionCopy.heroFlow.map((step, index) => (
                  <li key={step} className="contents">
                    <div className="flex items-center gap-3 rounded-xl bg-white border border-zinc-100 px-4 py-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-zinc-800">{step}</span>
                    </div>
                    {index === 0 && <span className="hidden sm:block text-zinc-300" aria-hidden="true">→</span>}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> {t('trust.no_login', lang)}</span>
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> {t('trust.no_ban_risk', lang)}</span>
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> {t('trust.private', lang)}</span>
            </div>
          )}
        </div>
      </section>

      {localizedConversionCopy && (
        <section className="border-b border-zinc-100 bg-white py-10" aria-label={t('hero.badge', lang)}>
          <div className="max-w-5xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {localizedConversionCopy.trust.map((badge) => (
              <div key={badge.title} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="text-xl mb-3" aria-hidden="true">{badge.icon}</div>
                <h2 className="text-sm font-bold text-zinc-900 mb-1">{badge.title}</h2>
                <p className="text-xs leading-relaxed text-zinc-500">{badge.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 max-w-4xl mx-auto px-4" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-bold text-zinc-900 text-center mb-12">
          {t('how.title', lang)}
        </h2>
        <div className={`grid gap-6 ${visibleHowSteps.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {visibleHowSteps.map((step, i) => (
            <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-6 text-center hover:border-pink-200 hover:shadow-sm transition-all">
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="text-xs font-bold text-zinc-300 mb-2 tracking-widest">{step.num}</div>
              <h3 className="text-base font-semibold text-zinc-900 mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features / comparison */}
      <section className="py-16 bg-white border-y border-zinc-100" aria-labelledby="features-heading">
        <div className="max-w-4xl mx-auto px-4">
          <h2 id="features-heading" className="text-2xl font-bold text-zinc-900 text-center mb-10">
            {t('features.title', lang)}
          </h2>
          {localizedConversionCopy ? (
            <>
              <p className="text-sm text-zinc-500 text-center max-w-2xl mx-auto -mt-6 mb-8 leading-relaxed">
                {localizedConversionCopy.comparisonSubtitle}
              </p>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
                <div className="grid grid-cols-[1.15fr_1fr_1fr] bg-zinc-900 text-white text-xs sm:text-sm font-bold">
                  <div className="p-3 sm:p-4" />
                  <div className="p-3 sm:p-4 bg-pink-600">{localizedConversionCopy.safeColumn}</div>
                  <div className="p-3 sm:p-4 text-zinc-300">{localizedConversionCopy.alternativeColumn}</div>
                </div>
                {localizedConversionCopy.comparisonRows.map(([label, safe, alternative]) => (
                  <div key={label} className="grid grid-cols-[1.15fr_1fr_1fr] border-t border-zinc-100 text-xs sm:text-sm">
                    <div className="p-3 sm:p-4 font-semibold text-zinc-700 bg-zinc-50">{label}</div>
                    <div className="p-3 sm:p-4 text-zinc-800 bg-pink-50/50"><span className="text-green-600 mr-1.5">✓</span>{safe}</div>
                    <div className="p-3 sm:p-4 text-zinc-500"><span className="text-zinc-300 mr-1.5">—</span>{alternative}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid sm:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-pink-50 hover:border-pink-100 transition-all">
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <h3 className="text-base font-semibold text-zinc-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 max-w-2xl mx-auto px-4" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold text-zinc-900 text-center mb-10">
          {t('faq.title', lang)}
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-zinc-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                aria-expanded={openFaq === i}
              >
                <span className="text-sm font-semibold text-zinc-900">{faq.q}</span>
                <span className={`text-zinc-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-45' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Premium upsell */}
      <section className="py-16 bg-gradient-to-br from-pink-600 to-rose-600 text-white">
        <div className="max-w-xl mx-auto px-4 text-center">
          {localizedConversionCopy && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70 mb-3">
              {localizedConversionCopy.premiumEyebrow}
            </p>
          )}
          <h2 className="text-2xl font-bold mb-3">{t('premium.title', lang)}</h2>
          <p className="text-white/80 text-sm mb-6">{t('premium.subtitle', lang)}</p>
          <ul className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
              {t('premium.feature1', lang)}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
              {t('premium.feature2', lang)}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
              {t('premium.feature3', lang)}
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-pink-600 font-bold px-7 py-3.5 rounded-full text-sm hover:bg-pink-50 transition-colors shadow-lg"
            >
              {t('premium.cta', lang)} — {t('premium.yearly', lang)}
              <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">{t('premium.save', lang)}</span>
            </button>
            {localizedConversionCopy && (
              <Link
                href={`/upload${langParam}`}
                className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4 transition-colors"
              >
                {localizedConversionCopy.premiumSecondary}
              </Link>
            )}
          </div>
          <p className="mt-4 text-white/60 text-xs">
            {t('premium.monthly_available', lang, { price: t('premium.monthly', lang) })}
          </p>
          {localizedConversionCopy && (
            <p className="mt-3 text-white/70 text-xs leading-relaxed">{localizedConversionCopy.premiumNote}</p>
          )}
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
