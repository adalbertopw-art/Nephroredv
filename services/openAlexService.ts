
import { Capacitor } from '@capacitor/core';
import { ResearchUpdate, Article, Topic } from "../types";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { getOpenAlexTopicQuery } from "../utils/searchContexts";
import { detectArticleCategory } from "../utils/categoryDetection";

const OPENALEX_API_BASE = 'https://api.openalex.org/works';

const reconstructAbstract = (invertedIndex: any): string => {
    if (!invertedIndex) return "";
    const words: string[] = [];
    Object.keys(invertedIndex).forEach(word => {
        invertedIndex[word].forEach((pos: number) => {
            words[pos] = word;
        });
    });
    return words.join(" ");
};

const resolveApiUrl = (url: string): string => {
    if (Capacitor.isNativePlatform()) {
        return url;
    }
    return `/api/proxy?url=${encodeURIComponent(url)}`;
};

const fetchWithProxyFallback = async (url: string): Promise<any> => {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('mailto')) {
        urlObj.searchParams.append('mailto', 'demo@nephroupdate.com');
    }
    const finalUrl = urlObj.toString();

    try {
        const proxyUrl = resolveApiUrl(finalUrl);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
        return await response.json();
    } catch (proxyError) {
        try {
            const response = await fetch(finalUrl);
            if (!response.ok) throw new Error(`Direct HTTP ${response.status}`);
            return await response.json();
        } catch (directError) {
            throw proxyError;
        }
    }
};

export const fetchOpenAlexArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  years?: number,
  offset: number = 0,
  sortBy: 'date' | 'relevance' = 'date'
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getOpenAlexTopicQuery(topic);
    const kidneyContext = '(nephrology OR kidney OR renal)';
    const searchTerm = customQuery ? `(${mainTerm}) AND ${kidneyContext}` : `(${mainTerm}) AND ${kidneyContext}`;
    
    // Calculate page from offset (assuming 200 per page as below)
    const page = Math.floor(offset / 200) + 1;

    let filter = '';
    if (years) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        // Use OpenAlex filter syntax for years
        filter = `&filter=from_publication_date:${startYear}-01-01`;
    }

    let searchParam = '';
    const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
    if (isAuthorSearch) {
        const authorName = customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim();
        searchParam = '';
        const authorFilter = `raw_author_name.search:${encodeURIComponent(authorName)}`;
        filter = filter ? `${filter},${authorFilter}` : `filter=${authorFilter}`;
    } else if (customQuery) {
        // Restrict to title and abstract for custom queries to improve relevance
        searchParam = '';
        const encodedTerm = encodeURIComponent(`${mainTerm} nephrology`);
        const titleAbstractFilter = `title_and_abstract.search:${encodedTerm}`;
        filter = filter ? `${filter},${titleAbstractFilter}` : `filter=${titleAbstractFilter}`;
    } else {
        const encodedTerm = encodeURIComponent(`${mainTerm}`);
        searchParam = `search=${encodedTerm}`;
    }

    const sortString = sortBy === 'relevance' ? '&sort=relevance_score:desc' : '&sort=publication_date:desc';
    const url = `${OPENALEX_API_BASE}?${searchParam}${searchParam && filter ? '&' : ''}${filter.replace(/^&/, '')}${sortString}&per-page=200&page=${page}&select=id,title,type,open_access,cited_by_count,primary_location,publication_date,doi,abstract_inverted_index,authorships,publication_year,concepts`;
    
    const data = await fetchWithProxyFallback(url);
    const results = data.results || [];

    if (results.length === 0) return { summary: "No results found in OpenAlex.", articles: [] };

    const articles: Article[] = results.map(item => {
      const sourceName = item.primary_location?.source?.display_name || 'OpenAlex Source';
      const title = item.title || 'Untitled';
      const abstract = reconstructAbstract(item.abstract_inverted_index);
      const summary = abstract.trim() ? abstract : `${item.type?.toUpperCase()} | ${sourceName}`;
      const year = item.publication_year || 0;
      const citations = item.cited_by_count || 0;
      
      const relevance = calculateBaseClinicalScore(title, abstract, sourceName, typeof topic === 'string' ? topic : '', citations, year);
      const category = detectArticleCategory(title, abstract, sourceName);

      let authorsStr = "";
      let fullAuthorsStr = "";
      if (item.authorships && item.authorships.length > 0) {
          const names = item.authorships.slice(0, 3).map((a: any) => a.author?.display_name || '');
          if (item.authorships.length > 3) names.push("et al");
          authorsStr = names.join(", ");
          fullAuthorsStr = item.authorships.map((a: any) => a.author?.display_name || '').filter(Boolean).join(", ");
      }

      const keywords = (item.concepts || []).map((c: any) => c.display_name);

      return {
        id: `oa-${item.id}`,
        title: title,
        summary: summary,
        source: sourceName,
        authors: authorsStr, 
        fullAuthors: fullAuthorsStr || authorsStr,
        url: item.doi || item.primary_location?.landing_page_url || item.id,
        date: item.publication_date || 'N/A',
        category: category,
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: !!item.open_access?.is_oa,
        pdfUrl: item.open_access?.oa_url && item.open_access.oa_url.endsWith('.pdf') ? item.open_access.oa_url : undefined,
        keywords: keywords.length > 0 ? keywords : undefined
      };
    });
    
    return {
      summary: `OpenAlex: ${articles.length} results.`,
      articles: articles
    };
  } catch (error) {
    console.error("OpenAlex Service Error:", error);
    return { summary: "Error fetching OpenAlex", articles: [] };
  }
};
