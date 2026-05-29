
import { ResearchUpdate, Article, Topic } from "../types";
import { getS2TopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { detectArticleCategory } from "../utils/categoryDetection";

const S2_API_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';

const fetchWithRetry = async (url: string, headers: HeadersInit = {}, retries = 3, initialDelay = 2000): Promise<Response> => {
    try {
        const response = await fetch(url, { headers });
        if (response.status === 429) {
            if (retries > 0) {
                const retryAfterHeader = response.headers.get('Retry-After');
                const delay = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : initialDelay;
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(url, headers, retries - 1, initialDelay * 2);
            }
        }
        if (!response.ok && response.status !== 429) throw new Error(`Direct HTTP ${response.status}`);
        return response;
    } catch (error) {
        // Proxy fallback
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl, { headers });
            if (response.ok) return response;
            throw new Error(`Proxy HTTP ${response.status}`);
        } catch (proxyErr) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, initialDelay));
                return fetchWithRetry(url, headers, retries - 1, initialDelay * 2);
            }
            throw error;
        }
    }
};

export const fetchSemanticScholarArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  apiKey?: string
): Promise<ResearchUpdate> => {
  try {
    let searchTerm = customQuery || getS2TopicQuery(topic);
    
    // Semantic Scholar's basic search doesn't handle complex boolean logic well.
    // Strip out OR, AND, NOT and parentheses to create a clean bag-of-words query.
    if (customQuery) {
        searchTerm = searchTerm.replace(/\b(OR|AND|NOT)\b/g, '').replace(/[()"]/g, '').replace(/\s+/g, ' ').trim();
    }
    
    const queryContext = customQuery ? searchTerm : `(nephrology OR kidney OR renal) AND (${searchTerm})`;
    const currentYear = 2026;
    const yearRange = `${currentYear - 1}-${currentYear}`;

    const fields = 'paperId,title,abstract,year,venue,url,openAccessPdf,citationCount,influentialCitationCount,publicationDate,authors,isOpenAccess,figures';
    const url = `${S2_API_BASE}?query=${encodeURIComponent(queryContext)}&fields=${fields}&limit=60&year=${yearRange}`;

    const headers: HeadersInit = {};
    if (apiKey) headers['x-api-key'] = apiKey;

    const response = await fetchWithRetry(url, headers);
    if (!response.ok) return { summary: `S2 API Status: ${response.status}`, articles: [] };
    
    const data = await response.json();
    const results = data.data || [];

    if (results.length === 0) return { summary: "No results in Semantic Scholar.", articles: [] };

    const articles: Article[] = results.map(item => {
      const title = item.title || 'Untitled';
      const source = item.venue || 'Semantic Scholar';
      const abstract = item.abstract || "";
      const year = item.year || 0;
      const citationCount = item.influentialCitationCount || item.citationCount || 0;
      
      const relevance = calculateBaseClinicalScore(title, abstract, source, typeof topic === 'string' ? topic : '', citationCount, year);
      const category = detectArticleCategory(title, abstract, source);
      
      let authorsStr = "";
      if (item.authors && item.authors.length > 0) {
          const names = item.authors.slice(0, 5).map((a: any) => a.name);
          if (item.authors.length > 5) names.push("et al");
          authorsStr = names.join(", ");
      }

      const imageUrl = item.figures && item.figures.length > 0 ? item.figures[0].url : undefined;

      return {
        id: `s2-${item.paperId}`,
        title: title,
        summary: abstract || "No abstract available.",
        source: source,
        authors: authorsStr, 
        url: item.openAccessPdf?.url || item.url || `https://www.semanticscholar.org/paper/${item.paperId}`,
        date: item.publicationDate || item.year?.toString() || 'N/A',
        category: category,
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: !!(item.openAccessPdf || item.isOpenAccess),
        imageUrl: imageUrl
      };
    });
    return { summary: `Semantic Scholar: ${articles.length} results.`, articles: articles };
  } catch (error) {
    return { summary: "Error fetching Semantic Scholar", articles: [] };
  }
};
