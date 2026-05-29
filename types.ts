
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
  | 'Community'      // Indigo
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
  keywords?: string[]; // MeSH or Author keywords
  
  // PDF Ecosystem Features
  localPdfData?: string; // Base64 encoded PDF string
  fullTextContent?: string; // Semantic text extracted from PDF for AI
  
  // Forum/Debate Reference
  doi?: string;
  article_id?: string;
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

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface DeepAnalysisResult {
  keyResults: { group: string; outcome: string; pValue: string }[];
  biasRisk: 'Low' | 'Moderate' | 'High';
  biasReason: string;
  limitations: string[];
  pico: {
    patient: string;
    intervention: string;
    outcome: string;
  };
}

// --- SOCIAL JOURNAL CLUB TYPES ---

export type ReactionType = 'solid' | 'biased' | 'novel' | 'limited' | 'like' | 'useful' | 'doubt';

export interface Reaction {
  id: string;
  user_id: string;
  post_id?: string; // For ForumPost
  comment_id?: string; // For Comment
  reaction_type: ReactionType;
  created_at: string;
}

export interface Comment {
  id: string;
  article_id?: string; // For SocialJournalClub on articles
  post_id?: string; // For ForumPost
  user_id: string;
  user_name: string;
  user_specialty?: string;
  content: string;
  created_at: string;
  parent_id?: string; // For threading
  is_ai_moderator?: boolean;
  endorsed_by?: string[]; // Deprecated in favor of Reactions table but kept for backward compatibility
}

// --- COMMUNITY & IMPACT TYPES ---

export interface Survey {
  id: string;
  title: string;
  description: string;
  options: string[];
  votes: number[];
  totalVotes: number;
  userVote?: number;
  expiresAt: string;
  category: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  author_id?: string;
  authorSpecialty: string;
  createdAt: string;
  replies: number;
  likes: number; // Aggregated for display
  userLiked?: boolean; // Derived from Reactions table
  tags: string[];
  specialty?: string; // Added for normalization
  url?: string; // Link to the article
  doi?: string; // DOI of the article
  article_id?: string; // Reference to the original article if proposed from one
}

export type RetentionPeriod = '7' | '30' | '90' | 'forever';

// Updated to 4-level scale (A-AAAA)
export type TextSize = 'sm' | 'base' | 'lg' | 'xl';
export type SearchMode = 'ai' | 'standard';
export type DataSource = 'pubmed' | 'openalex' | 'europepmc' | 'semanticscholar' | 'clinicaltrials' | 'core' | 'doaj' | 'elsevier' | 'lilacs';
export type UiLanguage = 'es' | 'en';
export type AIProvider = 'gemini' | 'groq';
export type FontStyle = 'sans' | 'serif' | 'modern';
export type LayoutMode = 'standard' | 'bento';
