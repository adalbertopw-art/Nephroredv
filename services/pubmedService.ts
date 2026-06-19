
import { ResearchUpdate, Article, Topic } from "../types";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { getPubMedTopicQuery } from "../utils/searchContexts";
import { detectArticleCategory } from "../utils/categoryDetection";
import { fetchEuropePmcArticles } from "./europePmcService";

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const fetchWithRetry = async (url: string, options: RequestInit, skipJsonCheck = false): Promise<Response> => {
    // Strategy: Use our own local server proxy first for reliable CORS-free retrieval, then attempt direct fetch
    const proxies = [
        (u: string) => `/api/proxy?url=${encodeURIComponent(u)}`,
        (u: string) => u
    ];

    let lastError: any;

    for (const proxyGen of proxies) {
        try {
            const proxyUrl = proxyGen(url);
            console.log(`[PubMed] Trying: ${proxyUrl}`);
            const response = await fetch(proxyUrl, options);
            
            if (response.ok) {
                if (skipJsonCheck) {
                   return response;
                }
                
                // Peek at the response to see if it's JSON
                const text = await response.text();
                try {
                    JSON.parse(text);
                    // It's valid JSON, return a new Response object
                    return new Response(text, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (parseError) {
                    console.warn(`[PubMed] JSON parse failed for ${proxyUrl}. Text starts with: ${text.substring(0, 100)}`);
                    lastError = parseError;
                    continue; // JSON validation failed, try next proxy
                }
            } else {
                 console.warn(`[PubMed] Strategy failed: HTTP ${response.status} for ${proxyUrl}`);
                 lastError = new Error(`HTTP ${response.status} from ${proxyUrl}`);
            }
        } catch (e: any) {
            console.warn(`[PubMed] Fetch failed for strategy ${proxyGen(url).substring(0, 50)}: ${e?.message || e}`);
            lastError = e;
        }
    }

    throw lastError || new Error("PubMed unreachable via all channels.");
};

const fetchEutils = async (endpoint: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET', skipJsonCheck = false) => {
    const url = new URL(`${PUBMED_API_BASE}/${endpoint}`);
    // ... rest is same
    const requestOptions: RequestInit = { method };
    if (method === 'GET') {
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
    } else {
        const formData = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => formData.append(key, value));
        requestOptions.body = formData;
    }
    
    return await fetchWithRetry(url.toString(), requestOptions, skipJsonCheck);
};


const searchPubMed = async (term: string, years?: number, offset: number = 0, onlyFullText: boolean = false): Promise<string[]> => {
    // Construct date filter if years provided
    let dateFilter = '';
    if (years) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        // Use standard PubMed date range syntax
        dateFilter = ` AND ("${startYear}"[Date - Publication] : "3000"[Date - Publication])`;
    }

    let fullTextFilter = '';
    if (onlyFullText) {
        fullTextFilter = ' AND "pubmed pmc"[Filter]';
    }

    const response = await fetchEutils('esearch.fcgi', {
        db: 'pubmed',
        term: term + dateFilter + fullTextFilter,
        retmode: 'json',
        retmax: '200', 
        retstart: offset.toString(), // Server-side pagination
        sort: 'date' 
    });
    
    // Check if the response is actually valid JSON
    const text = await response.text();
    console.log(`[PubMed] ESearch Response Text: ${text.substring(0, 100)}...`);
    
    try {
        const data = JSON.parse(text);
        return data.esearchresult?.idlist || [];
    } catch (e) {
        console.error(`[PubMed] Failed to parse JSON from ESearch. Response starts with: ${text.substring(0, 50)}...`);
        throw new Error("Invalid JSON response from PubMed");
    }
};

