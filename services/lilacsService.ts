
import { ResearchUpdate, Article, Topic } from "../types";
import { getLilacsTopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { detectArticleCategory } from "../utils/categoryDetection";

// BVS (Biblioteca Virtual en Salud) API
// Indexes LILACS, IBECS (Spain), MEDLINE, SciELO, etc.
const BVS_API_BASE = 'https://pesquisa.bvsalud.org/portal/api/search/';

const fetchWithProxy = async (url: string): Promise<any> => {
    // Strategy: Try proxies first as direct access is usually CORS-blocked in browsers
    // Reordered to prioritize more stable proxies for JSON data
    const proxies = [
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u: string) => u // Direct fetch last resort (works in native/server contexts)
    ];

    let lastError: any;

    for (const proxyGen of proxies) {
        try {
            const proxyUrl = proxyGen(url);
            const response = await fetch(proxyUrl);
            
            if (response.ok) {
                const text = await response.text();
                
                // Surgical Fix: Check if response is HTML before parsing to avoid "Unexpected token <"
                if (text.trim().startsWith('<')) {
                    lastError = new Error(`Received HTML content (likely error page) from ${proxyUrl}`);
                    continue; // Try next proxy
                }

                try {
                    const json = JSON.parse(text);
                    // Basic validation that it looks like BVS response (docs array exists)
                    if (json.docs || json.diaServerResponse) {
                         return json;
                    }
                } catch (parseError) {
                    lastError = parseError;
                }
            } else {
                 lastError = new Error(`HTTP ${response.status} from ${proxyUrl}`);
            }
        } catch (e) {
            lastError = e;
        }
    }

    throw lastError || new Error("LILACS unreachable via all channels.");
};

export const fetchLilacsArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getLilacsTopicQuery(topic);
    
    // BVS Parameters
    // db: 'LILACS' focuses on Latin American literature
    const params = new URLSearchParams({
        q: mainTerm,
        lang: language === 'es' ? 'es' : 'en',
        output: 'json',
        count: '30', 
        sort: 'year_cluster', // Sort by year descending to get recent
        filter: 'db:LILACS'
    });

    const url = `${BVS_API_BASE}?${params.toString()}`;
    
    // Use the robust proxy-enabled fetcher
    const data = await fetchWithProxy(url);
    const docs = data.docs || [];

    if (docs.length === 0) {
        return { summary: "No results in LILACS/BVS.", articles: [] };
    }

    const articles: Article[] = docs.map((doc: any) => {
        // BVS API fields are often arrays
        const title = Array.isArray(doc.ti) ? doc.ti[0] : (doc.ti || 'Untitled');
        const abstract = Array.isArray(doc.ab) ? doc.ab[0] : (doc.ab || "Abstract not available.");
        const authorsArr = doc.au || [];
        const authors = authorsArr.slice(0, 3).join(', ') + (authorsArr.length > 3 ? ' et al.' : '');
        const source = Array.isArray(doc.fo) ? doc.fo[0] : (doc.fo || doc.db || 'LILACS');
        const year = doc.da ? parseInt(doc.da.substring(0, 4)) : 0;
        const date = doc.da || 'N/A';
        
        // Construct URL. BVS ID usually allows direct linking
        const link = doc.ur && doc.ur.length > 0 ? doc.ur[0] : `https://pesquisa.bvsalud.org/portal/resource/es/${doc.id}`;
        
        // Detect free text indicators
        const isFree = doc.fulltext === '1' || (Array.isArray(doc.ur) && doc.ur.some((u:string) => u.includes('scielo') || u.includes('pmc')));

        const relevance = calculateBaseClinicalScore(title, abstract, source, typeof topic === 'string' ? topic : '', 0, year);
        const category = detectArticleCategory(title, abstract, source);

        return {
            id: `lilacs-${doc.id}`,
            title: title,
            summary: abstract,
            source: source,
            authors: authors,
            url: link,
            date: date,
            category: category,
            relevanceScore: relevance,
            topic: typeof topic === 'string' ? topic : 'General',
            isFree: isFree
        };
    });

    return {
        summary: `LILACS/BVS: ${articles.length} results.`,
        articles: articles
    };

  } catch (error: any) {
    // UPDATED: More comprehensive error suppression for network issues
    const msg = error.message || '';
    if (
        !msg.includes('HTML') && 
        !msg.includes('unreachable') &&
        !msg.includes('Failed to fetch') &&
        !msg.includes('NetworkError') && 
        !msg.includes('Load failed')
    ) {
        console.warn("LILACS Service Error:", error);
    }
    return { summary: "Error fetching LILACS", articles: [] };
  }
};
