
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

const fetchWithProxyFallback = async (url: string): Promise<any> => {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('mailto')) {
        urlObj.searchParams.append('mailto', 'demo@nephroupdate.com');
    }
    const finalUrl = urlObj.toString();

    try {
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error(`Direct HTTP ${response.status}`);
        return await response.json();
    } catch (directError) {
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
            return await response.json();
        } catch (proxyError) {
            throw directError;
        }
    }
};

export const fetchOpenAlexArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  years?: number,
  offset: number = 0
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getOpenAlexTopicQuery(topic);
    const searchTerm = customQuery ? `(${mainTerm})` : `(${mainTerm}) AND (nephrology OR kidney OR renal)`;
    const encodedTerm = encodeURIComponent(searchTerm);
    
    // Calculate page from offset (assuming 200 per page as below)
    const page = Math.floor(offset / 200) + 1;

    let filter = '';
    if (years) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        // Use OpenAlex filter syntax for years
        filter = `&filter=from_publication_date:${startYear}-01-01`;
    }

    const url = `${OPENALEX_API_BASE}?search=${encodedTerm}${filter}&sort=publication_date:desc&per-page=200&page=${page}&select=id,title,type,open_access,cited_by_count,primary_location,publication_date,doi,abstract_inverted_index,authorships,publication_year`;
    
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
      if (item.authorships && item.authorships.length > 0) {
          const names = item.authorships.slice(0, 3).map((a: any) => a.author.display_name);
          if (item.authorships.length > 3) names.push("et al");
          authorsStr = names.join(", ");
      }

      return {
        id: `oa-${item.id}`,
        title: title,
        summary: summary,
        source: sourceName,
        authors: authorsStr, 
        url: item.doi || item.primary_location?.landing_page_url || item.id,
        date: item.publication_date || 'N/A',
        category: category,
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: !!item.openAccess?.is_oa
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
