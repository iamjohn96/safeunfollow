type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
}

interface SerpResearch {
  provider: 'serper';
  queriedAt: string;
  results: SerpResult[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
}

interface CrawlPage {
  url: string;
  crawledAt: string;
  html: string;
  markdown: string;
  statusCode: number | null;
}

interface HeadingSet {
  h1: string[];
  h2: string[];
}

interface SchemaEvidence {
  types: string[];
  raw: unknown[];
}

interface EvidenceSource {
  source: string;
  url: string;
  position: number;
  crawlTime: string;
  title: string;
  description: string;
  summary: string;
  headings: HeadingSet;
  faq: string[];
  schema: SchemaEvidence;
  internalLinks: string[];
  lastUpdated: string | null;
  canonical: string | null;
  wordCount: number;
  seoObservations: string[];
}

interface ResearchArtifact {
  schemaVersion: 1;
  keyword: string;
  slug: string;
  generatedAt: string;
  expiresAt: string;
  cacheTtlDays: number;
  serp: SerpResearch;
  sources: EvidenceSource[];
  competitorAnalysis: {
    commonTopics: string[];
    missingTopics: string[];
    averageWordCount: number;
    pagesWithFaq: number;
    pagesWithSchema: number;
  };
}

interface ContentBrief {
  schemaVersion: 1;
  keyword: string;
  generatedAt: string;
  searchIntent: string;
  competitorSummary: string[];
  missingTopics: string[];
  suggestedOutline: string[];
  suggestedFaq: string[];
  suggestedInternalLinks: string[];
  suggestedTitle: string;
  suggestedDescription: string;
}

export type {
  ContentBrief,
  CrawlPage,
  EvidenceSource,
  FetchLike,
  HeadingSet,
  ResearchArtifact,
  SchemaEvidence,
  SerpResearch,
  SerpResult,
};
