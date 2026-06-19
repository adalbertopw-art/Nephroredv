
import { Capacitor } from '@capacitor/core';
import { ResearchUpdate, Article, Topic } from "../types";
import { getS2TopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { detectArticleCategory } from "../utils/categoryDetection";
import { fetchCrossrefArticles } from "./crossrefService";

const S2_API_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';

const fetchWithRetry = async (url: string, headers: HeadersInit = {}, retries = 3, initialDelay = 1000): Promise<Response> => {
    try {
        const response = await fetch(url, { headers });
        if (response.status === 429) {
            if (retries > 0) {
                const retryAfterHeader = response.headers.get('Retry-After');
                const delay = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : initialDelay;
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(url, headers, retries - 1, initialDelay * 2);
            } else {
                throw new Error("HTTP 429 Too Many Requests");
            }
        }
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        return response;
    } catch (error) {
        if (retries > 0 && !(error instanceof Error && error.message.includes("429") && !error.message.includes("Too Many Requests")) && !(error instanceof Error && error.message.includes("Too Many Requests"))) {
            await new Promise(resolve => setTimeout(resolve, initialDelay));
            return fetchWithRetry(url, headers, retries - 1, initialDelay * 2);
        }
        throw error;
    }
};

export const fetchSemanticScholarArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  apiKey?: string,
  yearsToFetch: number = 3
): Promise<ResearchUpdate> => {
  const fetchFromS2 = async (): Promise<ResearchUpdate> => {
      let searchTerm = customQuery || getS2TopicQuery(topic);
      
      const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
      if (isAuthorSearch) {
          searchTerm = customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim();
      } else if (customQuery) {
          searchTerm = searchTerm.replace(/\b(OR|AND|NOT)\b/g, '').replace(/[()"]/g, '').replace(/\s+/g, ' ').trim();
      }
      
      const kidneyContext = 'kidney nephrology renal';
      let queryContext = customQuery ? `${searchTerm} ${kidneyContext}` : `${searchTerm}`;
      if (isAuthorSearch) {
          queryContext = searchTerm;
      }
      
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - yearsToFetch;
      const yearRange = `${startYear}-${currentYear}`;

      const fields = 'paperId,title,abstract,year,venue,url,openAccessPdf,citationCount,influentialCitationCount,publicationDate,authors,isOpenAccess,figures';
      let url = `${S2_API_BASE}?query=${encodeURIComponent(queryContext)}&fields=${fields}&limit=60${isAuthorSearch ? '' : `&year=${yearRange}`}`;

      // Route through backend proxy on web to bypass tight browser IP/CORS rate limits
      if (!Capacitor.isNativePlatform()) {
          url = `/api/proxy?url=${encodeURIComponent(url)}`;
      }

      const headers: HeadersInit = {};
      if (apiKey) headers['x-api-key'] = apiKey;

      const response = await fetchWithRetry(url, headers, 1, 500); // reduced retries here because of the overall 3s timeout
      if (!response.ok) throw new Error(`S2 API Status: ${response.status}`);
      
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
        let fullAuthorsStr = "";
        if (item.authors && item.authors.length > 0) {
            const names = item.authors.slice(0, 5).map((a: any) => a.name || '');
            if (item.authors.length > 5) names.push("et al");
            authorsStr = names.join(", ");
            fullAuthorsStr = item.authors.map((a: any) => a.name || '').filter(Boolean).join(", ");
        }

        const imageUrl = item.figures && item.figures.length > 0 ? item.figures[0].url : undefined;
        const figuresArray = item.figures ? item.figures.map((f: any) => f.url).filter(Boolean) : undefined;

        return {
          id: `s2-${item.paperId}`,
          title: title,
          summary: abstract || "No abstract available.",
          source: source,
          authors: authorsStr, 
          fullAuthors: fullAuthorsStr || authorsStr,
          url: item.openAccessPdf?.url || item.url || `https://www.semanticscholar.org/paper/${item.paperId}`,
          date: item.publicationDate || item.year?.toString() || 'N/A',
          category: category,
          relevanceScore: relevance,
          topic: typeof topic === 'string' ? topic : 'General',
          isFree: !!(item.openAccessPdf || item.isOpenAccess),
          pdfUrl: item.openAccessPdf?.url,
          imageUrl: imageUrl,
          figures: figuresArray
        };
      });
      return { summary: `Semantic Scholar: ${articles.length} results.`, articles: articles };
  };

  try {
      const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("S2 API Timeout (>3s)")), 3000);
      });
      
      return await Promise.race([fetchFromS2(), timeoutPromise]);
  } catch (error: any) {
      console.warn(`Semantic Scholar failed (${error.message}). Falling back to Crossref.`);
      // If it fails for ANY reason (timeout, 429, etc), fallback silently to Crossref
      return await fetchCrossrefArticles(topic, language, customQuery, yearsToFetch);
  }
};
