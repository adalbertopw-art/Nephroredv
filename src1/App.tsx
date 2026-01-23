import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bookmark, RefreshCw, AlertCircle, Loader2, Search, Settings, Moon, Sun, ChevronDown, ChevronUp, Sparkles, X, History, Clock, Trash2, Mic, Volume2, Key, Check, Zap, Database, Book, FlaskConical, Library, Building2, Languages, Palette, CalendarClock, ArrowUp, Info, BookOpen, Download, Workflow, StickyNote, Bell, GraduationCap, Quote, Lock, Unlock, FileText, SlidersHorizontal, Microscope, Radar, ArrowLeft, BrainCircuit, WifiOff, Eye, Plus, Tag, ArrowUpCircle, ArrowDownCircle, GripVertical, Undo2, User, Home, LayoutGrid, ScanEye, Layers, Filter, Calendar, List, ArrowRight, RotateCcw, Activity, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { App as CapacitorApp } from '@capacitor/app';

// Services
import { fetchLatestNephrologyNews, verifyGeminiKey, generateGeminiSummary, refinePicoTerms, translateSimpleQuery } from '../services/geminiService';
import { fetchPubMedArticles } from '../services/pubmedService';
import { fetchOpenAlexArticles } from '../services/openAlexService';
import { fetchEuropePmcArticles } from '../services/europePmcService';
import { fetchSemanticScholarArticles } from '../services/semanticScholarService';
import { fetchClinicalTrials } from '../services/clinicalTrialsService';
import { fetchCoreArticles } from '../services/coreApiService';
import { fetchDoajArticles } from '../services/doajService';
import { fetchElsevierArticles } from '../services/elsevierService';
import { generateGroqSummary, verifyGroqKey } from '../services/groqService';
import { getOfflineStatusMap, getOfflineArticle, clearOfflineStorage } from '../services/storageService';
import { fetchArticleContent } from '../services/downloadService';

// Constants
import { getArticleImpactTier } from '../constants/searchConstants';

// Types & Components
import { Article, ResearchUpdate, Topic, Language, HistorySnapshot, RetentionPeriod, TextSize, SearchMode, DataSource, UiLanguage, AIProvider } from '../types';
import ArticleCard from './components/ArticleCard';
import ArticleSkeleton from './components/ArticleSkeleton';
import NewsTicker from './components/NewsTicker';
import VoiceModal from './components/VoiceModal';
import OfflineReader from './components/OfflineReader';
import ImmersiveReader from './components/ImmersiveReader';
import HistoryViewer from './components/HistoryViewer';

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

