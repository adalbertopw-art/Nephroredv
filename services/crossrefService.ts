import { ResearchUpdate, Article, Topic } from "../types";
import { getS2TopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { detectArticleCategory } from "../utils/categoryDetection";

const CROSSREF_API_BASE = 'https://api.crossref.org/works';

export const fetchCrossrefArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  yearsToFetch: number = 3
): Promise<ResearchUpdate> => {
  try {
    let searchTerm = customQuery || getS2TopicQuery(topic);
    
    // Clean up query for Crossref as it also doesn't handle complex boolean logic perfectly
    const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
    if (isAuthorSearch) {
        searchTerm = customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim();
    } else if (customQuery) {
        searchTerm = customQuery;
    }

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - yearsToFetch;

    // Build Crossref URL
    const params = new URLSearchParams();
    if (isAuthorSearch) {
        params.append('query.author', searchTerm);
    } else {
        params.append('query.title', searchTerm);
    }
    
    params.append('filter', `from-pub-date:${startYear}-01-01,type:journal-article`);
    params.append('select', 'DOI,title,abstract,created,published-print,published-online,author,container-title,link,URL,is-referenced-by-count');
    params.append('rows', '40');
    params.append('sort', 'relevance');
    // Using a mailto is polite for Crossref and places us in the "Polite Pool"
    params.append('mailto', 'ai.studio.agent@example.com');

    const url = `${CROSSREF_API_BASE}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) return { summary: `Crossref API Status: ${response.status}`, articles: [] };

    const data = await response.json();
    const items = data.message?.items || [];

    if (items.length === 0) return { summary: "No results in Crossref.", articles: [] };

    const articles: Article[] = items.map((item: any) => {
      const title = item.title?.[0] || 'Untitled';
      const source = item['container-title']?.[0] || 'Crossref';
      const abstractRaw = item.abstract || "";
      const abstract = abstractRaw.replace(/<[^>]+>/g, ''); // Strip JATS tags
      
      const published = item['published-online']?.['date-parts']?.[0] || item['published-print']?.['date-parts']?.[0] || item.created?.['date-parts']?.[0];
      const year = published ? published[0] : 0;
      const date = published ? published.join('-') : 'N/A';
      const citationCount = item['is-referenced-by-count'] || 0;
      
      const relevance = calculateBaseClinicalScore(title, abstract, source, typeof topic === 'string' ? topic : '', citationCount, year);
      const category = detectArticleCategory(title, abstract, source);

      let authorsStr = "";
      if (item.author && item.author.length > 0) {
          const names = item.author.slice(0, 5).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim());
          if (item.author.length > 5) names.push("et al");
          authorsStr = names.join(", ");
      }

      // Check if it's open access
      const link = item.link?.find((l: any) => l['content-type'] === 'application/pdf');
      const pdfUrl = link ? link.URL : undefined;
      const tdmLink = item.link?.find((l: any) => l['intended-application'] === 'text-mining');
      
      const isFree = !!pdfUrl || !!tdmLink;

      return {
        id: `crossref-${item.DOI || Math.random().toString(36).substring(7)}`,
        title: title,
        summary: abstract || "No abstract available.",
        source: source,
        authors: authorsStr,
        url: pdfUrl || item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : undefined),
        date: date,
        category: category,
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: isFree,
      };
    });

    return { summary: `Crossref: ${articles.length} results (Semantic Scholar Fallback).`, articles: articles };
  } catch (error) {
    return { summary: "Error fetching Crossref", articles: [] };
  }
};
