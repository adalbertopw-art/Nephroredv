
import { ResearchUpdate, Article, Topic } from "../types";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { getPubMedTopicQuery } from "../utils/searchContexts";
import { detectArticleCategory } from "../utils/categoryDetection";

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Direct HTTP ${response.status}`);
        return response;
    } catch (err) {
        // Try proxy fallback on failure
        try {
            // Priority 1 proxy: allorigins
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const proxyOptions = { ...options, mode: 'cors' as RequestMode };
            if (options.method === 'POST') {
                // allorigins does not properly support proxied POST bodies for free via /raw?, 
                // but we primarily use GET for pubmed. If POST is needed, use corsproxy.
            }
            
            const response = await fetch(proxyUrl, options.method === 'POST' ? undefined : proxyOptions);
            if (!response.ok) throw new Error(`Proxy 1 HTTP ${response.status}`);
            return response;
        } catch (proxyErr) {
            try {
                // Priority 2 proxy: corsproxy.io
                const corsUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const response = await fetch(corsUrl, { ...options, mode: 'cors' });
                if (!response.ok) throw new Error(`Proxy 2 HTTP ${response.status}`);
                return response;
            } catch (err3) {
                 if (retries > 0) {
                    await new Promise(r => setTimeout(r, 1000));
                    return fetchWithRetry(url, options, retries - 1);
                }
                throw err;
            }
        }
    }
};

const fetchEutils = async (endpoint: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET') => {
    const url = new URL(`${PUBMED_API_BASE}/${endpoint}`);
    const allParams = { ...params, tool: 'nephroupdate', email: 'demo@nephroupdate.com' };

    const requestOptions: RequestInit = { method: method, mode: 'cors', referrerPolicy: 'no-referrer' };

    if (method === 'GET') {
        Object.keys(allParams).forEach(key => url.searchParams.append(key, allParams[key]));
    } else {
        const body = new URLSearchParams();
        Object.keys(allParams).forEach(key => body.append(key, allParams[key]));
        requestOptions.body = body;
        requestOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    }

    try {
        return await fetchWithRetry(url.toString(), requestOptions); 
    } catch (error) {
        console.error(`PubMed Fetch Error for ${endpoint}:`, error);
        throw error;
    } 
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
    
    const data = await response.json();
    return data.esearchresult?.idlist || [];
};

const fetchDetails = async (ids: string[], topic: string): Promise<Article[]> => {
    const response = await fetchEutils('efetch.fcgi', {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml'
    }, 'POST');
    
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
        const authorList = articleTag.getElementsByTagName("AuthorList")[0];
        if (authorList) {
            const authors = authorList.getElementsByTagName("Author");
            const authorNames = [];
            const limit = Math.min(authors.length, 3);
            for (let k = 0; k < limit; k++) {
                const lastName = authors[k].getElementsByTagName("LastName")[0]?.textContent;
                if (lastName) authorNames.push(lastName);
            }
            if (authors.length > 3) authorNames.push("et al");
            authorsStr = authorNames.join(", ");
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
    
    // Auto-append Humans filter to custom queries to ensure clinical relevance (unless user already specified filters)
    // Use a broader term "Humans" instead of strict [MeSH] to avoid filtering out unindexed recent articles
    let query = customQuery 
        ? (customQuery.toLowerCase().includes('humans') ? `(${mainTerm})[Title/Abstract]` : `(${mainTerm})[Title/Abstract] AND Humans`)
        : `(${mainTerm})`;
    
    // Pass offset and onlyFullText to search
    const ids = await searchPubMed(query, years, offset, onlyFullText);
    if (!ids || ids.length === 0) return { summary: "No results found in PubMed.", articles: [] };

    const articles = await fetchDetails(ids, typeof topic === 'string' ? topic : 'General');
    return {
      summary: `PubMed: ${articles.length} results.`,
      articles: articles
    };
  } catch (error) {
    console.error("PubMed API Error:", error);
    return { summary: "Error fetching PubMed", articles: [] };
  }
};
