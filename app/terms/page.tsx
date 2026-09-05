import Link from 'next/link';
import type { Lang } from '@/utils/i18n';
import { termsContent } from '@/utils/legal-content';

function TermsContent({ initialLang }: { initialLang: Lang }) {
  const lang = initialLang;
  const content = termsContent[lang];
  return <section className="max-w-2xl mx-auto px-4 py-16" aria-labelledby="terms-heading">
    <h1 id="terms-heading" className="text-3xl font-bold text-zinc-900 mb-2">{content.title}</h1>
    <p className="text-sm text-zinc-400 mb-10">{content.updated}</p>
    <div className="prose prose-zinc prose-sm max-w-none space-y-8 text-zinc-600 leading-relaxed">
      {content.sections.map(section => <section key={section.title}>
        <h2 className="text-base font-semibold text-zinc-900 mb-2">{section.title}</h2>
        {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-2 first:mt-0">{paragraph}</p>)}
        {section.bullets && <ul className="list-disc pl-5 space-y-1 mt-2">{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
      </section>)}
    </div>
    <div className="mt-12 pt-8 border-t border-zinc-100"><Link href={lang === 'en' ? '/' : `/${lang}`} className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">← {content.back}</Link></div>
  </section>;
}
export default function TermsPage({ initialLang = 'en' }: { initialLang?: Lang }) { return <TermsContent initialLang={initialLang} />; }
