
import { ResearchUpdate, Article, Topic } from "../types";
import { getGeneralTopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";

const CORE_API_BASE = 'https://api.core.ac.uk/v3/search/works';

export const fetchCoreArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  apiKey?: string,
  sortBy: 'date' | 'relevance' = 'date'
): Promise<ResearchUpdate> => {
  try {
    const term = customQuery || getGeneralTopicQuery(topic);
    const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
    let query = `(${term}) AND (nephrology OR kidney OR renal)`;
    if (isAuthorSearch) {
        query = `authors:"${customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim()}"`;
    }
    
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const requestBody: any = {
            q: query,
            limit: 60, // Increased to 60
            offset: 0
        };
        if (sortBy === 'date') {
            requestBody.sort = 'publishedDate:desc';
        }

        const response = await fetch(CORE_API_BASE, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            return { summary: "CORE API Limit/Error", articles: [] };
        }
        
        const data = await response.json();
        const results = data.results || [];

        const articles: Article[] = results.map((item: any) => {
          const title = item.title || 'Untitled';
          const abstract = item.abstract || "No abstract available.";
          const source = item.publisher || 'CORE Repository';
          const date = item.publishedDate ? item.publishedDate.substring(0, 4) : 'N/A';
          const year = item.yearPublished || 0;
          
          const relevance = calculateBaseClinicalScore(title, abstract, source, typeof topic === 'string' ? topic : '', 0, year);

          let authorsStr = "";
          let fullAuthorsStr = "";
          if (item.authors && item.authors.length > 0) {
              const names = item.authors.map((a: any) => a.name || '').filter(Boolean);
              authorsStr = names.slice(0,3).join(', ') + (names.length > 3 ? ', et al' : '');
              fullAuthorsStr = names.join(", ");
          }
          
          const link = item.downloadUrl || item.fullTextIdentifier || `https://core.ac.uk/display/${item.id}`;

          return {
            id: `core-${item.id}`,
            title: title,
            summary: abstract,
            source: source,
            authors: authorsStr,
            fullAuthors: fullAuthorsStr || authorsStr,
            url: link,
            date: date,
            category: 'Research',
            relevanceScore: relevance,
            topic: typeof topic === 'string' ? topic : 'General',
            isFree: true
          };
        });

        return {
          summary: `CORE: ${articles.length} OA results.`,
          articles: articles
        };

    } catch (networkError) {
        return { summary: "CORE unavailable", articles: [] };
    }

  } catch (error) {
    console.warn("CORE Service Error:", error);
    return { summary: "Error fetching CORE", articles: [] };
  }
};
