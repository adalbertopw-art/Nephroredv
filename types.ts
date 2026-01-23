
export type Topic = string;
export type Language = 'original' | 'es';

export type ArticleCategory = 
  | 'Research' 
  | 'News' 
  | 'Case Study' 
  | 'Publication' 
  | 'Clinical Trial' 
  | 'Manual'
  | 'Guideline'      // Green
  | 'Retraction'     // Red
  | 'Meta-Analysis'  // Purple
  | 'Review'         // Amber
  | 'Cohort';        // Blue/Slate

export interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  authors?: string;
  url: string;
  date: string;
  category: ArticleCategory;
  relevanceScore: number;
  topic?: string;
  updates?: Article[];
  isFree?: boolean; // New field for Open Access status
  note?: string; // Personal user note
  imageUrl?: string; // URL for article thumbnail or figure
  visualAbstract?: string; // ASCII/Markdown visual abstract
  
  // New Clinical TL;DR Feature
  clinicalTldr?: {
    change: string;
    population: string;
  };

  // Associated Publications (e.g., for Clinical Trials)
  associatedPublications?: string[];

  // New Study Features
  readingStatus?: 'unread' | 'in_progress' | 'completed';
  highlights?: string[]; // Array of selected text snippets
  lastReadAt?: number; // Timestamp for Spaced Repetition
}

export interface ResearchUpdate {
  articles: Article[];
  summary: string;
  searchMode?: SearchMode; // Track which mode generated this result
  language?: Language;     // Track content language
}

export interface HistorySnapshot {
  id: string;
  date: string; // ISO String of when the fetch happened
  timestamp: number;
  topic: string;
  query?: string;
  sessionQueries?: string[]; // New: List of queries grouped in this session
  summary: string;
  articles: Article[];
}

export type RetentionPeriod = '7' | '30' | '90' | 'forever';

// Updated to 4-level scale (A-AAAA)
export type TextSize = 'sm' | 'base' | 'lg' | 'xl';
export type SearchMode = 'ai' | 'standard';
export type DataSource = 'pubmed' | 'openalex' | 'europepmc' | 'semanticscholar' | 'clinicaltrials' | 'core' | 'doaj' | 'elsevier' | 'lilacs';
export type UiLanguage = 'es' | 'en';
export type AIProvider = 'gemini' | 'groq';
export type FontStyle = 'sans' | 'serif' | 'modern';
