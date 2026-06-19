
import { ResearchUpdate, Article, Topic } from "../types";
import { getGeneralTopicQuery } from "../utils/searchContexts";
import { calculateBaseClinicalScore } from "../constants/searchConstants";
import { Capacitor } from '@capacitor/core';

const ELSEVIER_API_BASE = 'https://api.elsevier.com/content/search/sciencedirect';
const CROSSREF_API_BASE = 'https://api.crossref.org/works';

// Limpieza de tags estilo PubMed [MeSH], [Title], etc.
const cleanQueryTags = (query: string): string => {
    return query.replace(/\[.*?\]/g, "").trim();
};

export const fetchElsevierArticles = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string,
  apiKey?: string 
): Promise<ResearchUpdate> => {
  const currentYear = new Date().getFullYear();
  const dateRange = `${currentYear - 2}-${currentYear}`;

  let term = customQuery || getGeneralTopicQuery(topic);
  term = cleanQueryTags(term);
  const isAuthorSearch = customQuery && customQuery.startsWith("AUTHOR:");
  let qsTerm = customQuery ? `${term} AND (kidney OR nephrology OR renal)` : term;
  
  if (isAuthorSearch) {
      qsTerm = `author(${customQuery.replace("AUTHOR:", "").replace(/"/g, "").trim()})`;
  }

  // Si tenemos API Key, intentamos con Elsevier
  if (apiKey) {
      try {
        let url = ELSEVIER_API_BASE;
        if (!Capacitor.isNativePlatform()) {
            url = `/api/proxy?url=${encodeURIComponent(url)}`;
        }
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-ELS-APIKey': apiKey,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                qs: qsTerm,
                date: isAuthorSearch ? undefined : dateRange,
                display: {
                    offset: 0,
                    show: 100,
                    sortBy: "date"
                }
            })
        });

        if (response.ok) {
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

                const allAuthors = item.authors ? item.authors.map((a: any) => a.name) : [];
                const authorsStr = allAuthors.length > 3 ? allAuthors.slice(0, 3).join(', ') + ', et al.' : allAuthors.join(', ');
                
                return {
                    id: `els-${item.pii || Math.random()}`,
                    title: title,
                    summary: summary,
                    source: source,
                    authors: authorsStr,
                    fullAuthors: allAuthors.join(', '),
                    url: link,
                    date: date,
                    category: 'Research',
                    relevanceScore: relevance,
                    topic: typeof topic === 'string' ? topic : 'General',
                    isFree: !!item.openAccess,
                    doi: item.doi || undefined
                };
            });

            return { summary: `Elsevier: ${articles.length} results.`, articles: articles };
        } else {
            console.warn(`Elsevier API failed (${response.status}), falling back to Crossref method.`);
        }
      } catch (error) {
        console.warn("Error with Elsevier API, falling back to Crossref", error);
      }
  }

  // Fallback: Shadow Search on Crossref for Elsevier (member:78)
  try {
      let crossrefUrl = `${CROSSREF_API_BASE}?query=${encodeURIComponent(qsTerm)}&filter=type:journal-article,has-abstract:true,member:78&select=DOI,title,created,author,abstract,container-title,URL,is-referenced-by-count,published-print,published-online&rows=100&sort=published&order=desc`;
      
      if (!Capacitor.isNativePlatform()) {
          crossrefUrl = `/api/proxy?url=${encodeURIComponent(crossrefUrl)}`;
      }

      const crossrefResponse = await fetch(crossrefUrl);

      if (!crossrefResponse.ok) {
          throw new Error(`Crossref fallback failed: ${crossrefResponse.status}`);
      }

      const crossrefData = await crossrefResponse.json();
      const items = crossrefData.message?.items || [];

      const articles: Article[] = items.map((item: any) => {
          const title = item.title?.[0] || 'Untitled';
          const source = item['container-title']?.[0] || 'Elsevier (via Crossref)';
          let abstract = item.abstract || "Abstract not available.";
          abstract = abstract.replace(/<[^>]*>?/gm, ''); // clean basic HTML tags if any
          
          let date = 'N/A';
          let year = 0;
          if (item['published-print']?.['date-parts']?.[0]) {
              const parts = item['published-print']['date-parts'][0];
              year = parts[0];
              date = parts.join('-');
          } else if (item['published-online']?.['date-parts']?.[0]) {
              const parts = item['published-online']['date-parts'][0];
              year = parts[0];
              date = parts.join('-');
          } else if (item.created?.['date-parts']?.[0]) {
              const parts = item.created['date-parts'][0];
              year = parts[0];
              date = parts.join('-');
          }

          let authorsStr = '';
          let fullAuthorsStr = '';
          if (item.author && Array.isArray(item.author)) {
              const names = item.author.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean);
              authorsStr = names.length > 3 ? names.slice(0, 3).join(', ') + ', et al.' : names.join(', ');
              fullAuthorsStr = names.join(', ');
          }

          const relevance = calculateBaseClinicalScore(title, abstract, source, typeof topic === 'string' ? topic : '', 0, year);

          return {
              id: `cr-els-${item.DOI || Math.random()}`,
              title: title,
              summary: abstract,
              source: source,
              authors: authorsStr,
              fullAuthors: fullAuthorsStr || authorsStr,
              url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
              date: date,
              category: 'Research',
              relevanceScore: relevance,
              topic: typeof topic === 'string' ? topic : 'General',
              isFree: false, // crossref doesn't reliably indicate if it's OA on elsevier itself
              doi: item.DOI || undefined
          };
      });

      return { summary: `Elsevier (Crossref Shadow): ${articles.length} results.`, articles: articles };

  } catch (error) {
      console.error("Error in Elsevier Fallback (Crossref)", error);
      return { summary: "Error fetching Elsevier & Fallback", articles: [] };
  }
};