const fetchDetails = async (ids: string[], topic: string): Promise<Article[]> => {
    const response = await fetchEutils('efetch.fcgi', {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml'
    }, 'POST', true);
    
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    
    const articles: Article[] = [];
    const pubmedArticles = xml.getElementsByTagName("PubmedArticle");
    
    for (let i = 0; i < pubmedArticles.length; i++) {
        const art = pubmedArticles[i];
        const medline = art.getElementsByTagName("MedlineCitation")[0];
        const pubmedData = art.getElementsByTagName("PubmedData")[0];
        if (!medline) continue;

        const articleTag = medline.getElementsByTagName("Article")[0];
        const title = articleTag.getElementsByTagName("ArticleTitle")[0]?.textContent || "No title";
        
        let abstractText = "";
        const abstractTag = articleTag.getElementsByTagName("Abstract")[0];
        if (abstractTag) {
            const texts = abstractTag.getElementsByTagName("AbstractText");
            for (let j = 0; j < texts.length; j++) {
                const txt = texts[j].textContent;
                abstractText += `${txt} `;
            }
        }
        
        let authorsStr = "";
        let fullAuthorsStr = "";
        const authorList = articleTag.getElementsByTagName("AuthorList")[0];
        if (authorList) {
            const authors = authorList.getElementsByTagName("Author");
            const authorNames = [];
            const allAuthorNames = [];
            const limit = Math.min(authors.length, 3);
            for (let k = 0; k < limit; k++) {
                const lastName = authors[k].getElementsByTagName("LastName")[0]?.textContent;
                if (lastName) authorNames.push(lastName);
            }
            for (let k = 0; k < authors.length; k++) {
                const lastName = authors[k].getElementsByTagName("LastName")[0]?.textContent;
                const foreName = authors[k].getElementsByTagName("ForeName")[0]?.textContent;
                const initials = authors[k].getElementsByTagName("Initials")[0]?.textContent;
                if (lastName) {
                   allAuthorNames.push(`${lastName} ${initials || foreName || ''}`.trim());
                }
            }
            if (authors.length > 3) authorNames.push("et al");
            authorsStr = authorNames.join(", ");
            fullAuthorsStr = allAuthorNames.join(", ");
        }

        let isFree = false;
        let pmcid = "";
        if (pubmedData) {
            const ids = pubmedData.getElementsByTagName("ArticleIdList")[0]?.getElementsByTagName("ArticleId");
            if (ids) {
                for (let k = 0; k < ids.length; k++) {
                    const idType = ids[k].getAttribute("IdType");
                    if (idType === "pmc") {
                        isFree = true;
                        pmcid = ids[k].textContent || "";
                        break;
                    }
                }
            }
        }

        const journal = articleTag.getElementsByTagName("Journal")[0];
        const source = journal?.getElementsByTagName("Title")[0]?.textContent || "PubMed";
        
        const pubDateTag = journal.getElementsByTagName("PubDate")[0];
        let dateStr = "N/A";
        let yearNum = 0;
        if (pubDateTag) {
            const year = pubDateTag.getElementsByTagName("Year")[0]?.textContent;
            const month = pubDateTag.getElementsByTagName("Month")[0]?.textContent;
            const day = pubDateTag.getElementsByTagName("Day")[0]?.textContent;
            if (year) {
                dateStr = year + (month ? `-${month}` : '') + (day ? `-${day}` : '');
                yearNum = parseInt(year, 10);
            }
        }
        
        const id = medline.getElementsByTagName("PMID")[0]?.textContent || "0";
        
        // Extract Keywords
        const keywordList = medline.getElementsByTagName("KeywordList")[0];
        const keywords: string[] = [];
        if (keywordList) {
            const kwTags = keywordList.getElementsByTagName("Keyword");
            for (let k = 0; k < kwTags.length; k++) {
                const kw = kwTags[k].textContent;
                if (kw) keywords.push(kw);
            }
        }
        
        const relevance = calculateBaseClinicalScore(title, abstractText, source, topic, 0, yearNum);
        const category = detectArticleCategory(title, abstractText, source);

        articles.push({
            id: `pm-${id}`,
            title,
            summary: abstractText.trim() || "Abstract not available.",
            source,
            authors: authorsStr, 
            fullAuthors: fullAuthorsStr || authorsStr,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            date: dateStr,
            category: category,
            relevanceScore: relevance,
            topic: topic || 'General',
            isFree: isFree,
            keywords: keywords.length > 0 ? keywords : undefined,
            imageUrl: pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/bin/fig1.jpg` : undefined
        });
    }
    return articles;
};

export const fetchPubMedArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  years?: number,
  offset: number = 0,
  onlyFullText: boolean = false
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getPubMedTopicQuery(topic);
    
    let query = `(${mainTerm})`;
    const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
    if (isAuthorSearch) {
        const authorName = customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim();
        query = `${authorName}[Author]`;
    } else {
        const kidneyContext = '("Kidney"[Title/Abstract] OR "Renal"[Title/Abstract] OR "Nephrology"[Title/Abstract] OR "Kidney Diseases"[MeSH])';
        query = customQuery 
            ? `(${mainTerm}) AND ${kidneyContext}`
            : `(${mainTerm})`;
        query = query.toLowerCase().includes('humans') ? query : `${query} AND "Humans"[MeSH]`;
    }
    
    // Pass offset and onlyFullText to search
    const ids = await searchPubMed(query, years, offset, onlyFullText);
    if (!ids || ids.length === 0) return { summary: "No results found in PubMed.", articles: [] };

    const articles = await fetchDetails(ids, typeof topic === 'string' ? topic : 'General');
    return {
      summary: `PubMed: ${articles.length} results.`,
      articles: articles
    };
  } catch (error: any) {
    console.error("PubMed API Error, attempting EuropePMC fallback:", error);
    try {
      // Use the resilient EuropePMC REST API which supports CORS natively
      const epResult = await fetchEuropePmcArticles(
        topic,
        language,
        customQuery,
        years,
        onlyFullText
      );
      
      // Map EuropePMC articles back to standard PubMed format (by prefixing PMID and adjusting URLs)
      const mappedArticles = epResult.articles.map(art => {
        const cleanId = art.id.replace('epmc-', '');
        return {
          ...art,
          id: `pm-${cleanId}`,
          url: `https://pubmed.ncbi.nlm.nih.gov/${cleanId}/`
        };
      });
      
      console.log(`[PubMed Resiliency] successfully recovered using EuropePMC fallback: ${mappedArticles.length} articles`);
      return {
        summary: `PubMed (EuropePMC Fallback): ${mappedArticles.length} resultados.`,
        articles: mappedArticles
      };
    } catch (fallbackError) {
      console.error("PubMed fallback to EuropePMC also failed:", fallbackError);
      return { summary: "Error al cargar desde PubMed y sus respaldos", articles: [] };
    }
  }
};
