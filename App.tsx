import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bookmark, RefreshCw, AlertCircle, Loader2, Search, Settings, Moon, Sun, ChevronDown, ChevronUp, Sparkles, X, History, Clock, Trash2, Mic, Volume2, Key, Check, Zap, Database, Book, FlaskConical, Library, Building2, Languages, Palette, CalendarClock, ArrowUp, Info, BookOpen, Download, Workflow, StickyNote, Bell, GraduationCap, Quote, Lock, Unlock, FileText, SlidersHorizontal, Microscope, Radar, ArrowLeft, BrainCircuit, WifiOff, Eye, Plus, Tag, ArrowUpCircle, ArrowDownCircle, GripVertical, Undo2, User, Home, LayoutGrid, ScanEye, Layers, Filter, Calendar, List, ArrowRight, RotateCcw, Activity, ExternalLink, ShieldCheck, Type, Newspaper, Globe, Server, Mail, Flame, Scale, Share2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { App as CapacitorApp } from '@capacitor/app';

// Services
import { fetchLatestNephrologyNews, verifyGeminiKey, generateGeminiSummary, refinePicoTerms, translateSimpleQuery, searchMedicalGoogle } from './services/geminiService';
import { fetchPubMedArticles } from './services/pubmedService';
import { fetchOpenAlexArticles } from './services/openAlexService';
import { fetchEuropePmcArticles } from './services/europePmcService';
import { fetchSemanticScholarArticles } from './services/semanticScholarService';
import { fetchClinicalTrials } from './services/clinicalTrialsService';
import { fetchCoreArticles } from './services/coreApiService';
import { fetchDoajArticles } from './services/doajService';
import { fetchElsevierArticles } from './services/elsevierService';
import { fetchLilacsArticles } from './services/lilacsService';
import { generateGroqSummary, verifyGroqKey } from './services/groqService';
import { getOfflineStatusMap, getOfflineArticle, clearOfflineStorage, saveArticleOffline } from './services/storageService';
import { fetchArticleContent } from './services/downloadService';

// Constants
import { getArticleImpactTier } from './constants/searchConstants';

// Types & Components
import { Article, ResearchUpdate, Topic, Language, HistorySnapshot, RetentionPeriod, TextSize, SearchMode, DataSource, UiLanguage, AIProvider, FontStyle } from './types';
import ArticleCard from './components/ArticleCard';
import ArticleSkeleton from './components/ArticleSkeleton';
import NewsTicker from './components/NewsTicker';
import VoiceModal from './components/VoiceModal';
import OfflineReader from './components/OfflineReader';
import ImmersiveReader from './components/ImmersiveReader';
import HistoryViewer from './components/HistoryViewer';
import HistoryAnalytics from './components/HistoryAnalytics';
import { detectStudyDesign, StudyDesign } from './utils/categoryDetection';

const DEFAULT_TOPICS: Topic[] = [
  'General',
  'Renal Transplant',
  'Acute Kidney Injury',
  'Renal Support Therapies',
  'Chronic Kidney Disease',
  'Hypertension',
  'Glomerular Diseases',
  'Onco-Nephrology'
];

const TAB_ORDER = ['history', 'discover', 'saved'];

const KidneyIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9.5 3.5C4.5 3.5 1.5 8 1.5 13C1.5 18 5 21.5 9.5 21.5C14 21.5 17.5 19 19 16.5C20.5 14 20.5 9.5 19 7C17.5 4.5 13.5 3.5 9.5 3.5Z" />
    <path d="M6.5 8V16L10.5 8V16" strokeLinecap="square" />
    <path d="M13.5 8V13.5C13.5 15 14.5 16 16 16C17.5 16 18.5 15 18.5 13.5V8" />
    <circle cx="6.5" cy="8" r="1" fill="currentColor" fillOpacity="0.5" />
    <circle cx="10.5" cy="16" r="1" fill="currentColor" fillOpacity="0.5" />
    <circle cx="18.5" cy="8" r="1" fill="currentColor" fillOpacity="0.5" />
    <path d="M20 12H22.5" strokeDasharray="1 1" />
    <circle cx="22.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

const translations = {
  es: {
    discover: 'Descubrir', library: 'Biblioteca', history: 'Historial', searchPlaceholder: 'Explorar evidencia...',
    welcome: 'Bienvenido a', subtitle: 'NephroUpdate', loading: 'Analizando evidencia...',
    error: 'Error de conexión.', saved: 'Guardado', removed: 'Eliminado',
    libraryTitle: 'Tu Biblioteca', historyTitle: 'Línea de Tiempo',
    fullTextError: 'No se pudo extraer el texto completo.', openingReader: 'Obteniendo Texto Completo...',
    analysisStopped: 'Análisis detenido por el usuario.', translating: 'Traduciendo al inglés médico...',
    picoTitle: 'Búsqueda Estructurada PICO', picoDesc: 'Define tu pregunta clínica para generar una query booleana precisa.',
    pLabel: 'Paciente / Problema', pPlaceholder: 'ej. Nefropatía Diabética, CKD Estadio 4...',
    iLabel: 'Intervención', iPlaceholder: 'ej. Inhibidores SGLT2, Finerenone...',
    cLabel: 'Comparación (Opcional)', cPlaceholder: 'ej. Placebo, Bloqueo RAS estándar...',
    oLabel: 'Resultado (Opcional)', oPlaceholder: 'ej. Progresión a ESRD, Mortalidad...',
    searchPico: 'Generar Query & Buscar',
    searchingFor: 'Buscando:',
    translatedFrom: 'Traducido de:',
    undo: 'Deshacer (Original)'
  },
  en: {
    discover: 'Discover', library: 'Library', history: 'History', searchPlaceholder: 'Search evidence...',
    welcome: 'Welcome to', subtitle: 'NephroUpdate', loading: 'Analyzing evidence...',
    error: 'Connection error.', saved: 'Saved', removed: 'Removed',
    libraryTitle: 'Your Library', historyTitle: 'Timeline',
    fullTextError: 'Could not extract full text.', openingReader: 'Fetching Full Text...',
    analysisStopped: 'Analysis stopped by user.', translating: 'Translating to medical English...',
    picoTitle: 'PICO Structured Search', picoDesc: 'Define clinical question for precise query.',
    pLabel: 'Patient / Problem', pPlaceholder: 'e.g., Diabetic Nephropathy...',
    iLabel: 'Intervention', iPlaceholder: 'e.g., SGLT2 Inhibitors...',
    cLabel: 'Comparison (Optional)', cPlaceholder: 'e.g., Placebo...',
    oLabel: 'Outcome (Optional)', oPlaceholder: 'e.g., Outcome...',
    searchPico: 'Generate & Search',
    searchingFor: 'Searching for:',
    translatedFrom: 'Translated from:',
    undo: 'Undo (Use original)'
  }
};

const parseDateScore = (dateStr: string): number => {
    if (!dateStr || dateStr === 'N/A') return 0;
    const standardDate = new Date(dateStr);
    if (!isNaN(standardDate.getTime())) return standardDate.getTime();
    const yearMatch = dateStr.match(/(20\d{2})/);
    if (yearMatch) {
        return new Date(parseInt(yearMatch[0]), 0, 1).getTime();
    }
    return 0;
};

