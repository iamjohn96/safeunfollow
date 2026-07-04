import type { ContentBrief, ResearchArtifact } from './types';

function titleCase(value: string): string {
  return value.split(/\s+/).map(word => word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : '').join(' ');
}

function inferIntent(keyword: string): string {
  if (/\b(how|guide|steps?|find|check)\b/i.test(keyword)) return 'Informational / how-to';
  if (/\b(best|review|vs|alternative|tool|tracker)\b/i.test(keyword)) return 'Commercial investigation';
  if (/\b(limit|safe|why|what|does|can|is)\b/i.test(keyword)) return 'Informational / answer seeking';
  return 'Informational';
}

function createContentBrief(artifact: ResearchArtifact, suggestedInternalLinks: string[] = []): ContentBrief {
  const common = artifact.competitorAnalysis.commonTopics;
  const faq = [...new Set([
    ...artifact.serp.peopleAlsoAsk,
    ...artifact.sources.flatMap(source => source.faq),
  ])].slice(0, 8);
  const outline = [...new Set([
    `What ${titleCase(artifact.keyword)} Means`,
    ...common,
    ...artifact.competitorAnalysis.missingTopics.slice(0, 3).map(topic => topic.replace(/\?$/, '')),
    'Privacy and Account Safety',
    'Frequently Asked Questions',
  ])].slice(0, 10);
  const title = `${titleCase(artifact.keyword)}: A Safe, Practical Guide`;
  const description = `Learn ${artifact.keyword}, what competitors miss, and how to act safely without sharing your Instagram login.`.slice(0, 160);
  return {
    schemaVersion: 1,
    keyword: artifact.keyword,
    generatedAt: new Date().toISOString(),
    searchIntent: inferIntent(artifact.keyword),
    competitorSummary: [
      `${artifact.sources.length} ranking pages analyzed; average length ${artifact.competitorAnalysis.averageWordCount} words.`,
      `${artifact.competitorAnalysis.pagesWithFaq} pages include FAQs and ${artifact.competitorAnalysis.pagesWithSchema} include JSON-LD schema.`,
      common.length ? `Recurring coverage: ${common.slice(0, 5).join(', ')}.` : 'No recurring H2 topic appeared across a majority of pages.',
    ],
    missingTopics: artifact.competitorAnalysis.missingTopics,
    suggestedOutline: outline,
    suggestedFaq: faq,
    suggestedInternalLinks,
    suggestedTitle: title,
    suggestedDescription: description,
  };
}

function renderContentBrief(brief: ContentBrief): string {
  const section = (heading: string, values: string[]) => [
    `## ${heading}`, '', ...(values.length ? values.map(value => `- ${value}`) : ['- None identified']), '',
  ];
  return [
    `# Content Brief: ${brief.keyword}`, '',
    `Generated: ${brief.generatedAt}`, '',
    '## Search Intent', '', brief.searchIntent, '',
    ...section('Competitor Summary', brief.competitorSummary),
    ...section('Missing Topics', brief.missingTopics),
    ...section('Suggested Outline', brief.suggestedOutline),
    ...section('Suggested FAQ', brief.suggestedFaq),
    ...section('Suggested Internal Links', brief.suggestedInternalLinks),
    '## Suggested Title', '', brief.suggestedTitle, '',
    '## Suggested Description', '', brief.suggestedDescription, '',
  ].join('\n');
}

export { createContentBrief, inferIntent, renderContentBrief };
