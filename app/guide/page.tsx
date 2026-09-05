'use client';

import Link from 'next/link';
import { t, localizedPath, type Lang } from '@/utils/i18n';
import { trackFunnel } from '@/utils/analytics';

const stepIcons = ['⚙️', '☑️', '📤', '📥'];

function GuideContent({ initialLang }: { initialLang: Lang }) {
  const lang = initialLang;

  const steps = [
    { title: t('guide.step1.title', lang), desc: t('guide.step1.desc', lang) },
    { title: t('guide.step2.title', lang), desc: t('guide.step2.desc', lang) },
    { title: t('guide.step3.title', lang), desc: t('guide.step3.desc', lang) },
    { title: t('guide.step4.title', lang), desc: t('guide.step4.desc', lang) },
  ];

  return (
    <section className="py-16 px-4 max-w-2xl mx-auto" aria-labelledby="guide-heading">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          Step-by-step guide
        </div>
        <h1 id="guide-heading" className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-3">
          {t('guide.title', lang)}
        </h1>
        <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
          {t('guide.subtitle', lang)}
        </p>
      </div>

      {/* Steps */}
      <ol className="space-y-4 mb-10" aria-label="Steps to download Instagram data">
        {steps.map((step, i) => (
          <li
            key={i}
            className="bg-white border border-zinc-100 rounded-2xl p-6 hover:border-pink-100 hover:shadow-sm transition-all flex gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-lg">
              {stepIcons[i]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-300 tracking-widest mb-1">
                STEP 0{i + 1}
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 mb-1">{step.title}</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-sm text-amber-700 leading-relaxed">
        <strong className="font-semibold">Note:</strong> Instagram typically sends an email notification when your data export is ready. Check your inbox for a link to download the ZIP file.
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href={localizedPath('/upload', lang)}
          onClick={() => trackFunnel('guide_upload_click', lang)}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors shadow-lg shadow-pink-200"
        >
          {t('guide.cta', lang)}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
        <p className="mt-3 text-xs text-zinc-400">No account login required</p>
      </div>
    </section>
  );
}

export default function GuidePage({ initialLang = 'en' }: { initialLang?: Lang }) {
  return <GuideContent initialLang={initialLang} />;
}
