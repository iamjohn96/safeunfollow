'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { t, detectLang, type Lang } from '@/utils/i18n';
import { PremiumModal } from '@/components/PremiumModal';
import { Suspense } from 'react';

const conversionCopy = {
  en: {
    heroTrust: ['No login', 'No password', 'Instagram Data ZIP only'],
    trustHeading: 'Your account stays disconnected',
    trust: [
      { icon: '🔐', title: 'No Login Required', desc: 'No Instagram credentials requested.' },
      { icon: '🔑', title: 'No OAuth', desc: 'No access permission flow.' },
      { icon: '🚫', title: 'No API Access', desc: 'No Instagram API calls.' },
      { icon: '🔌', title: 'No Account Connection', desc: 'Your account stays disconnected.' },
      { icon: '📦', title: 'Instagram Data ZIP Based', desc: 'You choose the official export file.' },
      { icon: '🛡️', title: 'Privacy First', desc: 'Processing stays in your browser.' },
    ],
    comparisonSubtitle: 'Compare the workflow, account exposure, and effort—not just the result.',
    safeColumn: 'SafeUnfollow',
    loginColumn: 'Login-based apps',
    manualColumn: 'Manual spreadsheet',
    comparisonRows: [
      ['Login required', 'No', 'Yes', 'No'],
      ['Account connection', 'None', 'Required', 'None'],
      ['Ban risk', 'Zero — no account access', 'Account-access risk', 'None'],
      ['Privacy', 'Local browser processing', 'Account data shared with app', 'Local file handling'],
      ['Repeat snapshots', 'Unlimited with Premium', 'Varies by app', 'Manual copies'],
      ['CSV / history export', 'Included with Premium', 'Varies by app', 'Manual setup'],
    ],
    faqExtras: [
      { q: 'Is my data private?', a: 'Yes. Your Instagram data is processed locally in your browser and is not uploaded to SafeUnfollow servers.' },
      { q: 'What do I get with Premium?', a: 'Premium adds unlimited snapshots, change history, and CSV export. The workflow stays privacy-first with no Instagram login or account connection.' },
    ],
    howCta: 'Upload Your Instagram Data ZIP',
    howCtaNote: 'No login or password required',
    premiumEyebrow: 'Start free. Upgrade when you need history.',
    premiumSecondary: 'Run a free ZIP check first',
    premiumNote: 'Premium adds history—not account access. The same no-login, local ZIP workflow stays in place.',
  },
  ko: {
    heroTrust: ['로그인 없음', '비밀번호 입력 없음', 'Instagram 데이터 ZIP만 사용'],
    trustHeading: 'Instagram 계정은 연결되지 않습니다',
    trust: [
      { icon: '🔐', title: '로그인 필요 없음', desc: 'Instagram 로그인 정보를 요청하지 않습니다.' },
      { icon: '🔑', title: 'OAuth 없음', desc: '계정 접근 권한을 요구하지 않습니다.' },
      { icon: '🚫', title: 'API 접근 없음', desc: 'Instagram API를 호출하지 않습니다.' },
      { icon: '🔌', title: '계정 연결 없음', desc: 'Instagram 계정과 연결하지 않습니다.' },
      { icon: '📦', title: 'Instagram 데이터 ZIP 기반', desc: '공식 내보내기 파일을 직접 선택합니다.' },
      { icon: '🛡️', title: '개인정보 보호 중심', desc: '브라우저에서 로컬로 처리합니다.' },
    ],
    comparisonSubtitle: '결과뿐 아니라 이용 방식, 계정 노출, 반복 작업 부담까지 비교하세요.',
    safeColumn: 'SafeUnfollow',
    loginColumn: '로그인 기반 앱',
    manualColumn: '수동 스프레드시트',
    comparisonRows: [
      ['로그인 필요', '없음', '필요', '없음'],
      ['계정 연결', '없음', '필요', '없음'],
      ['계정 정지 위험', '없음 — 계정 접근 없음', '계정 접근에 따른 위험', '없음'],
      ['개인정보 보호', '브라우저 로컬 처리', '앱에 계정 데이터 제공', '로컬 파일 관리'],
      ['반복 스냅샷', '프리미엄에서 무제한', '앱마다 다름', '매번 직접 복사'],
      ['CSV / 변경 이력', '프리미엄에 포함', '앱마다 다름', '직접 구성'],
    ],
    faqExtras: [
      { q: '내 데이터는 비공개로 처리되나요?', a: '네. Instagram 데이터는 브라우저에서 로컬로 처리되며 SafeUnfollow 서버로 업로드되지 않습니다.' },
      { q: '프리미엄에서는 무엇을 이용할 수 있나요?', a: '무제한 스냅샷, 변경 이력, CSV 내보내기를 이용할 수 있습니다. Instagram 로그인이나 계정 연결 없는 개인정보 보호 중심 방식은 그대로 유지됩니다.' },
    ],
    howCta: 'Instagram 데이터 ZIP 업로드',
    howCtaNote: '로그인이나 비밀번호 입력이 필요 없습니다',
    premiumEyebrow: '무료로 시작하고, 기록이 필요할 때 업그레이드하세요.',
    premiumSecondary: '먼저 무료로 ZIP 확인하기',
    premiumNote: '프리미엄은 계정 접근이 아니라 기록 기능을 추가합니다. 로그인 없는 로컬 ZIP 방식은 그대로 유지됩니다.',
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

  const baseFaqs = [
    { q: t('faq.q1', lang), a: t('faq.a1', lang) },
    { q: t('faq.q2', lang), a: t('faq.a2', lang) },
    { q: t('faq.q3', lang), a: t('faq.a3', lang) },
    { q: t('faq.q4', lang), a: t('faq.a4', lang) },
  ];
  const faqs = localizedConversionCopy ? [...baseFaqs, ...localizedConversionCopy.faqExtras] : baseFaqs;

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
      <section id="hero" data-section="hero" className="bg-white border-b border-zinc-100" aria-labelledby="hero-heading">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 text-center">
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
              href={`${localizedConversionCopy ? '/upload' : '/guide'}${langParam}`}
              data-cta={localizedConversionCopy ? 'upload-zip' : 'request-data-guide'}
              data-cta-location="hero"
              className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors shadow-lg shadow-pink-200"
            >
              {t('hero.cta', lang)}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href={`${localizedConversionCopy ? '/guide' : '/upload'}${langParam}`}
              data-cta={localizedConversionCopy ? 'request-data-guide' : 'upload-zip'}
              data-cta-location="hero"
              className="inline-flex items-center justify-center border border-zinc-200 bg-white hover:border-pink-200 hover:text-pink-600 text-zinc-700 font-semibold px-7 py-3.5 rounded-full text-sm transition-colors"
            >
              {t('hero.cta_secondary', lang)}
            </Link>
          </div>

          {localizedConversionCopy ? (
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-500" aria-label={t('hero.badge', lang)}>
              {localizedConversionCopy.heroTrust.map((signal) => (
                <li key={signal} className="flex items-center gap-1.5">
                  <span className="text-green-600" aria-hidden="true">✓</span>
                  {signal}
                </li>
              ))}
            </ul>
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
        <section id="trust" data-section="trust-badges" className="border-b border-zinc-100 bg-zinc-50 py-10" aria-labelledby="trust-heading">
          <div className="max-w-5xl mx-auto px-4">
            <h2 id="trust-heading" className="text-lg font-bold text-zinc-900 text-center mb-6">
              {localizedConversionCopy.trustHeading}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {localizedConversionCopy.trust.map((badge) => (
                <div key={badge.title} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xl" aria-hidden="true">{badge.icon}</div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 mb-1">{badge.title}</h3>
                    <p className="text-xs leading-relaxed text-zinc-500">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" data-section="how-it-works" className="py-20 max-w-4xl mx-auto px-4" aria-labelledby="how-heading">
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
        {localizedConversionCopy && (
          <div className="mt-10 text-center">
            <Link
              href={`/upload${langParam}`}
              data-cta="upload-zip"
              data-cta-location="how-it-works"
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors"
            >
              {localizedConversionCopy.howCta}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-3 text-xs text-zinc-400">{localizedConversionCopy.howCtaNote}</p>
          </div>
        )}
      </section>

      {/* Features / comparison */}
      <section id="comparison" data-section="feature-comparison" className="py-16 bg-white border-y border-zinc-100" aria-labelledby="features-heading">
        <div className="max-w-5xl mx-auto px-4">
          <h2 id="features-heading" className="text-2xl font-bold text-zinc-900 text-center mb-10">
            {t('features.title', lang)}
          </h2>
          {localizedConversionCopy ? (
            <>
              <p className="text-sm text-zinc-500 text-center max-w-2xl mx-auto -mt-6 mb-8 leading-relaxed">
                {localizedConversionCopy.comparisonSubtitle}
              </p>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm">
                <table className="w-full min-w-[760px] border-collapse text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-900 text-white">
                    <tr>
                      <th scope="col" className="p-3 sm:p-4"><span className="sr-only">Criteria</span></th>
                      <th scope="col" className="p-3 sm:p-4 bg-pink-600">{localizedConversionCopy.safeColumn}</th>
                      <th scope="col" className="p-3 sm:p-4 text-zinc-300">{localizedConversionCopy.loginColumn}</th>
                      <th scope="col" className="p-3 sm:p-4 text-zinc-300">{localizedConversionCopy.manualColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localizedConversionCopy.comparisonRows.map(([label, safe, loginBased, manual]) => (
                      <tr key={label} className="border-t border-zinc-100">
                        <th scope="row" className="p-3 sm:p-4 font-semibold text-zinc-700 bg-zinc-50">{label}</th>
                        <td className="p-3 sm:p-4 font-medium text-zinc-800 bg-pink-50/50">
                          <span className="text-green-600 mr-1.5" aria-hidden="true">✓</span>{safe}
                        </td>
                        <td className="p-3 sm:p-4 text-zinc-500">{loginBased}</td>
                        <td className="p-3 sm:p-4 text-zinc-500">{manual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      <section id="faq" data-section="faq" className="py-20 max-w-2xl mx-auto px-4" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold text-zinc-900 text-center mb-10">
          {t('faq.title', lang)}
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
              <button
                id={`faq-question-${i}`}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-zinc-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                aria-expanded={openFaq === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="text-sm font-semibold text-zinc-900">{faq.q}</span>
                <span className={`text-zinc-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-45' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
              <div
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
                hidden={openFaq !== i}
                className="px-5 pb-4"
              >
                <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Premium upsell */}
      <section id="premium" data-section="premium-conversion" className="py-16 bg-gradient-to-br from-pink-600 to-rose-600 text-white" aria-labelledby="premium-heading">
        <div className="max-w-2xl mx-auto px-4 text-center">
          {localizedConversionCopy && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70 mb-3">
              {localizedConversionCopy.premiumEyebrow}
            </p>
          )}
          <h2 id="premium-heading" className="text-2xl font-bold mb-3">{t('premium.title', lang)}</h2>
          <p className="text-white/80 text-sm mb-6">{t('premium.subtitle', lang)}</p>
          <ul className="grid sm:grid-cols-3 gap-3 mb-8 text-sm text-left">
            <li className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
              {t('premium.feature1', lang)}
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
              {t('premium.feature2', lang)}
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
              {t('premium.feature3', lang)}
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              data-cta="premium-upgrade"
              data-cta-location="premium-section"
              className="bg-white text-pink-600 font-bold px-7 py-3.5 rounded-full text-sm hover:bg-pink-50 transition-colors shadow-lg"
            >
              {t('premium.cta', lang)} — {t('premium.yearly', lang)}
              <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">{t('premium.save', lang)}</span>
            </button>
            {localizedConversionCopy && (
              <Link
                href={`/upload${langParam}`}
                data-cta="free-zip-check"
                data-cta-location="premium-section"
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
