import { remark } from 'remark';
import html from 'remark-html';

function addClass(openingTag: string, className: string): string {
  return openingTag.includes(' class="')
    ? openingTag.replace(' class="', ` class="${className} `)
    : openingTag.replace('>', ` class="${className}">`);
}

function annotateSection(
  rendered: string,
  headingPattern: RegExp,
  headingClass: string,
  annotateBody: (body: string) => string,
): string {
  return rendered.replace(
    new RegExp(`(<h2>(${headingPattern.source})<\\/h2>)([\\s\\S]*?)(?=<h2>|$)`, 'gi'),
    (_section, heading: string, _headingText: string, body: string) =>
      `${addClass(heading, headingClass)}${annotateBody(body)}`,
  );
}

function annotateRenderedHtml(rendered: string): string {
  let annotated = annotateSection(
    rendered,
    /(?:FAQ|Frequently Asked Questions)\b[^<]*/,
    'markdown-faq-heading',
    body => body
      .replace(/<h3>/g, '<h3 class="markdown-faq-question">')
      .replace(/<p>/g, '<p class="markdown-faq-answer">'),
  );

  annotated = annotateSection(
    annotated,
    /Related Articles\b[^<]*/,
    'markdown-related-heading',
    body => body
      .replace(/<ul>/g, '<ul class="markdown-related-list">')
      .replace(/<p>/g, '<p class="markdown-related-copy">'),
  );

  const uploadCtaLink = '<a href="(?:https?:\\/\\/(?:www\\.)?safeunfollow\\.com)?\\/upload(?:[/?#][^\"]*)?">(?:Try|Upload|Start|Check|See|Discover)[\\s\\S]*?<\\/a>';
  const paragraphOpen = '<p(?: class="[^"]*")?>';
  return annotated
    .replace(
      new RegExp(`${paragraphOpen}[^<]*(?:ready|start)[^<]*<\\/p>\\s*${paragraphOpen}${uploadCtaLink}<\\/p>`, 'gi'),
      '',
    )
    .replace(
      new RegExp(`${paragraphOpen}(?:(?!<\\/p>)[\\s\\S])*?${uploadCtaLink}(?:(?!<\\/p>)[\\s\\S])*?<\\/p>`, 'gi'),
      '',
    );
}

export async function renderMarkdown(markdown: string): Promise<string> {
  // remark-html sanitizes untrusted Markdown first. Only fixed class names are added afterward.
  const processed = await remark().use(html).process(markdown);
  return annotateRenderedHtml(processed.toString());
}
