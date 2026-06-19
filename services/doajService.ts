
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
    const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
    let query = customQuery
        ? `${term} nephrology kidney renal`
        : `${term} nephrology kidney`;
        
    if (isAuthorSearch) {
        const authorName = customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim();
        query = `author:${authorName}`;
    }
        
    const url = `${DOAJ_API_BASE}/${encodeURIComponent(query)}?pageSize=60`;

    let response: Response;
    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
    } catch (err) {
        try {
            response = await fetch(url);
            if (!response.ok) throw new Error(`Direct HTTP ${response.status}`);
        } catch (directErr: any) {
            console.warn("DOAJ retrieve failed", directErr);
            return { summary: "DOAJ unreachable.", articles: [] };
        }
    }
    
    const data = await response.json();
    const results = data.results || [];
    
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 3; // Strict 3 year filter

    // Filter results locally by date
    const filteredResults = results.filter((item: any) => {
        const year = item.bibjson?.year ? parseInt(item.bibjson.year, 10) : 0;
        return isAuthorSearch || year >= minYear;
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
      let fullAuthorsStr = "";
      if (bib.author && bib.author.length > 0) {
          const names = bib.author.map((a: any) => a.name || '').filter(Boolean);
          authorsStr = names.slice(0,3).join(', ') + (names.length > 3 ? ', et al' : '');
          fullAuthorsStr = names.join(", ");
      }
      
      const link = bib.link?.find((l: any) => l.type === 'fulltext')?.url || bib.link?.[0]?.url;

      return {
        id: `doaj-${item.id}`,
        title: title,
        summary: abstract,
        source: source,
        authors: authorsStr,
        fullAuthors: fullAuthorsStr || authorsStr,
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
