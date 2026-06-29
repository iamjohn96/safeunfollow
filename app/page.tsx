'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { t, detectLang, type Lang } from '@/utils/i18n';
import { PremiumModal } from '@/components/PremiumModal';
import { Suspense } from 'react';

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
              className="text-sm text-zinc-500 hover:text-pink-600 font-medium transition-colors"
            >
              {t('hero.cta_secondary', lang)}
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> {t('trust.no_login', lang)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> {t('trust.no_ban_risk', lang)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> {t('trust.private', lang)}
            </span>
          </div>
        </div>
      </section>

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

      {/* Features */}
      <section className="py-16 bg-white border-y border-zinc-100" aria-labelledby="features-heading">
        <div className="max-w-4xl mx-auto px-4">
          <h2 id="features-heading" className="text-2xl font-bold text-zinc-900 text-center mb-10">
            {t('features.title', lang)}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-pink-50 hover:border-pink-100 transition-all">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
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
          </div>
          <p className="mt-4 text-white/60 text-xs">
            {t('premium.monthly_available', lang, { price: t('premium.monthly', lang) })}
          </p>
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
