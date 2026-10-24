import Link from 'next/link';
import { localizedPath, type Lang } from '@/utils/i18n';
import { JsonLd } from '@/components/JsonLd';
import { SentenceLines } from '@/components/SentenceLines';
import { faqStructuredData } from '@/lib/structured-data';
import { landingCopy, landingHowTo, type LandingPlatform } from '@/lib/platform-landing-copy';

// Static landing page per supported platform. The FAQPage and HowTo schemas mirror only the FAQs and steps rendered here.
export function PlatformLanding({ platform, lang }: { platform: LandingPlatform; lang: Lang }) {
  const copy = landingCopy(platform, lang);
  const uploadHref = localizedPath('/upload', lang);
  return (
    <>
      <JsonLd data={faqStructuredData(copy.faq)} />
      <JsonLd data={landingHowTo(platform, lang)} />
      <section className="py-16 px-4 max-w-2xl mx-auto" aria-labelledby="landing-heading">
        <div className="text-center mb-10">
          <h1 id="landing-heading" className="text-3xl font-bold text-zinc-900 mb-4">{copy.h1}</h1>
          <p className="text-base text-zinc-500 leading-relaxed"><SentenceLines text={copy.intro} /></p>
          <div className="mt-6">
            <Link href={uploadHref} className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors shadow-lg shadow-pink-200">
              {copy.cta}
            </Link>
            <p className="mt-3 text-xs text-zinc-400"><SentenceLines text={copy.ctaNote} /></p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-zinc-900 mb-4">{copy.stepsHeading}</h2>
        <ol className="space-y-3 mb-10">
          {copy.steps.map((step, i) => (
            <li key={step.title} className="bg-white border border-zinc-100 rounded-2xl p-5 flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-sm font-bold text-pink-600">{i + 1}</div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed"><SentenceLines text={step.desc} /></p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="text-lg font-bold text-zinc-900 mb-4">{copy.featuresHeading}</h2>
        <ul className="grid gap-2 sm:grid-cols-2 mb-6">
          {copy.features.map(feature => (
            <li key={feature} className="flex items-start gap-2 text-sm text-zinc-600"><span className="text-green-600">✓</span>{feature}</li>
          ))}
        </ul>
        <p className="mb-10 rounded-xl border border-pink-100 bg-pink-50/60 p-4 text-sm text-zinc-600 leading-relaxed"><SentenceLines text={copy.privacy} /></p>

        <h2 className="text-lg font-bold text-zinc-900 mb-4">{copy.faqHeading}</h2>
        <div className="space-y-4 mb-10">
          {copy.faq.map(item => (
            <div key={item.q}>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1">{item.q}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed"><SentenceLines text={item.a} /></p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href={uploadHref} className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors">
            {copy.cta}
          </Link>
        </div>
      </section>
    </>
  );
}