// Added missing KidneyIcon component
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
    discover: 'Descubrir', library: 'Biblioteca', history: 'Historial', searchPlaceholder: 'Buscar temas...',
    welcome: 'Bienvenido a', subtitle: 'NephroUpdate', loading: 'Analizando evidencia...',
    error: 'Error de conexión.', saved: 'Guardado', removed: 'Eliminado',
    libraryTitle: 'Tu Biblioteca', historyTitle: 'Línea de Timeline',
    fullTextError: 'No se pudo extraer el texto completo.', openingReader: 'Obteniendo Texto Completo...',
    analysisStopped: 'Análisis detenido por el usuario.', translating: 'Traduciendo al inglés médico...'
  },
  en: {
    discover: 'Discover', library: 'Library', history: 'History', searchPlaceholder: 'Search topics...',
    welcome: 'Welcome to', subtitle: 'NephroUpdate', loading: 'Analyzing evidence...',
    error: 'Connection error.', saved: 'Saved', removed: 'Removed',
    libraryTitle: 'Your Library', historyTitle: 'Timeline',
    fullTextError: 'Could not extract full text.', openingReader: 'Fetching Full Text...',
    analysisStopped: 'Analysis stopped by user.', translating: 'Translating to medical English...'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'history' | 'settings'>('discover');
  const [direction, setDirection] = useState(0);
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState<Topic>('General');
  const [topicCache, setTopicCache] = useState<Record<string, ResearchUpdate>>({});
  const [articles, setArticles] = useState<Article[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('es');
  const [contentLanguage, setContentLanguage] = useState<Language>('es');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [elsevierApiKey, setElsevierApiKey] = useState('');
  const [coreApiKey, setCoreApiKey] = useState('');
  const [s2ApiKey, setS2ApiKey] = useState('');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('standard');
  const [activeOfflineArticle, setActiveOfflineArticle] = useState<{ article: Article, html: string } | null>(null);
  const [offlineReaderOpen, setOfflineReaderOpen] = useState(false);
  const [isReaderLoading, setIsReaderLoading] = useState(false);
  const [activeImmersiveArticle, setActiveImmersiveArticle] = useState<Article | null>(null);
  const [textSize, setTextSize] = useState<TextSize>('base');
  const [visibleCount, setVisibleCount] = useState(9);
  const [activeSources, setActiveSources] = useState<Record<DataSource, boolean>>({
      pubmed: true, openalex: true, europepmc: true, semanticscholar: true,
      clinicaltrials: true, core: true, doaj: true, elsevier: true 
  });
  const [viewingHistorySnapshot, setViewingHistorySnapshot] = useState<HistorySnapshot | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // GESTOS MOBILE
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const t = translations[uiLanguage];

  const handleTopicClick = (topic: Topic) => {
      if (selectedTopic === topic && activeTab === 'discover') {
          // Fix: Expected 0-5 arguments, but got 6. Corrected to match fetchNews signature.
          fetchNews(topic, '', undefined, undefined, true); 
      } else {
          const currentIndex = topics.indexOf(selectedTopic);
          const newIndex = topics.indexOf(topic);
          setDirection(newIndex > currentIndex ? 1 : -1);
          setSelectedTopic(topic);
          setSearchQuery('');
          setActiveTab('discover');
          fetchNews(topic);
      }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTab !== 'discover') return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Swipe horizontal detectado: umbral 60px y el movimiento horizontal debe ser mayor al vertical
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const currentIndex = topics.indexOf(selectedTopic);
      if (deltaX < 0 && currentIndex < topics.length - 1) {
        // Swipe Izquierda -> Siguiente Tópico
        if (navigator.vibrate) navigator.vibrate(10);
        handleTopicClick(topics[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe Derecha -> Anterior Tópico
        if (navigator.vibrate) navigator.vibrate(10);
        handleTopicClick(topics[currentIndex - 1]);
      }
    }
  };

  const fetchNews = async (overrideTopic?: string, overrideQuery?: string, overrideSearchMode?: SearchMode, overrideLanguage?: Language, forceRefresh = false) => { 
      const topicToUse = overrideTopic || selectedTopic; 
      const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery; 
      const modeToUse = overrideSearchMode || searchMode; 
      const langToUse = overrideLanguage || contentLanguage; 
      
      if (!forceRefresh && !queryToUse && topicCache[topicToUse]) { 
          setArticles(topicCache[topicToUse].articles); 
          setSummary(topicCache[topicToUse].summary); 
          setLoading(false); 
          return; 
      } 
      
      if (abortControllerRef.current) abortControllerRef.current.abort(); 
      abortControllerRef.current = new AbortController(); 
      const currentSignal = abortControllerRef.current.signal; 
      
      setLoading(true); setError(null); setArticles([]); setSummary(''); setVisibleCount(9); 
      
      try { 
          let effectiveQuery = queryToUse;
          if (queryToUse && !queryToUse.includes('(') && !queryToUse.includes('AND')) {
              effectiveQuery = await translateSimpleQuery(queryToUse);
          }

          const sourcePromises: Promise<ResearchUpdate>[] = [];
          if (activeSources.pubmed) sourcePromises.push(fetchPubMedArticles(topicToUse, langToUse, effectiveQuery));
          if (activeSources.openalex) sourcePromises.push(fetchOpenAlexArticles(topicToUse, langToUse, effectiveQuery));
          if (activeSources.europepmc) sourcePromises.push(fetchEuropePmcArticles(topicToUse, langToUse, effectiveQuery));
          if (activeSources.semanticscholar) sourcePromises.push(fetchSemanticScholarArticles(topicToUse, langToUse, effectiveQuery, s2ApiKey));
          if (activeSources.clinicaltrials) sourcePromises.push(fetchClinicalTrials(topicToUse, langToUse, effectiveQuery));
          if (activeSources.core) sourcePromises.push(fetchCoreArticles(topicToUse, langToUse, effectiveQuery, coreApiKey));
          if (activeSources.doaj) sourcePromises.push(fetchDoajArticles(topicToUse, langToUse, effectiveQuery));
          if (activeSources.elsevier) sourcePromises.push(fetchElsevierArticles(topicToUse, langToUse, effectiveQuery, elsevierApiKey));

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
                          unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
                          return unique;
                      });
                  }
              }).finally(() => {
                  completedCount++;
                  if (completedCount === sourcePromises.length) {
                      if (modeToUse === 'ai') {
                          setArticles(currentArticles => {
                              if (currentArticles.length > 0) {
                                  generateGeminiSummary(currentArticles, topicToUse, langToUse)
                                      .then(aiSummary => setSummary(aiSummary));
                              }
                              return currentArticles;
                          });
                      }
                      setLoading(false);
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

  const toggleSave = useCallback((article: Article) => {
    setSavedArticles(prev => {
        const isAlreadySaved = prev.some(a => a.id === article.id);
        if (isAlreadySaved) return prev.filter(a => a.id !== article.id);
        return [article, ...prev];
    });
  }, []);

  const navigateToTab = (tab: any) => {
      const tabsOrder = ['history', 'discover', 'saved'];
      const fromIdx = tabsOrder.indexOf(activeTab as string);
      const toIdx = tabsOrder.indexOf(tab);
      setDirection(toIdx > fromIdx ? 1 : -1);
      setActiveTab(tab);
  };

  const executeRemoveTopic = (topic: string) => {
    setTopics(prev => {
        const next = prev.filter(t => t !== topic);
        if (next.length === 0) return [DEFAULT_TOPICS[0]];
        return next;
    });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleResetTopics = () => {
      setTopics(DEFAULT_TOPICS);
      setSelectedTopic(DEFAULT_TOPICS[0]);
      fetchNews(DEFAULT_TOPICS[0]);
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

  useEffect(() => {
      const load = async () => {
          const saved = localStorage.getItem('ne_saved'); const hist = localStorage.getItem('ne_hist'); const pref = localStorage.getItem('ne_pref');
          if (saved) setSavedArticles(JSON.parse(saved)); if (hist) setHistory(JSON.parse(hist));
          if (pref) { 
            const p = JSON.parse(pref); setIsDarkMode(p.isDarkMode || false); setUiLanguage(p.uiLanguage || 'es'); 
            setSearchMode(p.searchMode || 'standard'); setTextSize(p.textSize || 'base');
            setGroqApiKey(p.groqApiKey || ''); setElsevierApiKey(p.elsevierApiKey || '');
            setCoreApiKey(p.coreApiKey || ''); setS2ApiKey(p.s2ApiKey || '');
          }
          const map = await getOfflineStatusMap(); setOfflineStatus(map);
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
    localStorage.setItem('ne_pref', JSON.stringify({ isDarkMode, uiLanguage, searchMode, textSize, groqApiKey, elsevierApiKey, coreApiKey, s2ApiKey })); 
  }, [isDarkMode, uiLanguage, searchMode, textSize, groqApiKey, elsevierApiKey, coreApiKey, s2ApiKey]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans overflow-hidden flex flex-col`}>
      
      {/* Mobile Header Bar */}
      <div className={`flex items-center justify-between px-4 h-12 bg-white/90 backdrop-blur-xl border-b border-slate-100 lg:hidden ${isDarkMode ? 'bg-slate-950/90 border-slate-800' : ''}`}>
           <div className="flex flex-shrink-0 items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-1 text-white shadow-lg"><KidneyIcon size={18} className="text-white" /></div>
           </div>
           <div className="mx-2 flex-1 overflow-hidden min-w-0"><NewsTicker isDarkMode={isDarkMode} className="bg-transparent border-0 px-0 py-0" /></div>
           <button onClick={() => setActiveTab('settings')} className="p-2 text-slate-400"><Settings size={18} /></button>
      </div>

      <div className="flex flex-1 h-full overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={`hidden w-64 flex-col border-r z-30 transition-colors backdrop-blur-xl lg:flex ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/70 border-slate-200'}`}>
           <div className="p-6">
              <div className="mb-8 flex items-center gap-3">
                 <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg"><KidneyIcon size={24} /></div>
                 <h1 className="text-lg font-black tracking-tight">NephroUpdate</h1>
              </div>
              <nav className="space-y-1">
                  {[{ id: 'history', icon: History, label: t.history }, { id: 'discover', icon: Radar, label: t.discover }, { id: 'saved', icon: Bookmark, label: t.library }].map(item => (
                      <button key={item.id} onClick={() => navigateToTab(item.id as any)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'opacity-60 hover:opacity-100 hover:bg-black/5'}`}>
                          <item.icon size={18}/> <span>{item.label}</span>
                      </button>
                  ))}
              </nav>
           </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex h-full flex-1 flex-col overflow-hidden">
          <header className={`hidden h-16 items-center justify-between gap-4 border-b px-8 z-20 lg:flex ${isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white/70 border-slate-200'} backdrop-blur-sm`}>
             <div className="group relative max-w-2xl flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchNews(selectedTopic, searchQuery)} placeholder={t.searchPlaceholder} className={`w-full rounded-2xl border outline-none pl-11 pr-10 py-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
             </div>
             <div className="flex items-center gap-3">
               <button onClick={() => setActiveTab('settings')} className="p-2.5 rounded-xl border dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"><Settings size={20}/></button>
               <button onClick={() => fetchNews()} disabled={loading} className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
             </div>
          </header>

          <div 
            ref={scrollContainerRef} 
            className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${activeTab === 'discover' ? 'pb-32 pt-2' : 'pb-32 pt-4'} lg:p-8 lg:pb-8 lg:pt-8`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y' }}
          >
             <AnimatePresence initial={false} custom={direction} mode="popLayout">
             {activeTab === 'discover' && (
                <motion.div 
                    key="discover" 
                    initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="mx-auto max-w-6xl space-y-6 min-h-full w-full"
                >
                    <div className="sticky top-0 z-40 -mx-4 border-b p-1 backdrop-blur-xl dark:bg-slate-950/80 bg-white/80 lg:mx-0 lg:rounded-full lg:mb-8 lg:border-slate-200/40">
                        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-4 py-1">
                           {topics.map(topic => (
                              <button key={topic} onClick={() => handleTopicClick(topic)} className={`shrink-0 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-full ${selectedTopic === topic ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{topic}</button>
                           ))}
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                       {summary && (
                         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2.5rem] border p-8 bg-blue-50/20 dark:bg-slate-900/40 border-blue-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                                <Sparkles size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">IA Resumen Clínico</span>
                            </div>
                            <p className="text-lg leading-relaxed font-serif">{summary}</p>
                         </motion.div>
                       )}
                       
                       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {loading && articles.length === 0 ? Array(6).fill(0).map((_, i) => <ArticleSkeleton key={i} isDarkMode={isDarkMode} />) : articles.slice(0, visibleCount).map(article => (
                             <ArticleCard 
                                key={article.id} article={article} isSaved={savedArticles.some(a => a.id === article.id)} 
                                onToggleSave={toggleSave} isDarkMode={isDarkMode} onOpenImmersive={setActiveImmersiveArticle} 
                                onUpdateNote={handleUpdateNote} groqApiKey={groqApiKey} textSize={textSize} 
                                isDownloaded={!!offlineStatus[article.id]}
                             />
                          ))}
                       </div>
                       {visibleCount < articles.length && <div className="flex justify-center py-8"><button onClick={() => setVisibleCount(v => v + 9)} className="rounded-full border bg-white px-10 py-3 font-bold dark:bg-slate-900 shadow-xl transition-transform active:scale-95">Cargar Más Evidencia</button></div>}
                    </div>
                </motion.div>
             )}
             
             {activeTab === 'saved' && (
                 <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl px-2">
                    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                        <div className="space-y-2">
                           <h2 className="text-3xl font-black">{t.libraryTitle}</h2>
                           <p className="text-xs font-bold uppercase tracking-widest opacity-40">{savedArticles.length} Artículos en biblioteca</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Buscar en biblioteca..." className={`w-full rounded-2xl border text-sm outline-none pl-9 pr-4 py-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {savedArticles.filter(a => a.title.toLowerCase().includes(librarySearch.toLowerCase())).map(article => (
                            <ArticleCard key={article.id} article={article} isSaved={true} onToggleSave={toggleSave} isDarkMode={isDarkMode} onOpenImmersive={setActiveImmersiveArticle} onUpdateNote={handleUpdateNote} isCompact={true} isDownloaded={!!offlineStatus[article.id]} />
                        ))}
                    </div>
                 </motion.div>
             )}

             {activeTab === 'history' && (
                 <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-6 px-2">
                    <h2 className="text-3xl font-black">{t.historyTitle}</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {history.map(snapshot => (
                            <div key={snapshot.id} onClick={() => setViewingHistorySnapshot(snapshot)} className={`flex cursor-pointer items-center justify-between rounded-3xl border p-6 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><History size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-lg">{snapshot.topic}</h4>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-50"><Clock size={12} /> {new Date(snapshot.timestamp).toLocaleString()}</div>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="opacity-30" />
                            </div>
                        ))}
                    </div>
                 </motion.div>
             )}

             {activeTab === 'settings' && (
                 <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6 px-4 pb-20">
                    <h2 className="text-3xl font-black">Configuración</h2>
                    
                    {/* Tópicos */}
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Database size={18} className="text-blue-500" />
                                <h3 className="font-bold text-sm uppercase tracking-widest">Mis Tópicos</h3>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); if (window.confirm("¿Restaurar tópicos a los estándares académicos de NephroUpdate?")) handleResetTopics(); }}
                                className="text-[10px] font-black uppercase text-blue-500 hover:underline"
                            >
                                Reset Estándar
                            </button>
                        </div>
                        <div className="space-y-2">
                            {topics.map(topic => (
                                <div key={topic} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <span className="text-sm font-bold">{topic}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Seguro que deseas eliminar el tópico "${topic}"?`)) executeRemoveTopic(topic); }}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* API Keys Instructions */}
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-4 text-blue-500">
                            <Key size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-widest">Llaves API e Inteligencia</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold uppercase tracking-tight">Groq API Key</span>
                                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-500 flex items-center gap-0.5 hover:underline uppercase">
                                        Obtener <ExternalLink size={8} />
                                    </a>
                                </div>
                                <p className="text-[10px] opacity-50 italic leading-tight mb-2">Para resúmenes rápidos con Llama 3.</p>
                                <input type="password" value={groqApiKey} onChange={e => setGroqApiKey(e.target.value)} placeholder="gsk_..." className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs font-mono outline-none dark:border-white/10" />
                            </div>

                            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {/* Fix: Cannot find name 'ShieldCheck'. ShieldCheck icon added to imports and used here. */}
                                        <ShieldCheck size={16} className="text-emerald-500" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase tracking-tight">Gemini API</span>
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-500 flex items-center gap-0.5 hover:underline uppercase">
                                                Obtener en AI Studio <ExternalLink size={7} />
                                            </a>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase px-2 py-0.5 rounded bg-emerald-500/10">Sistema Activo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mantenimiento de Datos */}
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-4 text-red-500">
                            <Trash2 size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-widest">Mantenimiento</h3>
                        </div>
                        <div className="space-y-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); if (window.confirm("¿Confirmar: Borrar todo el historial de investigación? Esta acción no se puede deshacer.")) handleClearHistory(); }}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold text-sm hover:bg-red-500/20"
                            >
                                <span>Limpiar Historial</span>
                                <RotateCcw size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); if (window.confirm("¿ADVERTENCIA: REALIZAR RESET TOTAL?\n\nEsto eliminará permanentemente:\n- Llaves API configuradas.\n- Artículos descargados.\n- Preferencias, Historial y Biblioteca.\n\nLa aplicación se reiniciará.")) handleFactoryReset(); }}
                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-red-500 text-red-500 font-black text-xs uppercase tracking-tighter hover:bg-red-500 hover:text-white"
                            >
                                <span>Reset Total (Fábrica)</span>
                                <AlertCircle size={16} />
                            </button>
                        </div>
                    </div>
                 </motion.div>
             )}
             </AnimatePresence>
          </div>
        </main>
      </div>

       {/* Mobile Floating Tab Bar */}
       <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 lg:hidden">
          <div className={`flex items-center gap-1.5 p-1.5 rounded-full border shadow-2xl backdrop-blur-2xl saturate-[1.8] ${isDarkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-400/10 shadow-blue-200/40'}`}>
              {[
                { id: 'history', icon: History, action: () => navigateToTab('history') },
                { id: 'discover', icon: Radar, action: () => navigateToTab('discover') },
                { id: 'saved', icon: Bookmark, action: () => navigateToTab('saved') }
              ].map(item => (
                <button key={item.id} onClick={item.action} className={`relative rounded-full p-4 transition-all duration-300 ease-out active:scale-90 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`}>
                    {activeTab === item.id && <motion.div layoutId="dock-active" className="absolute inset-0 -z-10 rounded-full bg-blue-600 shadow-lg shadow-blue-600/30" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                    <item.icon size={22} className="relative z-10" />
                </button>
              ))}
              <div className="mx-1 h-8 w-px bg-black/5 dark:bg-white/5"></div>
              <button onClick={() => setVoiceModalOpen(true)} className="p-4 text-indigo-500 transition-all hover:scale-110 active:scale-95"><Mic size={22} /></button>
          </div>
       </div>

       <VoiceModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} contextText={summary} isDarkMode={isDarkMode} language={uiLanguage === 'es' ? 'es' : 'original'} />
       <AnimatePresence>{activeImmersiveArticle && <ImmersiveReader article={activeImmersiveArticle} onClose={() => setActiveImmersiveArticle(null)} isDarkMode={isDarkMode} onUpdateNote={handleUpdateNote} />}</AnimatePresence>
       {viewingHistorySnapshot && <HistoryViewer snapshot={viewingHistorySnapshot} onClose={() => setViewingHistorySnapshot(null)} isDarkMode={isDarkMode} onToggleSave={toggleSave} savedArticles={savedArticles} language={uiLanguage === 'es' ? 'es' : 'original'} textSize={textSize} apiKey="" groqApiKey={groqApiKey} offlineStatus={offlineStatus} onReadOffline={() => {}} onReadFullText={() => {}} />}
    </div>
  );
}