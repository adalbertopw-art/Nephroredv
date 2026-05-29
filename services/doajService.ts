
import { ResearchUpdate, Article, Topic } from "../types";
import { getGeneralTopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";

// API v2 is required for standard medical terms search
const DOAJ_API_BASE = 'https://doaj.org/api/v2/search/articles';

export const fetchDoajArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string
): Promise<ResearchUpdate> => {
  try {
    let term = customQuery || getGeneralTopicQuery(topic);
    
    // Fix: Remove PubMed-specific date range filters that cause 400 errors in DOAJ API
    term = term.replace(/\s*AND\s*\(?\"\d{4}\"\[Date\s*-\s*Publication\]\s*:\s*\"3000\"\[Date\s*-\s*Publication\]\)?/gi, '');
    
    // Sanitize: Remove parentheses and clean spaces
    term = term.replace(/[()]/g, '').trim();

    if (!term || term.length < 2) {
        return { summary: "Query too short for DOAJ.", articles: [] };
    }

    // DOAJ path-based search
    const query = customQuery
        ? `${term}`
        : `${term} nephrology kidney`;
        
    const url = `${DOAJ_API_BASE}/${encodeURIComponent(query)}?pageSize=60`;

    let response: Response;
    try {
        response = await fetch(url);
        if (!response.ok) throw new Error(`Direct HTTP ${response.status}`);
    } catch (err) {
        // Proxy fallback
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
        if (!response.ok) {
            if (response.status === 400) {
                console.debug(`DOAJ API 400 Error. Query: ${query}`);
                return { summary: "DOAJ search parameters adjusted.", articles: [] };
            }
            throw new Error(`DOAJ API Error: ${response.status}`);
        }
    }
    
    const data = await response.json();
    const results = data.results || [];
    
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 3; // Strict 3 year filter

    // Filter results locally by date
    const filteredResults = results.filter((item: any) => {
        const year = item.bibjson?.year ? parseInt(item.bibjson.year, 10) : 0;
        return year >= minYear;
    });

    const articles: Article[] = filteredResults.map((item: any) => {
      const bib = item.bibjson;
      const title = bib.title || 'Untitled';
      const abstract = bib.abstract || "No abstract available.";
      const source = bib.journal?.title || 'DOAJ Journal';
      const date = bib.year || bib.month || 'N/A';
      const year = bib.year ? parseInt(bib.year, 10) : 0;
      
      const relevance = calculateBaseClinicalScore(title, abstract, source, typeof topic === 'string' ? topic : '', 0, year);

      let authorsStr = "";
      if (bib.author && bib.author.length > 0) {
          authorsStr = bib.author.map((a: any) => a.name).slice(0,3).join(', ');
      }
      
      const link = bib.link?.find((l: any) => l.type === 'fulltext')?.url || bib.link?.[0]?.url;

      return {
        id: `doaj-${item.id}`,
        title: title,
        summary: abstract,
        source: source,
        authors: authorsStr,
        url: link,
        date: date,
        category: 'Research',
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: true 
      };
    });

    return {
      summary: `DOAJ: ${articles.length} OA results.`,
      articles: articles
    };

  } catch (error) {
    console.debug("DOAJ Service Info:", error);
    return { summary: "Error fetching DOAJ", articles: [] };
  }
};
