
import { Capacitor } from '@capacitor/core';
import { ResearchUpdate, Article, Topic } from "../types";
import { getLilacsTopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { detectArticleCategory } from "../utils/categoryDetection";

// BVS (Biblioteca Virtual en Salud) API
// Indexes LILACS, IBECS (Spain), MEDLINE, SciELO, etc.
const BVS_API_BASE = 'https://pesquisa.bvsalud.org/portal/';

const resolveApiUrl = (url: string): string => {
    if (Capacitor.isNativePlatform()) {
        return url;
    }
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
};

const fetchWithProxy = async (url: string): Promise<any> => {
    // Strategy: Try resolveApiUrl (Native vs corsproxy.io), then fallback to local proxy, then direct fetch
    const proxies = [
        (u: string) => resolveApiUrl(u),
        (u: string) => `/api/proxy?url=${encodeURIComponent(u)}`,
        (u: string) => u
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

const decodeHtml = (html: string) => {
    if (typeof document === 'undefined') return html;
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const fetchLilacsArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  sortBy: 'date' | 'relevance' = 'date'
): Promise<ResearchUpdate> => {
  try {
    let mainTerm = "";
    if (customQuery) {
        const isAuthorSearch = customQuery.startsWith("AUTHOR:");
        if (isAuthorSearch) {
            mainTerm = `au:"${normalizeText(customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim())}"`;
        } else {
            const normalizedQuery = normalizeText(customQuery);
            mainTerm = `(tw:"${normalizedQuery}") AND (tw:"nefrologia" OR tw:"rinon" OR tw:"kidney" OR tw:"nephrology" OR tw:"renal")`;
        }
    } else {
        mainTerm = getLilacsTopicQuery(topic);
    }
    
    // BVS Parameters
    // db: 'LILACS' focuses on Latin American literature
    const params = new URLSearchParams({
        q: mainTerm,
        lang: language === 'es' ? 'es' : 'en',
        output: 'json',
        count: '30', 
        filter: 'db:LILACS'
    });
    
    if (sortBy === 'date') {
        params.append('sort', 'year_cluster');
    }

    const url = `${BVS_API_BASE}?${params.toString()}`;
    
    // Use the robust proxy-enabled fetcher
    const data = await fetchWithProxy(url);
    const docs = data.diaServerResponse?.[0]?.response?.docs || data.docs || [];

    if (docs.length === 0) {
        return { summary: "No results in LILACS/BVS.", articles: [] };
    }

    const articles: Article[] = docs.map((doc: any) => {
        // Títulos: Revisa si existe ti_es, si no, usa ti_en o ti_pt.
        let rawTitle = doc.ti_es || doc.ti_en || doc.ti_pt || doc.ti;
        const title = decodeHtml(Array.isArray(rawTitle) ? rawTitle[0] : (rawTitle || 'Untitled'));

        // Resúmenes: Busca ab_es, ab_en o ab_pt.
        let rawAbstract = doc.ab_es || doc.ab_en || doc.ab_pt || doc.ab;
        const abstract = decodeHtml(Array.isArray(rawAbstract) ? rawAbstract[0] : (rawAbstract || "Abstract not available."));
        
        const authorsArr = doc.au || [];
        const authors = authorsArr.slice(0, 3).join(', ') + (authorsArr.length > 3 ? ' et al.' : '');
        const source = Array.isArray(doc.fo) ? doc.fo[0] : (doc.fo || doc.db || 'LILACS');
        const year = doc.da ? parseInt(doc.da.substring(0, 4)) : 0;
        const date = doc.da || 'N/A';
        
        // Construct URL. BVS ID usually allows direct linking
        const link = doc.ur && doc.ur.length > 0 ? doc.ur[0] : `https://pesquisa.bvsalud.org/portal/resource/es/${doc.id}`;
        
        // Detect free text indicators
        const isFree = doc.fulltext === '1' || (Array.isArray(doc.ur) && doc.ur.some((u:string) => u.includes('scielo') || u.includes('pmc')));
        
        let pdfUrl: string | undefined = undefined;
        if (isFree && Array.isArray(doc.ur)) {
            const potentialPdf = doc.ur.find((u: string) => u.endsWith('.pdf') || u.includes('scielo.php?script=sci_pdf'));
            if (potentialPdf) {
                pdfUrl = potentialPdf;
            }
        }

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
            isFree: isFree,
            pdfUrl: pdfUrl
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
