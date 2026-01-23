
import { ResearchUpdate, Article, Topic } from "../types";
import { getGeneralTopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";

const ELSEVIER_API_BASE = 'https://api.elsevier.com/content/search/sciencedirect';

export const fetchElsevierArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  apiKey?: string 
): Promise<ResearchUpdate> => {
  if (!apiKey) return { summary: "Elsevier API Key Missing", articles: [] };

  try {
    const term = customQuery || getGeneralTopicQuery(topic);
    
    const response = await fetch(ELSEVIER_API_BASE, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-ELS-APIKey': apiKey,
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            qs: term,
            date: 2025, // Focus on recent ScienceDirect results
            display: {
                offset: 0,
                show: 60, // Increased to 60
                sortBy: "date"
            }
        })
    });

    if (!response.ok) throw new Error(`Elsevier Error: ${response.status}`);

    const data = await response.json();
    const results = data.results || [];

    const articles: Article[] = results.map((item: any) => {
        const title = item.title || 'Untitled';
        const source = item.sourceTitle || 'ScienceDirect';
        const summary = item.description || "View full text on ScienceDirect."; 
        const date = item.publicationDate || 'N/A';
        const year = item.publicationDate ? parseInt(item.publicationDate.substring(0, 4), 10) : 0;
        const link = item.uri || item.link?.find((l: any) => l['@ref'] === 'scidir')?.['@href'];
        const relevance = calculateBaseClinicalScore(title, summary, source, typeof topic === 'string' ? topic : '', 0, year);

        return {
            id: `els-${item.pii || Math.random()}`,
            title: title,
            summary: summary,
            source: source,
            authors: item.authors ? item.authors.map((a: any) => a.name).join(', ') : '',
            url: link,
            date: date,
            category: 'Research',
            relevanceScore: relevance,
            topic: typeof topic === 'string' ? topic : 'General',
            isFree: item.openAccess
        };
    });

    return { summary: `Elsevier: ${articles.length} results.`, articles: articles };
  } catch (error) {
    return { summary: "Error fetching Elsevier", articles: [] };
  }
};
