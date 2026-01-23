
import { ResearchUpdate, Article, Topic } from "../types";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { getPubMedTopicQuery } from "../utils/searchContexts";
import { detectArticleCategory } from "../utils/categoryDetection";

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const fetchWithRetry = async (url: string, options: RequestInit, retries = 1): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 500));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
};

const fetchEutils = async (endpoint: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET') => {
    const url = new URL(`${PUBMED_API_BASE}/${endpoint}`);
    const allParams = { ...params, tool: 'nephroupdate', email: 'demo@nephroupdate.com' };

    const requestOptions: RequestInit = { method: method, mode: 'cors' };

    if (method === 'GET') {
        Object.keys(allParams).forEach(key => url.searchParams.append(key, allParams[key]));
    } else {
        const body = new URLSearchParams();
        Object.keys(allParams).forEach(key => body.append(key, allParams[key]));
        requestOptions.body = body;
        requestOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    }

    return await fetchWithRetry(url.toString(), requestOptions); 
};

const searchPubMed = async (term: string, years?: number, offset: number = 0): Promise<string[]> => {
    // Construct date filter if years provided
    let dateFilter = '';
    if (years) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        // Use standard PubMed date range syntax
        dateFilter = ` AND ("${startYear}"[Date - Publication] : "3000"[Date - Publication])`;
    }

    const response = await fetchEutils('esearch.fcgi', {
        db: 'pubmed',
        term: term + dateFilter,
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
    }, 'GET');
    
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
  offset: number = 0
): Promise<ResearchUpdate> => {
  try {
    const mainTerm = customQuery || getPubMedTopicQuery(topic);
    
    // Auto-append Humans filter to custom queries to ensure clinical relevance (unless user already specified filters)
    let query = customQuery 
        ? (customQuery.includes('Humans') ? `(${mainTerm})` : `(${mainTerm}) AND "Humans"[MeSH]`)
        : `(${mainTerm})`;
    
    // Pass offset to search
    const ids = await searchPubMed(query, years, offset);
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
