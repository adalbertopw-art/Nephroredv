
import { ResearchUpdate, Article, Topic } from "../types";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { getEPMCTopicQuery } from "../utils/searchContexts";
import { detectArticleCategory } from "../utils/categoryDetection";

const EPMC_API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

const fetchWithProxyFallback = async (url: string): Promise<any> => {
    // Strategy: Try direct, then various public proxies in order of reliability
    const proxies = [
        (u: string) => u, // Direct fetch (works if CORS is configured or in native context)
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    ];

    let lastError: any;

    for (const proxyGen of proxies) {
        try {
            const proxyUrl = proxyGen(url);
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                // Validate that we actually got JSON and not an HTML error page from a proxy
                try {
                    const json = JSON.parse(text);
                    return json;
                } catch (parseError) {
                    // console.warn(`JSON parse failed for ${proxyUrl}`, parseError);
                    lastError = parseError;
                    // Continue to next proxy
                }
            } else {
                 lastError = new Error(`HTTP ${response.status} from ${proxyUrl}`);
            }
        } catch (e) {
            // console.warn(`Fetch failed for proxy strategy`, e);
            lastError = e;
        }
    }

    throw lastError || new Error("Europe PMC unreachable via all channels.");
};

export const fetchEuropePmcArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  years?: number
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getEPMCTopicQuery(topic);
    
    // Construct dynamic date range
    let dateFilter = '';
    if (years) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        dateFilter = ` AND (PUB_YEAR:[${startYear} TO ${currentYear + 1}])`;
    } else {
        // Default minimal filter if no year specified (though App.tsx usually sends one)
        // If undefined, maybe default to last 3 years internally or leave open if user wants ALL
        // Leaving open allows historical searches
    }

    // Use encoded quotes to ensure stability across proxies
    const query = customQuery ? `${mainTerm}${dateFilter}` : `(${mainTerm}) AND (HAS_ABSTRACT:y)${dateFilter}`;

    const params = new URLSearchParams({
        query: query,
        format: 'json',
        pageSize: '200', // Significantly increased to 200
        resultType: 'core',
        sort: 'DATE_DESC'
    });

    const url = `${EPMC_API_BASE}?${params.toString()}`;
    const data = await fetchWithProxyFallback(url);
    const resultList = data.resultList?.result || [];

    if (resultList.length === 0) return { summary: "No results found in Europe PMC.", articles: [] };

    const articles: Article[] = resultList.map((item: any) => {
      const title = item.title || 'Untitled';
      const abstractText = item.abstractText || "";
      const cleanAbstract = abstractText.replace(/<[^>]*>?/gm, '');
      const source = item.journalTitle || 'Europe PMC';
      const date = item.firstPublicationDate || item.pubYear || 'N/A';
      const year = parseInt(item.pubYear, 10) || 0;
      
      const relevance = calculateBaseClinicalScore(title, cleanAbstract, source, typeof topic === 'string' ? topic : '', 0, year);
      const category = detectArticleCategory(title, cleanAbstract, source);

      let authorsStr = "";
      if (item.authorList && item.authorList.author) {
          const authors = item.authorList.author;
          const names = authors.slice(0, 3).map((a: any) => a.lastName || a.fullName);
          if (authors.length > 3) names.push("et al");
          authorsStr = names.join(", ");
      }

      const isFree = item.isOpenAccess === 'Y' || item.epmcAuthMan === 'Y';
      // Prioritize full text links
      const link = item.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === 'html' || u.documentStyle === 'pdf')?.url || `https://europepmc.org/article/MED/${item.pmid}`;

      return {
        id: `epmc-${item.id}`,
        title: title,
        summary: cleanAbstract || "Abstract not available.",
        source: source,
        authors: authorsStr,
        url: link,
        date: date,
        category: category,
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: isFree
      };
    });
    
    return {
      summary: `Europe PMC: ${articles.length} results.`,
      articles: articles
    };
  } catch (error) {
    console.warn("Europe PMC Service Error:", error);
    return { summary: "Error fetching Europe PMC", articles: [] };
  }
};
