
import { ResearchUpdate, Article, Topic } from "../types";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { getEPMCTopicQuery } from "../utils/searchContexts";
import { detectArticleCategory } from "../utils/categoryDetection";

const EPMC_API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

const fetchWithProxyFallback = async (url: string): Promise<any> => {
    // Strategy: Try our local server-side proxy first, then direct fetch
    const proxies = [
        (u: string) => `/api/proxy?url=${encodeURIComponent(u)}`,
        (u: string) => u
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
  years?: number,
  onlyFullText: boolean = false
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getEPMCTopicQuery(topic);
    
    // Construct dynamic date range
    let dateFilter = '';
    if (years) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        dateFilter = ` AND (PUB_YEAR:[${startYear} TO ${currentYear + 1}])`;
    }

    let fullTextFilter = '';
    if (onlyFullText) {
        fullTextFilter = ' AND (HAS_FT:y)';
    }

    // Use encoded quotes to ensure stability across proxies
    const kidneyContext = '(nephrology OR kidney OR renal OR "kidney diseases")';
    let query = `(${mainTerm} AND ${kidneyContext}) AND (HAS_ABSTRACT:y)${dateFilter}${fullTextFilter}`;
    const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
    if (isAuthorSearch) {
        const authorName = customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim();
        query = `(AUTH:"${authorName}")${dateFilter}${fullTextFilter}`;
    } else if (customQuery) {
        query = `((TITLE:(${mainTerm}) OR ABSTRACT:(${mainTerm})) AND ${kidneyContext})${dateFilter}${fullTextFilter}`;
    }

    const params = new URLSearchParams({
        query: query,
        format: 'json',
        pageSize: '200', // Significantly increased to 200
        resultType: 'core'
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
      let fullAuthorsStr = "";
      if (item.authorList && item.authorList.author) {
          const authors = item.authorList.author;
          const names = authors.slice(0, 3).map((a: any) => a.lastName || a.fullName || '');
          if (authors.length > 3) names.push("et al");
          authorsStr = names.join(", ");
          fullAuthorsStr = authors.map((a: any) => a.lastName || a.fullName || '').filter(Boolean).join(", ");
      }

      const isFree = item.isOpenAccess === 'Y' || item.epmcAuthMan === 'Y';
      // Prioritize full text links
      const link = item.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === 'html' || u.documentStyle === 'pdf')?.url || `https://europepmc.org/article/MED/${item.pmid}`;
      const pdfUrl = item.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === 'pdf')?.url;

      return {
        id: `epmc-${item.id}`,
        title: title,
        summary: cleanAbstract || "Abstract not available.",
        source: source,
        authors: authorsStr,
        fullAuthors: fullAuthorsStr || authorsStr,
        url: link,
        date: date,
        category: category,
        relevanceScore: relevance,
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: isFree,
        pdfUrl: pdfUrl
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
