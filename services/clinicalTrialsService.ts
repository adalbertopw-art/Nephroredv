
import { ResearchUpdate, Article, Topic } from "../types";
import { getClinicalTrialsQuery } from "../utils/searchContexts";

const CT_API_BASE = 'https://clinicaltrials.gov/api/v2/studies';

export const fetchClinicalTrials = async (
  topic: Topic | string,
  language: 'es' | 'original' = 'original',
  customQuery?: string
): Promise<ResearchUpdate> => {
  try {
    let condition = customQuery || getClinicalTrialsQuery(topic);
    
    // Fix: Remove PubMed-specific date range filters
    condition = condition.replace(/\s*AND\s*\(?\"\d{4}\"\[Date\s*-\s*Publication\]\s*:\s*\"3000\"\[Date\s*-\s*Publication\]\)?/gi, '');
    condition = condition.replace(/[()]/g, '').trim();

    if (!condition) {
        return { summary: "No search condition provided.", articles: [] };
    }
    
    // Explicitly request fields
    const fields = [
        'protocolSection.identificationModule',
        'protocolSection.descriptionModule',
        'protocolSection.statusModule',
        'protocolSection.referencesModule'
    ].join(',');

    const url = `${CT_API_BASE}?query.term=${encodeURIComponent(condition)}&pageSize=60&fields=${fields}`;

    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 400) {
            return { summary: "ClinicalTrials query format adjusted.", articles: [] };
        }
        throw new Error(`ClinicalTrials API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const studies = data.studies || [];

    if (studies.length === 0) {
      return { summary: "No clinical trials found.", articles: [] };
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 3;

    // Filter by update date to ensure relevance
    const filteredStudies = studies.filter((study: any) => {
        const dateStr = study.protocolSection?.statusModule?.lastUpdateSubmitDate;
        if (!dateStr) return false;
        const year = new Date(dateStr).getFullYear();
        return year >= minYear;
    });

    const articles: Article[] = filteredStudies.map((study: any) => {
      const protocol = study.protocolSection;
      const derived = study.derivedSection;
      
      const id = protocol?.identificationModule?.nctId || 'N/A';
      const title = protocol?.identificationModule?.briefTitle || 'Untitled Clinical Trial';
      let summary = protocol?.descriptionModule?.briefSummary || 'No summary provided.';
      const org = protocol?.identificationModule?.organization?.fullName || 'Unknown Sponsor';
      const date = protocol?.statusModule?.lastUpdateSubmitDate || 'N/A';
      
      const pubList: string[] = [];
      if (protocol?.referencesModule?.references) {
           protocol.referencesModule.references.forEach((ref: any) => {
               if (ref.citation) {
                   const typeTag = ref.type ? `[${ref.type}]` : '[REF]';
                   pubList.push(`${typeTag} ${ref.citation} ${ref.pmid ? `(PMID: ${ref.pmid})` : ''}`);
               }
           });
      }

      return {
        id: `ct-${id}`,
        title: `[TRIAL] ${title}`,
        summary: summary,
        source: "ClinicalTrials.gov",
        authors: org,
        url: `https://clinicaltrials.gov/study/${id}`,
        date: date,
        category: 'Clinical Trial',
        relevanceScore: 60, // Lower score for trials vs papers
        topic: typeof topic === 'string' ? topic : 'General',
        isFree: true,
        associatedPublications: pubList.length > 0 ? pubList : undefined
      };
    });

    return {
      summary: `ClinicalTrials.gov: ${articles.length} studies.`,
      articles: articles
    };

  } catch (error) {
    console.debug("ClinicalTrials Service Info:", error);
    return { summary: "Error fetching ClinicalTrials", articles: [] };
  }
};