const hybridSort = (articles: Article[]) => {
    const currentYear = new Date().getFullYear();
    const recentThresholdYear = currentYear - 3;

    return articles.sort((a, b) => {
        const tierA = getArticleImpactTier(a);
        const tierB = getArticleImpactTier(b);
        if (tierA === 0 && tierB !== 0) return -1;
        if (tierB === 0 && tierA !== 0) return 1;
        const dateA = parseDateScore(a.date);
        const dateB = parseDateScore(b.date);
        const yearA = new Date(dateA).getFullYear();
        const yearB = new Date(dateB).getFullYear();
        const isRecentA = yearA >= recentThresholdYear;
        const isRecentB = yearB >= recentThresholdYear;
        if (isRecentA && !isRecentB) return -1;
        if (!isRecentA && isRecentB) return 1;
        if (tierA !== tierB) return tierA - tierB;
        return dateB - dateA;
    });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'history'>('discover');
  const [direction, setDirection] = useState(0);
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState<Topic>('General');
  const [topicCache, setTopicCache] = useState<Record<string, ResearchUpdate>>({});
  const [articles, setArticles] = useState<Article[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false); // New State for manual synthesis
  const [error, setError] = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('es');
  const [contentLanguage, setContentLanguage] = useState<Language>('es');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<Record<string, boolean>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [libraryFilter, setLibraryFilter] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDesign, setFilterDesign] = useState<StudyDesign[]>([]);
  const [filterTier, setFilterTier] = useState<number>(4);
  const [libraryTopicFilter, setLibraryTopicFilter] = useState<string>('All');
  const [historyTopicFilter, setHistoryTopicFilter] = useState<string>('All');

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('standard');
  const [activeImmersiveArticle, setActiveImmersiveArticle] = useState<Article | null>(null);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [searchModalTab, setSearchModalTab] = useState<'text' | 'pico'>('text');
  const [picoData, setPicoData] = useState({ p: '', i: '', c: '', o: '' });
  
  const [visibleCount, setVisibleCount] = useState(20); 
  const [currentPage, setCurrentPage] = useState(1);

  const [activeSources, setActiveSources] = useState<Record<DataSource, boolean>>({
      pubmed: true, openalex: true, europepmc: true, semanticscholar: true,
      clinicaltrials: true, core: true, doaj: true, elsevier: true, lilacs: true 
  });
  const [viewingHistorySnapshot, setViewingHistorySnapshot] = useState<HistorySnapshot | null>(null);

  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerArticle, setReaderArticle] = useState<Article | null>(null);
  const [readerHtml, setReaderHtml] = useState('');
  const [isReaderLoading, setIsReaderLoading] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [autoXray, setAutoXray] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqStatus, setGroqStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  const [elsevierApiKey, setElsevierApiKey] = useState('');
  const [coreApiKey, setCoreApiKey] = useState('');
  const [s2ApiKey, setS2ApiKey] = useState('');
  const [textSize, setTextSize] = useState<TextSize>('base');
  const [fontStyle, setFontStyle] = useState<FontStyle>('sans');
  const [newTopicInput, setNewTopicInput] = useState('');
  const [showNewsFeed, setShowNewsFeed] = useState(true);

  const [sidebarDeletePending, setSidebarDeletePending] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<'history' | 'factory' | null>(null);

  const [translationNotice, setTranslationNotice] = useState<{original: string, translated: string} | null>(null);

  // Scroll to Top & Liquid Crystal Button State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topicRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const topicContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const touchStartY = useRef(0);

  const t = translations[uiLanguage];

  useEffect(() => {
    const timer = setTimeout(() => {
        const activeBtn = topicRefs.current[selectedTopic];
        if (activeBtn && topicContainerRef.current) {
            activeBtn.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedTopic, topics]);

  // Handle Scroll to Top logic with "Liquid Crystal" button behavior
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
        const currentScroll = el.scrollTop;
        
        // Show button if scrolled down > 400px
        setShowScrollTop(currentScroll > 400);

        // Detect Scrolling Activity to hide button during displacement
        setIsUserScrolling(true);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        
        scrollTimeout.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 300); // 300ms delay to reappear after stop
    };

    el.addEventListener('scroll', handleScroll);
    return () => {
        el.removeEventListener('scroll', handleScroll);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // Smart Cache Writer: Automatically saves successful results to cache
  useEffect(() => {
      if (!loading && articles.length > 0 && selectedTopic && !searchQuery) {
           setTopicCache(prev => ({
               ...prev,
               [selectedTopic]: {
                   articles,
                   summary,
                   searchMode,
                   language: contentLanguage
               }
           }));
      }
  }, [articles, summary, loading, selectedTopic, searchQuery, searchMode, contentLanguage]);

  const scrollToTop = () => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextTopic = useCallback(() => {
    const currentIndex = topics.indexOf(selectedTopic);
    if (currentIndex < topics.length - 1) {
        handleTopicClick(topics[currentIndex + 1]);
        if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [selectedTopic, topics]);

  const handlePrevTopic = useCallback(() => {
    const currentIndex = topics.indexOf(selectedTopic);
    if (currentIndex > 0) {
        handleTopicClick(topics[currentIndex - 1]);
        if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [selectedTopic, topics]);

  const startLongPress = (action: () => void) => {
      longPressTimer.current = setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
          action();
      }, 600);
  };

  const cancelLongPress = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const updateOfflineStatusMap = async () => {
    const map = await getOfflineStatusMap();
    setOfflineStatus(map);
  };

  const handleFetchFullText = async (article: Article) => {
      const offline = await getOfflineArticle(article.id);
      if (offline && offline.hasFullText) {
          setReaderArticle(article);
          setReaderHtml(offline.htmlContent);
          setIsReaderOpen(true);
          setIsReaderLoading(false);
          return;
      }
      setReaderArticle(article);
      setReaderHtml('');
      setIsReaderOpen(true);
      setIsReaderLoading(true);
      try {
          const content = await fetchArticleContent(article);
          setReaderHtml(content.html);
      } catch (err) {
          setReaderHtml(`<div style="padding: 40px; text-align: center;"><h3>${t.fullTextError}</h3><p>Intenta abrirlo en la web original.</p></div>`);
      } finally {
          setIsReaderLoading(false);
      }
  };

  const handleSaveOffline = useCallback(async (article: Article, html: string) => {
      await saveArticleOffline(article, html, true);
      setSavedArticles(prev => {
          if (prev.some(a => a.id === article.id)) return prev;
          return [article, ...prev];
      });
      await updateOfflineStatusMap();
      if (navigator.vibrate) navigator.vibrate(50);
  }, []);

  const handleManualSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsManualSearchOpen(false);
    setSearchQuery(term);
    setTranslationNotice(null);
    setCurrentPage(1);
    
    const newTopic = term.trim();
    if (!topics.includes(newTopic)) {
        setTopics(prev => [...prev, newTopic]);
    }
    setSelectedTopic(newTopic);
    
    setLoading(true);
    setArticles([]); 
    setSummary('');

    try {
        const translatedQuery = await translateSimpleQuery(newTopic, geminiApiKey);
        if (translatedQuery.toLowerCase() !== newTopic.toLowerCase()) {
            setTranslationNotice({ original: newTopic, translated: translatedQuery });
        }
        await fetchNews(newTopic, translatedQuery, undefined, undefined, true);
    } catch (e) {
        await fetchNews(newTopic, newTopic, undefined, undefined, true);
    }
  };

  const handlePicoSearch = async () => {
      setIsManualSearchOpen(false); 
      setLoading(true); 
      setArticles([]);
      setSummary('');
      setTranslationNotice(null);
      setCurrentPage(1); 

      try {
        const refined = await refinePicoTerms(picoData.p, picoData.i, picoData.c, picoData.o, geminiApiKey);
        const query = `(${refined.p}) AND (${refined.i}) ${refined.c ? `AND (${refined.c})` : ''} ${refined.o ? `AND (${refined.o})` : ''}`;
        const shortP = picoData.p.length > 25 ? picoData.p.substring(0, 25) + '...' : picoData.p;
        const topicName = `PICO: ${shortP}`;
        
        if (!topics.includes(topicName)) {
            setTopics(prev => [...prev, topicName]);
        }
        setSelectedTopic(topicName);
        setSearchQuery(query); 
        
        setTranslationNotice({ original: `P: ${picoData.p} I: ${picoData.i}`, translated: query });
        fetchNews(topicName, query, undefined, undefined, true);
      } catch (e) {
         const rawQuery = `(${picoData.p}) AND (${picoData.i})`;
         fetchNews(`PICO: ${picoData.p}`, rawQuery, undefined, undefined, true);
      }
  };

  const handleUndoTranslation = () => {
      if (translationNotice) {
          fetchNews(selectedTopic, translationNotice.original, undefined, undefined, true);
          setTranslationNotice(null);
      }
  };

  const handleCloseTopic = (topic: string) => {
      finalizeTopicDeletion(topic);
  };

  const toggleFilterDesign = (design: StudyDesign) => {
      setFilterDesign(prev => 
          prev.includes(design) ? prev.filter(d => d !== design) : [...prev, design]
      );
  };

  const availableLibraryTopics = useMemo(() => {
    const topics = new Set(savedArticles.map(a => a.topic || 'General'));
    return ['All', ...Array.from(topics)];
  }, [savedArticles]);

  const availableHistoryTopics = useMemo(() => {
    const topics = new Set(history.map(h => h.topic));
    return ['All', ...Array.from(topics)];
  }, [history]);

  const filteredArticles = useMemo(() => {
      let result = articles;
      if (filterDesign.length > 0) {
          result = result.filter(a => filterDesign.includes(detectStudyDesign(a)));
      }
      if (filterTier < 4) {
          result = result.filter(a => {
              const tier = getArticleImpactTier(a);
              return tier <= filterTier;
          });
      }
      return result;
  }, [articles, filterDesign, filterTier]);

  const filteredSavedArticles = useMemo(() => {
    let result = savedArticles;
    if (libraryFilter.trim()) {
        const lowSearch = libraryFilter.toLowerCase();
        result = result.filter(a => 
            a.title.toLowerCase().includes(lowSearch) || 
            a.source.toLowerCase().includes(lowSearch) ||
            (a.note && a.note.toLowerCase().includes(lowSearch))
        );
    }
    if (filterDesign.length > 0) {
        result = result.filter(a => filterDesign.includes(detectStudyDesign(a)));
    }
    if (filterTier < 4) {
        result = result.filter(a => getArticleImpactTier(a) <= filterTier);
    }
    if (libraryTopicFilter !== 'All') {
        result = result.filter(a => (a.topic || 'General') === libraryTopicFilter);
    }
    return hybridSort([...result]);
  }, [savedArticles, libraryFilter, filterDesign, filterTier, libraryTopicFilter]);

  const filteredHistory = useMemo(() => {
    let result = history;
    if (historyFilter.trim()) {
        const lowSearch = historyFilter.toLowerCase();
        result = result.filter(h => 
            h.topic.toLowerCase().includes(lowSearch) || 
            (h.query && h.query.toLowerCase().includes(lowSearch))
        );
    }
    if (historyTopicFilter !== 'All') {
        result = result.filter(h => h.topic === historyTopicFilter);
    }
    return result;
  }, [history, historyFilter, historyTopicFilter]);

  const handleTopicClick = (topic: Topic) => {
    if (selectedTopic === topic && activeTab === 'discover') {
      fetchNews(topic, '', undefined, undefined, true);
    } else {
      const currentIndex = topics.indexOf(selectedTopic);
      const newIndex = topics.indexOf(topic);
      setDirection(newIndex > currentIndex ? 1 : -1);
      setSelectedTopic(topic);
      setSearchQuery('');
      setTranslationNotice(null);
      setCurrentPage(1); 
      setActiveTab('discover');
      // Fix: Pass empty string explicitly to ensure query is cleared and not read from stale state
      fetchNews(topic, '', undefined, undefined, false);
    }
  };

  const fetchNews = async (
    overrideTopic?: string, 
    overrideQuery?: string, 
    overrideSearchMode?: SearchMode, 
    overrideLanguage?: Language, 
    forceRefresh = false, 
    years = 3, 
    page = 1
  ) => { 
      const topicToUse = overrideTopic || selectedTopic; 
      const queryToUse = (overrideQuery !== undefined) ? overrideQuery : searchQuery; 
      const modeToUse = overrideSearchMode || searchMode; 
      const langToUse = overrideLanguage || contentLanguage; 
      const yearsToFetch = forceRefresh ? 20 : years;

      // Smart Cache Check: Must match Topic + Search Mode + Language
      const cached = topicCache[topicToUse];
      const isCacheValid = cached && 
                           cached.searchMode === modeToUse && 
                           cached.language === langToUse;

      if (!forceRefresh && page === 1 && !queryToUse && isCacheValid) { 
          setArticles(cached.articles); 
          setSummary(cached.summary); 
          setLoading(false); 
          return; 
      } 
      
      if (abortControllerRef.current) abortControllerRef.current.abort(); 
      abortControllerRef.current = new AbortController(); 
      const currentSignal = abortControllerRef.current.signal; 
      
      setLoading(true); setError(null); 
      if (page === 1) {
          setArticles([]); 
          setSummary(''); 
          setVisibleCount(forceRefresh ? 50 : 20);
      }
      
      try { 
          const baseSearchTerm = queryToUse || topicToUse;
          let effectiveQuery = queryToUse;

          if (modeToUse === 'ai' && baseSearchTerm && !baseSearchTerm.includes('(') && !baseSearchTerm.includes('AND')) {
              setSummary(t.translating);
              effectiveQuery = await translateSimpleQuery(baseSearchTerm, geminiApiKey);
          }
          
          if (filterDesign.length > 0) {
              const filterTerms = filterDesign.map(d => {
                  if (d === 'RCT') return '("Randomized Controlled Trial" OR "Clinical Trial" OR "Ensayo Clinico")';
                  if (d === 'Meta-Analysis') return '("Meta-Analysis" OR "Systematic Review" OR "Metaanalisis")';
                  if (d === 'Case Report') return '("Case Report" OR "Case Series" OR "Reporte de Caso")';
                  if (d === 'Guideline') return '("Guideline" OR "Practice Guideline" OR "Consensus" OR "Guia de Practica")';
                  if (d === 'Review') return '("Review" OR "Revision")';
                  return '';
              }).filter(t => t !== '').join(' OR ');
              
              if (filterTerms) {
                  effectiveQuery = effectiveQuery 
                    ? `(${effectiveQuery}) AND (${filterTerms})`
                    : `(${topicToUse}) AND (${filterTerms})`;
              }
          }

          const sourcePromises: Promise<ResearchUpdate>[] = [];
          const offset = (page - 1) * 200;
          
          if (page === 1) {
              if (activeSources.pubmed) sourcePromises.push(fetchPubMedArticles(topicToUse, langToUse, effectiveQuery, yearsToFetch, offset));
              if (activeSources.openalex) sourcePromises.push(fetchOpenAlexArticles(topicToUse, langToUse, effectiveQuery, yearsToFetch, offset));
              if (activeSources.europepmc) sourcePromises.push(fetchEuropePmcArticles(topicToUse, langToUse, effectiveQuery, yearsToFetch));
              if (activeSources.semanticscholar) sourcePromises.push(fetchSemanticScholarArticles(topicToUse, langToUse, effectiveQuery, s2ApiKey));
              if (activeSources.clinicaltrials) sourcePromises.push(fetchClinicalTrials(topicToUse, langToUse, effectiveQuery));
              if (activeSources.core) sourcePromises.push(fetchCoreArticles(topicToUse, langToUse, effectiveQuery, coreApiKey));
              if (activeSources.doaj) sourcePromises.push(fetchDoajArticles(topicToUse, langToUse, effectiveQuery));
              if (activeSources.elsevier) sourcePromises.push(fetchElsevierArticles(topicToUse, langToUse, effectiveQuery, elsevierApiKey));
              if (activeSources.lilacs) sourcePromises.push(fetchLilacsArticles(topicToUse, langToUse, effectiveQuery));

              if (modeToUse === 'ai') {
                  sourcePromises.push(searchMedicalGoogle(effectiveQuery || baseSearchTerm, langToUse, geminiApiKey));
              }
          } else {
              if (activeSources.pubmed) sourcePromises.push(fetchPubMedArticles(topicToUse, langToUse, effectiveQuery, yearsToFetch, offset));
              if (activeSources.openalex) sourcePromises.push(fetchOpenAlexArticles(topicToUse, langToUse, effectiveQuery, yearsToFetch, offset));
          }

          let completedCount = 0;
          sourcePromises.forEach(promise => {
              promise.then((update) => {
                  if (currentSignal.aborted) return;
                  if (update.articles.length > 0) {
                      setArticles(prev => {
                          const combined = [...prev, ...update.articles];
                          const seenTitles = new Set();
                          const unique = combined.filter(a => {
                              const normTitle = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
                              if (seenTitles.has(normTitle)) return false;
                              seenTitles.add(normTitle);
                              return true;
                          });
                          return hybridSort(unique);
                      });
                  }
              }).finally(() => {
                  completedCount++;
                  if (completedCount === sourcePromises.length) {
                      if (modeToUse === 'ai' && page === 1) {
                          setArticles(currentArticles => {
                              if (currentArticles.length > 0) {
                                  generateGeminiSummary(currentArticles, topicToUse, langToUse, geminiApiKey)
                                      .then(aiSummary => setSummary(aiSummary));
                              }
                              return currentArticles;
                          });
                      }
                      setLoading(false);
                      if (articles.length > 0 && page === 1) {
                        setHistory(prev => {
                            const currentQuery = queryToUse || topicToUse;
                            const latest = prev[0];

                            // Prevent duplicate history entries by checking if the latest one matches
                            if (latest && latest.topic === topicToUse && latest.query === currentQuery) {
                                const updatedSnapshot = {
                                    ...latest,
                                    timestamp: Date.now(),
                                    date: new Date().toISOString(),
                                    summary: summary || latest.summary,
                                    articles: articles.slice(0, 15)
                                };
                                return [updatedSnapshot, ...prev.slice(1)];
                            }

                            const snapshot: HistorySnapshot = {
                                id: `snap-${Date.now()}`,
                                date: new Date().toISOString(),
                                timestamp: Date.now(),
                                topic: topicToUse,
                                query: currentQuery,
                                summary: summary,
                                articles: articles.slice(0, 15)
                            };
                            return [snapshot, ...prev].slice(0, 50);
                        });
                      }
                  }
              });
          });
      } catch (err: any) { 
          if (!currentSignal.aborted) { 
              setError(err.message || t.error); 
              setLoading(false); 
          } 
      } 
  };

  // Add reactive effect for Search Mode changes
  const isMounted = useRef(false);
  useEffect(() => {
      if (isMounted.current && activeTab === 'discover' && !loading) {
          // Force refresh using current state but with new search mode
          fetchNews(selectedTopic, searchQuery, searchMode, undefined, true);
      }
      isMounted.current = true;
  }, [searchMode]);
  
  const handleLoadMore = () => {
    if (visibleCount < filteredArticles.length) {
        setVisibleCount(prev => prev + 20);
    } else {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchNews(selectedTopic, searchQuery, undefined, undefined, false, 3, nextPage); 
    }
  };

  const handleUpdateNote = useCallback((articleId: string, note: string) => {
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, note } : a));
      setSavedArticles(prev => {
          const existingIndex = prev.findIndex(a => a.id === articleId);
          if (existingIndex !== -1) {
              const next = [...prev];
              next[existingIndex] = { ...next[existingIndex], note };
              return next;
          } else if (note.trim().length > 0) {
              const sourceArticle = articles.find(a => a.id === articleId);
              if (sourceArticle) return [{ ...sourceArticle, note }, ...prev];
          }
          return prev;
      });
  }, [articles]);

  const handleAddHighlight = useCallback((articleId: string, text: string) => {
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, highlights: [...(a.highlights || []), text] } : a));
      setSavedArticles(prev => {
          const existingIndex = prev.findIndex(a => a.id === articleId);
          if (existingIndex !== -1) {
              const next = [...prev];
              next[existingIndex] = { ...next[existingIndex], highlights: [...(next[existingIndex].highlights || []), text] };
              return next;
          }
          return prev;
      });
  }, []);

  const handleRemoveHighlight = useCallback((articleId: string, index: number) => {
    setArticles(prev => prev.map(a => {
        if (a.id === articleId && a.highlights) {
            const newH = [...a.highlights];
            newH.splice(index, 1);
            return { ...a, highlights: newH };
        }
        return a;
    }));
    setSavedArticles(prev => {
        const idx = prev.findIndex(a => a.id === articleId);
        if (idx !== -1 && prev[idx].highlights) {
            const next = [...prev];
            const newH = [...next[idx].highlights!];
            newH.splice(index, 1);
            next[idx] = { ...next[idx], highlights: newH };
            return next;
        }
        return prev;
    });
  }, []);

  const handleUpdateReadingStatus = useCallback((articleId: string, status: 'unread' | 'in_progress' | 'completed') => {
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, readingStatus: status } : a));
    setSavedArticles(prev => {
        const idx = prev.findIndex(a => a.id === articleId);
        if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], readingStatus: status };
            return next;
        }
        return prev;
    });
  }, []);

  const toggleSave = useCallback((article: Article) => {
    setSavedArticles(prev => {
        const isAlreadySaved = prev.some(a => a.id === article.id);
        if (isAlreadySaved) return prev.filter(a => a.id !== article.id);
        return [article, ...prev];
    });
  }, []);

  const navigateToTab = (tab: 'discover' | 'saved' | 'history') => {
      const fromIdx = TAB_ORDER.indexOf(activeTab as any);
      const toIdx = TAB_ORDER.indexOf(tab);
      setDirection(toIdx > fromIdx ? 1 : -1);
      setActiveTab(tab as any);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    if (activeImmersiveArticle || isSettingsOpen || isManualSearchOpen) {
        setTouchStart(null);
        return;
    }

    const touchEnd = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const distance = touchStart - touchEnd;
    const deltaY = Math.abs(touchEndY - touchStartY.current);
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const isEdgeSwipe = touchStart > screenWidth * 0.85;

    if (isEdgeSwipe && distance > 50 && distance > deltaY) {
      setIsSettingsOpen(true);
      if (navigator.vibrate) navigator.vibrate(15);
      setTouchStart(null);
      return;
    }

    if (!isEdgeSwipe && activeTab === 'discover') {
        const startY = touchStartY.current;
        const isSafeZone = startY > 120 && startY < (screenHeight - 100);

        if (isSafeZone && Math.abs(distance) > 60 && Math.abs(distance) > deltaY) {
            if (distance > 0) handleNextTopic();
            else handlePrevTopic();
        }
    }
    setTouchStart(null);
  };

  const handleAddTopic = () => {
      const val = newTopicInput.trim();
      if (val && !topics.includes(val)) {
          setTopics(prev => [...prev, val]);
          setNewTopicInput('');
          if (navigator.vibrate) navigator.vibrate(20);
      }
  };

  const handleMoveTopic = (index: number, direction: 'up' | 'down') => {
    const newTopics = [...topics];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTopics.length) return;
    [newTopics[index], newTopics[targetIndex]] = [newTopics[targetIndex], newTopics[index]];
    setTopics(newTopics);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const finalizeTopicDeletion = (topic: string) => {
    if (topics.length <= 1) return;
    setTopics(prev => prev.filter(t => t !== topic));
    setSidebarDeletePending(null);
    if (selectedTopic === topic) handleTopicClick(topics[0]);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleResetTopics = () => {
      setTopics(DEFAULT_TOPICS);
      setSelectedTopic(DEFAULT_TOPICS[0]);
      setSearchQuery('');
      setCurrentPage(1);
      // Fix: Explicitly pass empty query string
      fetchNews(DEFAULT_TOPICS[0], '');
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleClearHistory = () => {
      setHistory([]);
      localStorage.removeItem('ne_hist');
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleFactoryReset = async () => {
      localStorage.clear();
      await clearOfflineStorage();
      window.location.reload();
  };

  const setSearchChip = (term: string) => {
      setSearchQuery(term);
      handleManualSearch(term);
  };

  const handleVerifyGemini = async () => {
    if (!geminiApiKey.trim()) return;
    setGeminiStatus('checking');
    const isValid = await verifyGeminiKey(geminiApiKey);
    setGeminiStatus(isValid ? 'valid' : 'invalid');
    if (isValid && navigator.vibrate) navigator.vibrate([10, 30]);
  };

  const handleVerifyGroq = async () => {
    if (!groqApiKey.trim()) return;
    setGroqStatus('checking');
    const isValid = await verifyGroqKey(groqApiKey);
    setGroqStatus(isValid ? 'valid' : 'invalid');
    if (isValid && navigator.vibrate) navigator.vibrate([10, 30]);
  };

  const handleManualSynthesis = async () => {
      if (articles.length === 0) return;
      setIsSynthesizing(true);
      try {
          const aiSummary = await generateGeminiSummary(articles, selectedTopic, contentLanguage, geminiApiKey);
          setSummary(aiSummary);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSynthesizing(false);
      }
  };

  useEffect(() => {
      const load = async () => {
          const hasSeenIntro = localStorage.getItem('ne_intro_seen');
          if (!hasSeenIntro) {
              setIsInfoModalOpen(true);
              localStorage.setItem('ne_intro_seen', 'true');
          }

          const saved = localStorage.getItem('ne_saved'); const hist = localStorage.getItem('ne_hist'); const pref = localStorage.getItem('ne_pref');
          if (saved) setSavedArticles(JSON.parse(saved)); if (hist) setHistory(JSON.parse(hist));
          if (pref) { 
            const p = JSON.parse(pref); setIsDarkMode(p.isDarkMode || false); setUiLanguage(p.uiLanguage || 'es'); 
            setSearchMode(p.searchMode || 'standard'); setTextSize(p.textSize || 'base'); setAiProvider(p.aiProvider || 'gemini');
            setGeminiApiKey(p.geminiApiKey || '');
            if (p.geminiApiKey) setGeminiStatus('idle');
            setGroqApiKey(p.groqApiKey || '');
            if (p.groqApiKey) setGroqStatus('idle');
            setElsevierApiKey(p.elsevierApiKey || '');
            setCoreApiKey(p.coreApiKey || ''); setS2ApiKey(p.s2ApiKey || '');
            setAutoXray(p.autoXray !== undefined ? p.autoXray : true);
            setShowNewsFeed(p.showNewsFeed !== undefined ? p.showNewsFeed : true);
            setFontStyle(p.fontStyle || 'sans');
          }
          updateOfflineStatusMap();
          fetchNews('General');
      }; load();
  }, []);

  useEffect(() => { 
    localStorage.setItem('ne_saved', JSON.stringify(savedArticles)); 
    localStorage.setItem('ne_hist', JSON.stringify(history)); 
  }, [savedArticles, history]);

  useEffect(() => { 
    if (isDarkMode) document.documentElement.classList.add('dark'); 
    else document.documentElement.classList.remove('dark'); 
    localStorage.setItem('ne_pref', JSON.stringify({ 
      isDarkMode, uiLanguage, contentLanguage, searchMode, aiProvider, autoXray, textSize, 
      geminiApiKey, groqApiKey, elsevierApiKey, coreApiKey, s2ApiKey, showNewsFeed, fontStyle
    })); 
  }, [isDarkMode, uiLanguage, contentLanguage, searchMode, aiProvider, autoXray, textSize, geminiApiKey, groqApiKey, elsevierApiKey, coreApiKey, s2ApiKey, showNewsFeed, fontStyle]);

  return (
    <div 
      className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#020617] text-slate-100' : 'bg-[#f8fafc] text-slate-900'} font-sans overflow-hidden flex flex-col noise-bg`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .noise-bg {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${isDarkMode ? '0.015' : '0.03'}'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-11 bg-white/90 backdrop-blur-xl border-b border-slate-100 lg:hidden ${isDarkMode ? 'bg-slate-950/90 border-slate-800' : ''}`}>
           <button onClick={() => navigateToTab('discover')} className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-1 text-white shadow-lg"><KidneyIcon size={18} /></div>
                {!showNewsFeed && <span className={`font-black text-sm tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>NephroUpdate</span>}
           </button>
           {showNewsFeed ? (
             <div className="mx-2 flex-1 overflow-hidden min-w-0"><NewsTicker isDarkMode={isDarkMode} className="bg-transparent border-0 px-0 py-0" /></div>
           ) : (
             <div className="flex-1"></div>
           )}
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400"><Settings size={18} /></button>
      </div>

      <div className="flex h-screen overflow-hidden">
        <aside className={`hidden w-64 flex-col border-r z-30 transition-colors backdrop-blur-xl lg:flex ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/70 border-slate-200'}`}>
           <div className="p-6">
              <div className="mb-8 flex items-center gap-3">
                 <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg"><KidneyIcon size={28} /></div>
                 <h1 className="text-xl font-black">NephroUpdate</h1>
              </div>
              <nav className="space-y-1">
                  {[{ id: 'discover', icon: Radar, label: t.discover }, { id: 'saved', icon: Bookmark, label: t.library }, { id: 'history', icon: History, label: t.history }].map(item => (
                      <button key={item.id} onClick={() => navigateToTab(item.id as any)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'opacity-60 hover:opacity-100'}`}>
                          <item.icon size={18}/> <span>{item.label}</span>
                      </button>
                  ))}
              </nav>
           </div>
        </aside>

        <main className="relative flex h-full flex-1 flex-col overflow-hidden">
          <header className={`hidden h-16 items-center justify-between gap-4 border-b px-8 z-20 lg:flex ${isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white/70 border-slate-200'} backdrop-blur-sm`}>
             <motion.div 
                layout 
                className={`group relative max-w-2xl flex-1 transition-all ${isSearchFocused ? 'shadow-lg rounded-2xl' : ''}`}
             >
                 <Search className="absolute left-4 top-2.5 text-slate-400 pointer-events-none" size={18} />
                 <input 
                    type="text" 
                    value={searchQuery} 
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    onChange={e => setSearchQuery(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleManualSearch(searchQuery)} 
                    placeholder={t.searchPlaceholder} 
                    className={`w-full rounded-2xl border outline-none pl-11 pr-10 py-2.5 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:bg-slate-800' : 'bg-slate-50 border-slate-200 focus:bg-white'}`} 
                 />
                 
                 <AnimatePresence>
                     {isSearchFocused && (
                         <motion.div 
                             initial={{ opacity: 0, y: -10 }} 
                             animate={{ opacity: 1, y: 0 }} 
                             exit={{ opacity: 0, y: -10 }} 
                             className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-2xl shadow-xl border z-50 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                         >
                             <div className="space-y-3">
                                 <div>
                                     <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Time</span>
                                     <div className="flex gap-2 mt-1">
                                         {['Last 6 months', '2025-2026', 'Last 5 years'].map(chip => (
                                             <button key={chip} onMouseDown={() => setSearchChip(chip)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>{chip}</button>
                                         ))}
                                     </div>
                                 </div>
                                 <div>
                                     <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Evidence Type</span>
                                     <div className="flex gap-2 mt-1">
                                         {['RCT', 'Guideline', 'Meta-Analysis', 'Review'].map(chip => (
                                             <button key={chip} onMouseDown={() => setSearchChip(chip)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>{chip}</button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         </motion.div>
                     )}
                 </AnimatePresence>

             </motion.div>
             <div className="flex items-center gap-3">
               <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl border dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"><Settings size={20}/></button>
               <button onClick={() => fetchNews()} disabled={loading} className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
             </div>
          </header>

          <div 
            ref={scrollContainerRef} 
            className={`flex-1 overflow-y-auto px-4 transition-all duration-300 ${activeTab === 'discover' ? 'pb-32 pt-0' : 'pb-32 pt-20'} lg:p-8 lg:pb-8 lg:pt-8`}
            style={{ touchAction: 'pan-y' }}
          >
             <AnimatePresence initial={false} custom={direction} mode="popLayout">
             {activeTab === 'discover' && (
                <motion.div key="discover" initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }} className="mx-auto max-w-6xl min-h-full w-full">
                    {/* Explicit Spacer for Mobile Header */}
                    <div className="h-11 w-full lg:hidden" />

                    <div className="sticky top-11 z-40 -mx-4 border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl lg:top-0 lg:mx-0 lg:rounded-full lg:mb-8 lg:border-slate-200/40">
                        <div ref={topicContainerRef} className="no-scrollbar flex items-center gap-0 overflow-x-auto px-4 py-2">
                           {topics.map(topic => (
                              <div key={topic} className="relative group shrink-0">
                                  <button 
                                    ref={el => { topicRefs.current[topic] = el; }} 
                                    onClick={() => handleTopicClick(topic)} 
                                    className={`px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all ${selectedTopic === topic ? 'bg-blue-600 text-white rounded-full shadow-sm' : 'text-slate-500'}`}
                                  >
                                    {topic}
                                  </button>
                                  {!DEFAULT_TOPICS.includes(topic) && selectedTopic === topic && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleCloseTopic(topic); }}
                                        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white shadow-md hover:scale-110 transition-transform"
                                      >
                                          <X size={8} />
                                      </button>
                                  )}
                              </div>
                           ))}
                        </div>
                    </div>
                    
                    <div className="space-y-6 pt-6">
                       {translationNotice && (
                           <motion.div 
                               initial={{ opacity: 0, y: -20 }}
                               animate={{ opacity: 1, y: 0 }}
                               className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}
                           >
                               <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                   <div className="flex items-center gap-2">
                                     <Globe size={14} className="text-indigo-500 shrink-0" />
                                     <span>{t.searchingFor} <strong>"{translationNotice.translated}"</strong></span>
                                   </div>
                                   <span className="opacity-60 text-[10px] sm:text-xs ml-6 sm:ml-0">({t.translatedFrom} "{translationNotice.original}")</span>
                               </div>
                               <button 
                                   onClick={handleUndoTranslation}
                                   className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-indigo-100' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'}`}
                               >
                                   {t.undo}
                               </button>
                           </motion.div>
                       )}

                       {loading && searchMode === 'ai' && (
                           <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-[shimmer_2s_infinite] rounded-full opacity-50 mb-4"></div>
                       )}

                       {summary ? (
                            <div className="rounded-[2rem] border p-7 bg-blue-50/20 dark:bg-slate-900/40 border-blue-100 dark:border-slate-800 font-serif text-lg leading-relaxed animate-in fade-in">
                                {summary}
                            </div>
                        ) : (
                            articles.length > 0 && !loading && (
                                <div className="mb-6 flex justify-center">
                                    <button 
                                        onClick={handleManualSynthesis} 
                                        disabled={isSynthesizing}
                                        className={`group relative flex items-center gap-3 pl-4 pr-6 py-3 rounded-2xl border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'bg-slate-900 border-indigo-500/30 text-indigo-300' : 'bg-white border-indigo-100 text-indigo-600'}`}
                                    >
                                        {isSynthesizing ? (
                                            <Loader2 size={20} className="animate-spin text-indigo-500" />
                                        ) : (
                                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                                                <Sparkles size={18} />
                                            </div>
                                        )}
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                                {isSynthesizing ? 'Analizando...' : 'Generar Reporte'}
                                            </span>
                                            <span className="text-sm font-bold">
                                                {isSynthesizing ? 'Sintetizando Evidencia...' : '¿Cuáles son los desarrollos científicos?'}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            )
                        )}
                       
                       <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 ${loading && searchMode === 'ai' ? 'opacity-70 grayscale transition-all' : ''}`}>
                          {loading && articles.length === 0 ? Array(6).fill(0).map((_, i) => <ArticleSkeleton key={i} isDarkMode={isDarkMode} />) : filteredArticles.slice(0, visibleCount).map(article => (
                             <ArticleCard 
                                key={article.id} 
                                article={article} 
                                isSaved={savedArticles.some(a => a.id === article.id)} 
                                onToggleSave={toggleSave} 
                                isDarkMode={isDarkMode} 
                                onOpenImmersive={setActiveImmersiveArticle} 
                                onUpdateNote={handleUpdateNote} 
                                onReadFullText={handleFetchFullText} 
                                isDownloaded={!!offlineStatus[article.id]} 
                                textSize={textSize} 
                                groqApiKey={groqApiKey}
                                geminiApiKey={geminiApiKey}
                                language={contentLanguage}
                                defaultXrayMode={autoXray}
                                onAddHighlight={handleAddHighlight}
                                fontStyle={fontStyle}
                             />
                          ))}
                       </div>
                       
                       <div className="flex flex-col items-center justify-center gap-4 py-12">
                           <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />
                           <button 
                               onClick={handleLoadMore} 
                               className="group relative flex items-center gap-3 pl-2 pr-6 py-2 rounded-full border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xl transition-all hover:scale-105 active:scale-95"
                           >
                               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:rotate-90 transition-transform">
                                   <Plus size={20} strokeWidth={3} />
                               </div>
                               <div className="flex flex-col items-start">
                                   <span className="text-xs font-black uppercase tracking-widest opacity-60">
                                       {t.discover}
                                   </span>
                                   <span className="text-sm font-bold flex items-center gap-2">
                                       {visibleCount < filteredArticles.length 
                                            ? `Cargar Más Localmente (${filteredArticles.length - visibleCount})` 
                                            : `Buscar más en Servidores (Página ${currentPage + 1})`
                                       }
                                       {visibleCount >= filteredArticles.length && <Server size={14} />}
                                   </span>
                               </div>
                           </button>
                       </div>
                    </div>
                </motion.div>
             )}
             
             {activeTab === 'saved' && (
                 <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl px-4">
                    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                        <div className="space-y-2">
                           <h2 className="text-3xl font-black">{t.libraryTitle}</h2>
                           <p className="text-xs font-bold uppercase tracking-widest opacity-40">{filteredSavedArticles.length} Artículos guardados</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-colors ${
                                    (filterDesign.length > 0 || filterTier < 4 || libraryTopicFilter !== 'All') 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'text-slate-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                            >
                                <Filter size={16} />
                            </button>
                            <input type="text" value={libraryFilter} onChange={e => setLibraryFilter(e.target.value)} placeholder="Filtrar..." className={`w-full md:w-72 rounded-2xl border text-sm outline-none px-4 py-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`} />
                        </div>
                    </div>
                    
                    <AnimatePresence>
                           {isFilterOpen && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xl mb-8"
                                >
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">Study Design</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {['RCT', 'Meta-Analysis', 'Guideline', 'Cohort', 'Case Report'].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => toggleFilterDesign(d as StudyDesign)}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                                            filterDesign.includes(d as StudyDesign)
                                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                                : 'border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {d}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">Journal Impact</h4>
                                            <div className="flex flex-wrap gap-2">
                                                 <button onClick={() => setFilterTier(4)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${filterTier === 4 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'border-slate-200 dark:border-slate-700'}`}>All</button>
                                                 <button onClick={() => setFilterTier(2)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${filterTier === 2 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'border-slate-200 dark:border-slate-700'}`}>High Impact</button>
                                                 <button onClick={() => setFilterTier(1)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${filterTier === 1 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'border-slate-200 dark:border-slate-700'}`}>Top Tier</button>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">Topic / Nicho</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {availableLibraryTopics.map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setLibraryTopicFilter(t)}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                                            libraryTopicFilter === t
                                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                                : 'border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                           )}
                       </AnimatePresence>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {filteredSavedArticles.map(article => (
                            <ArticleCard key={article.id} article={article} isSaved={true} onToggleSave={toggleSave} isDarkMode={isDarkMode} onOpenImmersive={setActiveImmersiveArticle} onUpdateNote={handleUpdateNote} onReadFullText={handleFetchFullText} isCompact={true} isDownloaded={!!offlineStatus[article.id]} textSize={textSize} groqApiKey={groqApiKey} geminiApiKey={geminiApiKey} language={contentLanguage} defaultXrayMode={autoXray} onAddHighlight={handleAddHighlight} fontStyle={fontStyle} />
                        ))}
                    </div>
                 </motion.div>
             )}

             {activeTab === 'history' && (
                 <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-6 px-4">
                    <h2 className="text-3xl font-black">{t.historyTitle}</h2>
                    
                    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                         {availableHistoryTopics.map(t => (
                             <button 
                                key={t} 
                                onClick={() => setHistoryTopicFilter(t)} 
                                className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${historyTopicFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500'}`}
                             >
                                 {t}
                             </button>
                         ))}
                    </div>

                    <HistoryAnalytics history={filteredHistory} isDarkMode={isDarkMode} />
                    
                    <div className="relative border-l-2 border-dashed border-slate-200 dark:border-slate-800 ml-4 space-y-8 pl-8 py-4">
                        {filteredHistory.map((snapshot, idx) => (
                            <div key={snapshot.id} className="relative group">
                                <div className={`absolute -left-[39px] top-6 w-5 h-5 rounded-full border-4 transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-700 group-hover:border-blue-500' : 'bg-white border-slate-300 group-hover:border-blue-500'}`}></div>
                                
                                <div onClick={() => setViewingHistorySnapshot(snapshot)} className={`cursor-pointer rounded-3xl border p-5 transition-all relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-lg'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-lg">{snapshot.topic}</h4>
                                        <ArrowRight size={18} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(snapshot.timestamp).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(snapshot.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    {snapshot.query && snapshot.query !== snapshot.topic && (
                                        <div className={`text-xs p-2 rounded-lg font-mono mb-2 ${isDarkMode ? 'bg-black/20 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                                            {'>'} {snapshot.query}
                                        </div>
                                    )}
                                    <div className="flex -space-x-2 overflow-hidden py-1">
                                        {snapshot.articles.slice(0, 5).map((a, i) => (
                                            <div key={i} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${isDarkMode ? 'border-slate-900 bg-slate-800' : 'border-white bg-slate-100'}`} title={a.title}>
                                                {a.source.charAt(0)}
                                            </div>
                                        ))}
                                        {snapshot.articles.length > 5 && (
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${isDarkMode ? 'border-slate-900 bg-slate-800' : 'border-white bg-slate-100'}`}>
                                                +{snapshot.articles.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </motion.div>
             )}
             </AnimatePresence>
          </div>
        </main>
      </div>

       <div className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 lg:hidden transition-opacity duration-500 w-[92%] max-w-[360px] ${isManualSearchOpen ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 translate-y-0'}`}>
          <div className={`relative flex items-center justify-between p-1.5 rounded-[2.5rem] border shadow-2xl backdrop-blur-3xl saturate-[1.5] ${isDarkMode ? 'bg-slate-950/80 border-white/10 shadow-black/50' : 'bg-white/80 border-white/50 shadow-blue-200/40 ring-1 ring-white/40'}`}>
              
              <LayoutGroup>
                  <div className="flex flex-1 justify-around items-center px-1">
                      {[
                        { id: 'history', icon: History, action: () => navigateToTab('history') },
                        { id: 'discover', icon: Radar, action: () => handleTopicClick(selectedTopic), onHold: () => fetchNews(selectedTopic, '', undefined, undefined, true, 20) },
                        { id: 'saved', icon: Bookmark, action: () => navigateToTab('saved') }
                      ].map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button 
                                key={item.id} 
                                onPointerDown={() => {
                                    if(item.onHold) startLongPress(item.onHold);
                                    if(navigator.vibrate) navigator.vibrate(10);
                                }}
                                onPointerUp={cancelLongPress}
                                onPointerLeave={cancelLongPress}
                                onClick={item.action} 
                                className={`relative rounded-full p-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 ${isActive ? 'text-white' : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                            >
                                {isActive && (
                                    <motion.div 
                                        layoutId="dock-active" 
                                        className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30" 
                                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} 
                                    />
                                )}
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                                {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />}
                            </button>
                        );
                      })}
                  </div>

                  <div className={`w-px h-8 mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                  <div className="flex items-center gap-1 pr-1">
                      <button 
                        onPointerDown={() => {
                            startLongPress(() => setIsManualSearchOpen(true));
                            if(navigator.vibrate) navigator.vibrate(10);
                        }}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onClick={() => { setIsManualSearchOpen(true); setSearchModalTab('text'); }} 
                        className={`p-3.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        <Search size={22} strokeWidth={2.5} />
                      </button>

                      <button 
                        onClick={() => {
                            setVoiceModalOpen(true);
                            if(navigator.vibrate) navigator.vibrate(10);
                        }} 
                        className={`relative p-3.5 rounded-full transition-all active:scale-90 overflow-hidden group ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}
                      >
                         <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <span className="absolute inset-0 rounded-full border border-indigo-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                         <Mic size={22} strokeWidth={2.5} className="relative z-10" />
                      </button>
                  </div>
              </LayoutGroup>

          </div>
       </div>

       {/* Liquid Crystal Scroll To Top Button */}
       <AnimatePresence>
        {showScrollTop && !isUserScrolling && (
            <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={scrollToTop}
                className={`fixed z-[55] p-3 rounded-full border shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-[12px] transition-all hover:scale-110 active:scale-95 ${
                    isDarkMode 
                    ? 'bg-slate-800/30 border-white/10 text-blue-400' 
                    : 'bg-white/30 border-white/40 text-blue-600'
                } bottom-24 right-4 lg:bottom-10 lg:right-10`}
            >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
                <ArrowUp size={24} strokeWidth={2.5} className="relative z-10" />
            </motion.button>
        )}
       </AnimatePresence>

       <AnimatePresence>
         {isManualSearchOpen && (
           <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} className={`fixed inset-x-0 bottom-0 z-[70] p-6 rounded-t-[3rem] shadow-2xl border-t ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
             
             <div className="flex items-center justify-between mb-6">
                 <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                     <button onClick={() => setSearchModalTab('text')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${searchModalTab === 'text' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-50'}`}>Texto Libre</button>
                     <button onClick={() => setSearchModalTab('pico')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${searchModalTab === 'pico' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-50'}`}>Estructurada PICO</button>
                 </div>
                 <button onClick={() => setIsManualSearchOpen(false)} className="p-2 opacity-50"><X size={20}/></button>
             </div>

             {searchModalTab === 'text' ? (
                 <>
                    <div className="mb-4 flex items-center gap-4"><Search size={24} className="text-blue-500" /><input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualSearch(searchQuery)} placeholder={t.searchPlaceholder} className="w-full bg-transparent text-lg font-bold outline-none" /></div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                        {['Last 6 months', '2025-2026', 'RCT', 'Guideline', 'Meta-Analysis'].map(chip => (
                            <button key={chip} onMouseDown={() => setSearchChip(chip)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>{chip}</button>
                        ))}
                    </div>

                    <button onClick={() => handleManualSearch(searchQuery)} className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl transition-transform active:scale-[0.98]">BUSCAR EVIDENCIA</button>
                 </>
             ) : (
                 <div className="space-y-4">
                      <div className="space-y-3">
                          {[
                            { id: 'p', label: t.pLabel, ph: t.pPlaceholder },
                            { id: 'i', label: t.iLabel, ph: t.iPlaceholder },
                            { id: 'c', label: t.cLabel, ph: t.cPlaceholder },
                            { id: 'o', label: t.oLabel, ph: t.oPlaceholder }
                          ].map(f => (
                              <div key={f.id}>
                                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5 ml-1">{f.label}</label>
                                  <input type="text" value={(picoData as any)[f.id]} onChange={e => setPicoData({...picoData, [f.id]: e.target.value})} placeholder={f.ph} className={`w-full p-3.5 rounded-2xl border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-50 border-slate-200'}`} />
                              </div>
                          ))}
                      </div>
                      <button onClick={handlePicoSearch} className="w-full mt-4 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all">{t.searchPico}</button>
                 </div>
             )}
           </motion.div>
         )}
       </AnimatePresence>

       <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className={`fixed inset-y-0 right-0 z-[110] w-full max-w-sm flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 border-l border-white/5' : 'bg-white'}`}>
              <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 sticky top-0 z-10 border-b dark:border-white/5">
                <h2 className="text-xl font-black">Configuración</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
                
                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <BrainCircuit size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">MODOS DE BÚSQUEDA</span>
                   </div>
                   <div className="space-y-3">
                      <button onClick={() => setSearchMode('standard')} className={`w-full p-4 rounded-2xl border text-left transition-all ${searchMode === 'standard' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10'}`}>
                         <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm uppercase tracking-tight">Estándar</span>
                            {searchMode === 'standard' && <Check size={16} />}
                         </div>
                         <p className={`text-[10px] leading-relaxed ${searchMode === 'standard' ? 'text-blue-100' : 'opacity-60 italic'}`}>Barrida técnica en 9 bases de datos (incl. LILACS).</p>
                      </button>
                      <button onClick={() => setSearchMode('ai')} className={`w-full p-4 rounded-2xl border text-left transition-all ${searchMode === 'ai' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10'}`}>
                         <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm uppercase tracking-tight">IA (Gemini)</span>
                            {searchMode === 'ai' && <Check size={16} />}
                         </div>
                         <p className={`text-[10px] leading-relaxed ${searchMode === 'ai' ? 'text-blue-100' : 'opacity-60 italic'}`}>Analiza resultados y genera síntesis ejecutiva.</p>
                      </button>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Key size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">CONECTIVIDAD Y SEGURIDAD</span>
                   </div>
                   <div className="space-y-6">
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                           <span className="text-[11px] font-black uppercase tracking-tight">Gemini API Key (Google)</span>
                           {geminiStatus === 'valid' && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase flex items-center gap-1"><Check size={10}/> Verificada</span>}
                           {geminiStatus === 'invalid' && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase flex items-center gap-1"><X size={10}/> Inválida</span>}
                        </div>
                        <p className="text-[9px] leading-relaxed opacity-60 italic">Necesaria para búsqueda IA, Voice Mode y Resúmenes.</p>
                        <div className="relative">
                            <input 
                              type="password" 
                              value={geminiApiKey} 
                              onChange={e => { setGeminiApiKey(e.target.value); setGeminiStatus('idle'); }} 
                              placeholder="AIzaSy..." 
                              className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-[11px] font-mono outline-none dark:border-white/10 pr-20"
                            />
                            <button 
                                onClick={handleVerifyGemini}
                                disabled={!geminiApiKey || geminiStatus === 'checking'}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[10px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                                {geminiStatus === 'checking' ? <Loader2 size={10} className="animate-spin"/> : 'Verificar'}
                            </button>
                        </div>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-500 group hover:bg-blue-500/10 transition-colors">
                           <span className="text-[10px] font-black uppercase tracking-widest">Obtener en Google AI Studio</span>
                           <ExternalLink size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </a>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                        <div className="flex items-center justify-between">
                           <span className="text-[11px] font-black uppercase tracking-tight">Groq Key (Llama 3)</span>
                           {groqStatus === 'valid' && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase flex items-center gap-1"><Check size={10}/> Verificada</span>}
                           {groqStatus === 'invalid' && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase flex items-center gap-1"><X size={10}/> Inválida</span>}
                        </div>
                        <p className="text-[9px] leading-relaxed opacity-60 italic">NLP de baja latencia para re-escritura de abstracts y lenguaje clínico directo.</p>
                        <div className="relative">
                            <input 
                              type="password" 
                              value={groqApiKey} 
                              onChange={e => { setGroqApiKey(e.target.value); setGroqStatus('idle'); }} 
                              placeholder="gsk_..." 
                              className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-[11px] font-mono outline-none dark:border-white/10 pr-20"
                            />
                            <button 
                                onClick={handleVerifyGroq}
                                disabled={!groqApiKey || groqStatus === 'checking'}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[10px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                                {groqStatus === 'checking' ? <Loader2 size={10} className="animate-spin"/> : 'Verificar'}
                            </button>
                        </div>
                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-500/5 border border-slate-500/20 text-slate-500 group">
                           <span className="text-[10px] font-black uppercase tracking-widest">Obtener en Groq Console</span>
                           <ExternalLink size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </a>
                      </div>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">IA DE RESUMEN PREFERIDA</span>
                   </div>
                   <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                      <button onClick={() => setAiProvider('gemini')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${aiProvider === 'gemini' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Gemini</button>
                      <button onClick={() => setAiProvider('groq')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${aiProvider === 'groq' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Groq (Llama 3)</button>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Filter size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">FILTROS DE EVIDENCIA (Reactive)</span>
                   </div>
                   
                   <div className="space-y-5">
                       <div>
                           <h4 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Diseño del Estudio (Smart Inject)</h4>
                           <div className="flex flex-wrap gap-2">
                               {['RCT', 'Meta-Analysis', 'Guideline', 'Cohort', 'Case Report'].map((d) => (
                                   <button
                                       key={d}
                                       onClick={() => toggleFilterDesign(d as StudyDesign)}
                                       className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                           filterDesign.includes(d as StudyDesign)
                                               ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                               : (isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                       }`}
                                   >
                                       {d}
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div>
                           <h4 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Impacto de Revista</h4>
                           <div className="space-y-2">
                               {[
                                   { val: 4, label: 'Todas las Revistas' },
                                   { val: 2, label: 'Alto Impacto (Tier 1 & 2)' },
                                   { val: 1, label: 'Top Tier (NEJM, Lancet...)' }
                               ].map((opt) => (
                                   <button 
                                       key={opt.val}
                                       onClick={() => setFilterTier(opt.val)} 
                                       className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-bold ${
                                           filterTier === opt.val 
                                               ? 'bg-blue-500/10 border-blue-500 text-blue-500' 
                                               : (isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')
                                       }`}
                                   >
                                       <span>{opt.label}</span>
                                       {filterTier === opt.val && <Check size={14} />}
                                   </button>
                               ))}
                           </div>
                       </div>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">GESTIÓN DE TÓPICOS</span>
                      </div>
                      <button onClick={handleResetTopics} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600"><RotateCcw size={10} /> Reset</button>
                   </div>
                   <div className="mb-4 flex gap-2">
                      <input type="text" value={newTopicInput} onChange={e => setNewTopicInput(e.target.value)} placeholder="Añadir nicho (ej. IgA)..." className="flex-1 p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs font-bold outline-none dark:border-white/10 shadow-sm" onKeyDown={e => e.key === 'Enter' && handleAddTopic()} />
                      <button onClick={handleAddTopic} className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg active:scale-95"><Plus size={16} /></button>
                   </div>
                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                        {topics.map((topic, idx) => (
                            <div key={topic} className="group flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border dark:border-white/5 shadow-sm">
                                <span className="text-[11px] font-bold truncate max-w-[120px]">{topic}</span>
                                
                                <div className="flex items-center gap-1">
                                    {sidebarDeletePending === topic ? (
                                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                                        <button onClick={() => finalizeTopicDeletion(topic)} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><Check size={14} strokeWidth={3} /></button>
                                        <button onClick={() => setSidebarDeletePending(null)} className="p-1.5 bg-slate-500/10 text-slate-400 rounded-lg"><X size={14} strokeWidth={3} /></button>
                                    </div>
                                    ) : (
                                    <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleMoveTopic(idx, 'up')} disabled={idx === 0} className={`p-1 rounded-md ${idx === 0 ? 'opacity-20' : 'text-blue-500 hover:bg-blue-500/10'}`}><ChevronUp size={16} /></button>
                                        <button onClick={() => handleMoveTopic(idx, 'down')} disabled={idx === topics.length - 1} className={`p-1 rounded-md ${idx === topics.length - 1 ? 'opacity-20' : 'text-blue-500 hover:bg-blue-500/10'}`}><ChevronDown size={16} /></button>
                                        <button onClick={() => setSidebarDeletePending(topic)} className="p-1 text-red-500 hover:bg-red-500/10 rounded-md ml-1"><Trash2 size={16} /></button>
                                    </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Palette size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">APARIENCIA</span>
                   </div>
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold">{isDarkMode ? 'Oscuro' : 'Claro'}</span>
                      <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 w-32">
                          <button onClick={() => setIsDarkMode(false)} className={`flex-1 py-1.5 rounded-lg flex justify-center items-center transition-all ${!isDarkMode ? 'bg-white text-blue-600 shadow-sm' : 'opacity-40'}`}><Sun size={14}/></button>
                          <button onClick={() => setIsDarkMode(true)} className={`flex-1 py-1.5 rounded-lg flex justify-center items-center transition-all ${isDarkMode ? 'bg-slate-700 text-white' : 'opacity-40'}`}><Moon size={14}/></button>
                      </div>
                   </div>

                   <div className="mb-4 pt-4 border-t border-dashed dark:border-white/5 border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                             <Type size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                             <span className="text-xs font-bold">Estilo de Fuente (Titles & Abstracts)</span>
                        </div>
                        <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                            <button onClick={() => setFontStyle('sans')} className={`flex-1 py-2 text-[10px] font-sans font-bold rounded-lg transition-all ${fontStyle === 'sans' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Standard (Inter)</button>
                            <button onClick={() => setFontStyle('serif')} className={`flex-1 py-2 text-[10px] font-serif font-bold rounded-lg transition-all ${fontStyle === 'serif' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Editorial (Merriweather)</button>
                            <button onClick={() => setFontStyle('modern')} className={`flex-1 py-2 text-[10px] font-modern font-bold rounded-lg transition-all ${fontStyle === 'modern' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Modern (Outfit)</button>
                        </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-4 border-t border-dashed dark:border-white/5 border-slate-100">
                      <div className="flex items-center gap-2">
                          <Newspaper size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                          <span className="text-xs font-bold">News Ticker (Noticias)</span>
                      </div>
                      <button onClick={() => setShowNewsFeed(!showNewsFeed)} className={`w-10 h-5 rounded-full transition-colors relative ${showNewsFeed ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showNewsFeed ? 'left-6' : 'left-1'}`} />
                      </button>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Type size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">TAMAÑO DE TEXTO</span>
                   </div>
                   <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                      {[
                        { id: 'sm', label: 'A' },
                        { id: 'base', label: 'AA' },
                        { id: 'lg', label: 'AAA' },
                        { id: 'xl', label: 'AAAA' }
                      ].map(size => (
                        <button 
                          key={size.id} 
                          onClick={() => setTextSize(size.id as TextSize)} 
                          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${textSize === size.id ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                        >
                          {size.label}
                        </button>
                      ))}
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Languages size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">IDIOMAS</span>
                   </div>
                   <div className="space-y-4">
                      <div>
                         <label className="block text-[10px] font-bold uppercase opacity-40 mb-2">Aplicación (Interfaz)</label>
                         <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                            <button onClick={() => setUiLanguage('es')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${uiLanguage === 'es' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Español</button>
                            <button onClick={() => setUiLanguage('en')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${uiLanguage === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>English</button>
                         </div>
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold uppercase opacity-40 mb-2">Contenido (IA)</label>
                         <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                            <button onClick={() => setContentLanguage('es')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${contentLanguage === 'es' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Español</button>
                            <button onClick={() => setContentLanguage('original')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${contentLanguage === 'original' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Original</button>
                         </div>
                      </div>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScanEye size={16} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">AUTO RESALTADO</span>
                      </div>
                      <button onClick={() => setAutoXray(!autoXray)} className={`w-10 h-5 rounded-full transition-colors relative ${autoXray ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoXray ? 'left-6' : 'left-1'}`} />
                      </button>
                   </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4 text-red-500">
                      <Trash2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">DATOS Y MANTENIMIENTO</span>
                   </div>
                   <div className="space-y-3">
                        {deleteConfirmTarget === 'history' ? (
                            <div className="flex gap-2 animate-in zoom-in-95">
                                <button onClick={() => { handleClearHistory(); setDeleteConfirmTarget(null); }} className="flex-1 p-4 rounded-2xl bg-red-600 text-white font-black text-sm">CONFIRMAR BORRADO</button>
                                <button onClick={() => setDeleteConfirmTarget(null)} className="p-4 rounded-2xl bg-slate-200 dark:bg-slate-800 font-bold text-sm">X</button>
                            </div>
                        ) : (
                            <button onClick={() => setDeleteConfirmTarget('history')} className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold text-sm hover:bg-red-500/20">
                                <span>Limpiar Historial</span>
                                <RotateCcw size={16} />
                            </button>
                        )}

                        {deleteConfirmTarget === 'factory' ? (
                            <div className="p-4 rounded-2xl border-2 border-red-600 space-y-3 animate-in shake-1">
                                <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-tighter">¿ESTÁS SEGURO? SE PERDERÁ TODO</p>
                                <div className="flex gap-2">
                                    <button onClick={handleFactoryReset} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase">SÍ, RESET TOTAL</button>
                                    <button onClick={() => setDeleteConfirmTarget(null)} className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-black text-xs">NO</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setDeleteConfirmTarget('factory')} className="w-full flex items-center justify-between p-4 rounded-2xl border border-red-500 text-red-500 font-black text-xs uppercase tracking-tighter hover:bg-red-500 hover:text-white">
                                <span>Reset Total (Fábrica)</span>
                                <AlertCircle size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-4">
                      <Info size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">INFORMACIÓN & AYUDA</span>
                   </div>
                   <div className="space-y-3">
                       <div className={`flex items-center justify-between p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                           <span className="text-xs font-bold opacity-70">Versión Actual</span>
                           <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-blue-500/10 text-blue-500">v1.0 Alpha</span>
                       </div>
                       <button onClick={() => setIsInfoModalOpen(true)} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                           <Info size={14} />
                           VER INFORMACIÓN COMPLETA
                       </button>
                   </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInfoModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                onClick={() => setIsInfoModalOpen(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.9, y: 20 }} 
                    onClick={e => e.stopPropagation()}
                    className={`w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                >
                    <div className={`p-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-600 p-2 text-white shadow-lg"><KidneyIcon size={20} /></div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight">NephroUpdate</h2>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">v1.0 Alpha</span>
                            </div>
                        </div>
                        <button onClick={() => setIsInfoModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">Navegación & Dock</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="p-2 rounded-full bg-blue-600/10 text-blue-500"><Radar size={14} /></div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase">Descubrir</h4>
                                        <p className="text-[10px] opacity-60 leading-tight mt-1">Feed principal de artículos por tópico.</p>
                                    </div>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="p-2 rounded-full bg-blue-600/10 text-blue-500"><History size={14} /></div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase">Historial</h4>
                                        <p className="text-[10px] opacity-60 leading-tight mt-1">Línea de tiempo de búsquedas anteriores.</p>
                                    </div>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="p-2 rounded-full bg-blue-600/10 text-blue-500"><Bookmark size={14} /></div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase">Biblioteca</h4>
                                        <p className="text-[10px] opacity-60 leading-tight mt-1">Artículos guardados y lectura offline.</p>
                                    </div>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Mic size={14} /></div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase">Voz (IA)</h4>
                                        <p className="text-[10px] opacity-60 leading-tight mt-1">Asistente Gemini Live para comandos verbales.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">Herramientas de Estudio</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: Bookmark, label: 'Guardar / Offline', desc: 'Descarga para leer sin internet.' },
                                    { icon: StickyNote, label: 'Notas Personales', desc: 'Añade observaciones clínicas.' },
                                    { icon: Quote, label: 'Citar (APA)', desc: 'Copia la referencia bibliográfica.' },
                                    { icon: Zap, label: 'IA Enhance (Groq)', desc: 'Reescribe el abstract con lenguaje claro.' },
                                    { icon: ImageIcon, label: 'Visual Abstract', desc: 'Genera diagrama de flujo (Mermaid).' },
                                    { icon: Sparkles, label: 'Relacionados', desc: 'Busca estudios similares con IA.' },
                                    { icon: Share2, label: 'Compartir', desc: 'Envía enlace nativo o copia URL.' },
                                    { icon: Workflow, label: 'Full Text Flow', desc: 'Intenta acceder al texto completo.' },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                        <item.icon size={14} className="text-blue-500 shrink-0" />
                                        <div>
                                            <span className={`text-[10px] font-bold block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                                            <span className="text-[8px] opacity-50 block leading-tight">{item.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">Glosario de Estado</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: Flame, color: 'text-orange-500', label: 'Alto Impacto / Tendencia' },
                                    { icon: Unlock, color: 'text-emerald-500', label: 'Acceso Abierto (Gratis)' },
                                    { icon: WifiOff, color: 'text-emerald-500', label: 'Disponible Offline' },
                                    { icon: Activity, color: 'text-blue-500', label: 'Cápsula Clínica' },
                                    { icon: FlaskConical, color: 'text-blue-400', label: 'Ensayo Clínico' },
                                    { icon: Scale, color: 'text-emerald-400', label: 'Guía Clínica' },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                        <item.icon size={14} className={item.color} />
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-blue-900/10 border-blue-800/30' : 'bg-blue-50 border-blue-100'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <BrainCircuit size={16} className="text-blue-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Motor de Búsqueda Inteligente</h3>
                            </div>
                            <div className="space-y-3 text-[11px] leading-relaxed opacity-80">
                                <p>NephroUpdate utiliza un motor híbrido que combina la precisión de bases de datos médicas con la flexibilidad de la IA Generativa.</p>
                                <ul className="space-y-2 list-disc list-inside">
                                    <li><strong>Traducción Neural:</strong> Puedes escribir en español (ej. "Nefropatía IgA"). El sistema lo traduce internamente a términos MeSH en inglés ("IgA Glomerulonephritis") para maximizar resultados en PubMed y OpenAlex.</li>
                                    <li><strong>Modo PICO:</strong> Utiliza la búsqueda estructurada (Paciente, Intervención, Comparación, Outcome) para generar queries booleanas complejas automáticamente.</li>
                                    <li><strong>Grounding:</strong> Las búsquedas se verifican contra Google Search para incluir noticias de última hora que aún no están indexadas en PubMed.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Sobre la Aplicación</h3>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                NephroUpdate es una herramienta de descubrimiento de investigación médica de alto nivel diseñada para nefrólogos. Utiliza inteligencia artificial para rastrear, filtrar y sintetizar la evidencia más reciente de múltiples bases de datos biomédicas.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Dirección Médica & Desarrollo</h3>
                            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-blue-100'}`}>
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>DP</div>
                                <div>
                                    <h4 className="font-bold text-sm">Dr. Adalberto Peña Wilches</h4>
                                    <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider mb-1">Nefrólogo / Developer</p>
                                    <a href="mailto:adalberto.pw@gmail.com" className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:underline">
                                        <Mail size={12} /> adalberto.pw@gmail.com
                                    </a>
                                </div>
                            </div>
                        </section>

                        <section className={`p-4 rounded-2xl border border-dashed ${isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="flex items-center gap-2 mb-2 text-amber-500">
                                <AlertCircle size={16} />
                                <h3 className="text-[10px] font-black uppercase tracking-widest">Aviso Legal</h3>
                            </div>
                            <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-amber-200/70' : 'text-amber-800/70'}`}>
                                Esta aplicación es una herramienta de soporte para la investigación y educación médica. Los resúmenes generados por IA pueden contener imprecisiones. Siempre verifique la fuente original antes de tomar decisiones clínicas.
                            </p>
                        </section>

                        <div className="text-center opacity-30 text-[9px] font-mono">
                            Build: 2026.1.0-alpha • React Native / Capacitor
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

       <VoiceModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} contextText={summary} isDarkMode={isDarkMode} language={uiLanguage === 'es' ? 'es' : 'original'} apiKey={geminiApiKey} />
       <AnimatePresence>{activeImmersiveArticle && <ImmersiveReader article={activeImmersiveArticle} onClose={() => setActiveImmersiveArticle(null)} isDarkMode={isDarkMode} onUpdateNote={handleUpdateNote} onAddHighlight={handleAddHighlight} onRemoveHighlight={handleRemoveHighlight} onUpdateReadingStatus={handleUpdateReadingStatus} fontStyle={fontStyle} />}</AnimatePresence>
       <OfflineReader isOpen={isReaderOpen} onClose={() => setIsReaderOpen(false)} article={readerArticle} htmlContent={readerHtml} isDarkMode={isDarkMode} isLoading={isReaderLoading} onSaveOffline={handleSaveOffline} isAlreadyDownloaded={readerArticle ? !!offlineStatus[readerArticle.id] : false} onUpdateReadingStatus={handleUpdateReadingStatus} />
    </div>
  );
}