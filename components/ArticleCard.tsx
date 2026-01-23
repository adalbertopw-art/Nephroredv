
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Article, Language, TextSize, ArticleCategory, FontStyle } from '../types';
import { Share2, Bookmark, BookmarkCheck, Sparkles, Loader2, Zap, ChevronDown, ChevronUp, Unlock, Lock, BookOpen, FileText, StickyNote, X, Quote, Workflow, CheckCircle2, Circle, Clock, Flame, Image as ImageIcon, ExternalLink, Trash2, WifiOff, Activity, Users, FlaskConical, BarChart3, Microscope, AlertTriangle, Scale, FileSearch, Newspaper, Layers, Info, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { fetchRelatedArticles, generateVisualAbstract as generateGeminiVisual } from '../services/geminiService';
import { enhanceArticleSummary } from '../services/groqService';
import { highlightMedicalText } from '../utils/semanticHighlighter';
import { openExternalUrl } from '../services/browserService';
import { getArticleImpactTier } from '../constants/searchConstants';
import MermaidDiagram from './MermaidDiagram';
import { motion, AnimatePresence } from 'framer-motion';

interface ArticleCardProps {
  article: Article;
  isSaved: boolean;
  onToggleSave: (article: Article) => void;
  language?: Language;
  onUpdateArticle?: (articleId: string, updates: any) => void; 
  textSize?: TextSize;
  fontStyle?: FontStyle;
  isDarkMode?: boolean;
  groqApiKey?: string;
  geminiApiKey?: string;
  isDownloaded?: boolean;
  offlineStatus?: 'full' | 'summary';
  onReadOffline?: (articleId: string) => void;
  onReadFullText?: (article: Article) => void; 
  onExpandStateChange?: (expanded: boolean) => void;
  onUpdateNote?: (articleId: string, note: string) => void;
  onUpdateVisualAbstract?: (articleId: string, visual: string) => void;
  onUpdateReadingStatus?: (articleId: string, status: 'unread' | 'in_progress' | 'completed') => void;
  onAddHighlight?: (articleId: string, text: string) => void;
  onRemoveHighlight?: (articleId: string, index: number) => void;
  defaultXrayMode?: boolean; 
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (article: Article) => void;
  onOpenImmersive?: (article: Article) => void;
  isCompact?: boolean;
}

const translations = {
  es: {
    iaRelated: 'IA Relat.',
    noRelated: 'Sin sugerencias IA',
    shareCopied: 'Enlace copiado',
    enhanceGroq: 'Mejorar (Groq)',
    visualAbstract: 'Generar Visual Abstract',
    fullTextTip: 'Flujo de Evidencia (Texto Completo)',
    openBrowser: 'Ver Web Original',
    rct: 'RCT',
    guideline: 'Guía',
    copied: 'Copiado',
    readerMode: 'Modo Lector',
    openDoi: 'Abrir DOI (Oficial)',
    cite: 'Citar',
    citationCopied: 'Cita copiada',
    personalNote: 'Nota Personal',
    notePlaceholder: 'Escribe tus observaciones clínicas aquí...',
    saving: 'Guardando...',
    readTime: 'min lectura',
    remove: 'Eliminar de biblioteca',
    library: 'Biblioteca',
    tldrTitle: 'Cápsula de Impacto',
    tldrChange: '¿Qué cambió?',
    tldrPopulation: '¿A quién aplica?',
    statsKey: 'Datos Clave',
    statsN: 'Muestra (N)',
    statsP: 'Valor P',
    statsDesign: 'Diseño',
    assocPubs: 'Publicaciones Asociadas'
  },
  en: {
    iaRelated: 'AI Related',
    noRelated: 'No AI suggestions',
    shareCopied: 'Link copied',
    enhanceGroq: 'Enhance (Groq)',
    visualAbstract: 'Generate Visual Abstract',
    fullTextTip: 'Evidence Flow (Full Text)',
    openBrowser: 'View Original Web',
    rct: 'RCT',
    guideline: 'Guideline',
    copied: 'Copied',
    readerMode: 'Reader Mode',
    openDoi: 'Open DOI (Official)',
    cite: 'Cite',
    citationCopied: 'Citation copied',
    personalNote: 'Personal Note',
    notePlaceholder: 'Type your clinical observations here...',
    saving: 'Saving...',
    readTime: 'min read',
    remove: 'Remove from library',
    library: 'Library',
    tldrTitle: 'Impact Capsule',
    tldrChange: 'What changed?',
    tldrPopulation: 'Who does it apply to?',
    statsKey: 'Key Data',
    statsN: 'Sample (N)',
    statsP: 'P-Value',
    statsDesign: 'Design',
    assocPubs: 'Associated Publications'
  }
};

const extractStats = (text: string) => {
  const nMatch = text.match(/\bn\s*[=:]\s*(\d+(?:,\d+)*)/i);
  const pMatch = text.match(/p\s*[<>=]\s*[\d\.]+/i);
  // Extract HR, RR, OR
  const ratioMatch = text.match(/\b(HR|RR|OR)\s*[:=]?\s*([\d\.]+)/i);
  
  return {
    n: nMatch ? nMatch[1] : null,
    p: pMatch ? pMatch[0] : null,
    ratio: ratioMatch ? `${ratioMatch[1]} ${ratioMatch[2]}` : null
  };
};

export const applyUserHighlights = (content: React.ReactNode, highlights: string[], isDarkMode: boolean): React.ReactNode => {
  if (!highlights || highlights.length === 0) return content;

  const wrapInMark = (text: string): React.ReactNode => {
    let parts: (string | React.ReactNode)[] = [text];
    highlights.forEach(highlight => {
      // Decode highlight color if present in highlight string (e.g. "text:::yellow")
      const [hlText, hlColor] = highlight.includes(':::') ? highlight.split(':::') : [highlight, 'yellow'];
      
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }
        const regex = new RegExp(`(${hlText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const splitText = part.split(regex);
        splitText.forEach((segment, i) => {
          if (segment.toLowerCase() === hlText.toLowerCase()) {
            let colorClass = isDarkMode ? 'bg-yellow-500/30 text-yellow-100' : 'bg-yellow-200 text-yellow-900';
            if (hlColor === 'green') colorClass = isDarkMode ? 'bg-emerald-500/30 text-emerald-100' : 'bg-emerald-200 text-emerald-900';
            if (hlColor === 'red') colorClass = isDarkMode ? 'bg-rose-500/30 text-rose-100' : 'bg-rose-200 text-rose-900';

            newParts.push(
              <mark key={`${hlText}-${i}`} className={`${colorClass} rounded-sm px-0.5`}>
                {segment}
              </mark>
            );
          } else if (segment) {
            newParts.push(segment);
          }
        });
      });
      parts = newParts;
    });
    return <>{parts}</>;
  };

  if (Array.isArray(content)) {
    return content.map((node, idx) => {
      if (typeof node === 'string') return <span key={idx}>{wrapInMark(node)}</span>;
      if (React.isValidElement(node) && node.type === 'span') {
        const element = node as React.ReactElement<any>;
        return React.cloneElement(element, { key: idx }, wrapInMark(element.props.children as string));
      }
      return node;
    });
  }
  return typeof content === 'string' ? wrapInMark(content) : content;
};

export const formatAbstract = (text: string, isDark: boolean) => {
  if (!text) return "";
  let cleanText = text
      .replace(/<title>Abstract<\/title>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Added "Associated Publications", "Publicaciones Asociadas" for ClinicalTrials integration
  const keywords = ["Introduction", "Objective", "Methods", "Results", "Conclusions", "Findings", "Introducción", "Objetivo", "Métodos", "Resultados", "Conclusiones", "Associated Publications", "Publicaciones Asociadas"];
  const globalRegex = new RegExp(`(?:^|\\.\\s+|\\n)\\s*(${keywords.join('|')})[:\\.]?`, 'gi');
  
  if (globalRegex.test(cleanText)) {
      let result: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      globalRegex.lastIndex = 0;
      while ((match = globalRegex.exec(cleanText)) !== null) {
          const before = cleanText.substring(lastIndex, match.index);
          if (before.trim()) result.push(<span key={lastIndex}>{before.trim()} </span>);
          result.push(
              <strong key={match.index} className={`block font-sans font-black mt-6 mb-2 uppercase tracking-widest text-[10px] ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                 {match[1].toUpperCase()}
              </strong>
          );
          lastIndex = match.index + match[0].length;
      }
      if (lastIndex < cleanText.length) result.push(<span key="end">{cleanText.substring(lastIndex).trim()}</span>);
      return result;
  }
  return cleanText;
};

export const CitationHeat: React.FC<{ score: number, isDarkMode: boolean }> = ({ score, isDarkMode }) => {
    const isHot = score > 88;
    
    if (!isHot) return null;

    return (
        <div className="relative group/heat z-10" title={`High Impact Score: ${score}`}>
            <Flame size={14} className="text-orange-500 fill-orange-500 animate-pulse" />
        </div>
    );
};

// --- BADGE STYLE GENERATOR ---
const getBadgeConfig = (category: ArticleCategory | string, isDarkMode: boolean) => {
    switch(category) {
        case 'Retraction':
            return {
                style: isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700',
                icon: AlertTriangle
            };
        case 'Guideline':
            return {
                style: isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
                icon: Scale
            };
        case 'Clinical Trial':
            return {
                style: isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700',
                icon: FlaskConical
            };
        case 'Meta-Analysis':
            return {
                style: isDarkMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700',
                icon: Layers
            };
        case 'Cohort':
            return {
                style: isDarkMode ? 'bg-slate-700/50 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600',
                icon: Users
            };
        case 'News':
            return {
                style: isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-700',
                icon: Newspaper
            };
        case 'Review':
            return {
                style: isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700',
                icon: FileSearch
            };
        case 'Case Study':
        case 'Case Report':
            return {
                style: isDarkMode ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-pink-50 border-pink-200 text-pink-700',
                icon: Microscope
            };
        default:
            return {
                style: isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600',
                icon: BarChart3
            };
    }
};

const ArticleCard: React.FC<ArticleCardProps> = ({ article, isSaved, onToggleSave, language = 'es', textSize = 'base', fontStyle = 'sans', isDarkMode = false, groqApiKey, geminiApiKey, onReadFullText, onExpandStateChange, onUpdateNote, onUpdateVisualAbstract, defaultXrayMode, isSelectionMode, isSelected, onSelect, isDownloaded, onReadOffline, onOpenImmersive, isCompact = false, onUpdateArticle }) => {
  const [showRelated, setShowRelated] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [enhancedData, setEnhancedData] = useState<{ summary: string; tldr: { change: string; population: string } } | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [visualError, setVisualError] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'enhanced'>('original');
  const [isXrayMode, setIsXrayMode] = useState(defaultXrayMode || false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsXrayMode(defaultXrayMode || false); }, [defaultXrayMode]);

  useEffect(() => {
    if (visualError) {
        const timer = setTimeout(() => setVisualError(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [visualError]);

  const uiLang = language === 'es' ? 'es' : 'en';
  const t = translations[uiLang];
  const highlights = article.highlights || [];

  const wordCount = article.summary.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Extract Stats
  const stats = extractStats(article.summary);
  const isSignificant = stats.p && (stats.p.includes('<') || parseFloat(stats.p.split('=')[1] || '1') < 0.05);

  // Badge Configuration
  const badgeConfig = getBadgeConfig(article.category, isDarkMode || false);
  const BadgeIcon = badgeConfig.icon;

  const fontClass = {
      sans: 'font-sans',
      serif: 'font-serif',
      modern: 'font-modern'
  }[fontStyle || 'sans'];

  const handleToggleExpand = () => {
    if (isSelectionMode && onSelect) { onSelect(article); return; }
    if (isCompact) { if (onOpenImmersive) onOpenImmersive(article); return; }
    if (!isExpanded && navigator.vibrate) navigator.vibrate(10);
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onExpandStateChange) onExpandStateChange(newState);
  };

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!groqApiKey || isEnhancing) return;
    setIsEnhancing(true);
    try {
        const result = await enhanceArticleSummary(article.title, article.summary, language as Language, groqApiKey);
        if (result) {
            setEnhancedData(result);
            setViewMode('enhanced');
            if (onUpdateArticle) {
                onUpdateArticle(article.id, { 
                  summary: result.summary, 
                  clinicalTldr: result.tldr 
                });
            }
        }
    } catch (err) {
        console.error("Enhancement failed", err);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleGenerateVisual = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGeneratingVisual || article.visualAbstract) {
        if (!isExpanded) setIsExpanded(true);
        return;
    }
    setIsGeneratingVisual(true);
    setVisualError(false);
    try {
        const result = await generateGeminiVisual(article.title, article.summary, language as Language, geminiApiKey);
        if (result && onUpdateVisualAbstract) {
            onUpdateVisualAbstract(article.id, result);
            setIsExpanded(true);
        } else {
            setVisualError(true);
        }
    } catch (err) {
        console.error("Visual generation failed", err);
        setVisualError(true);
    } finally {
        setIsGeneratingVisual(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text: article.summary, url: article.url }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(article.url);
      alert(t.shareCopied);
    }
  };

  const handleCite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const authors = article.authors || 'Unknown Authors';
    const citation = `${authors}. (${article.date}). ${article.title}. ${article.source}. Retrieved from ${article.url}`;
    navigator.clipboard.writeText(citation);
    alert(t.citationCopied);
  };

  const handleEvidenceFlow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReadFullText) onReadFullText(article);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onOpenImmersive) {
          onOpenImmersive(article);
      } else {
          handleEvidenceFlow(e);
      }
  };

  const handleToggleNote = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCompact) { if (onOpenImmersive) onOpenImmersive(article); return; }
      if (!isExpanded) setIsExpanded(true);
      setShowNoteEditor(!showNoteEditor);
  };

  const handleShowRelated = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showRelated) { setShowRelated(false); return; }
      setShowRelated(true);
      setLoadingRelated(true);
      try {
          const res = await fetchRelatedArticles(article.title, language as Language, geminiApiKey);
          setRelatedArticles(res);
      } catch (err) {} finally { setLoadingRelated(false); }
  };

  const fontSizeClass = { 
    sm: 'text-[11px]', 
    base: 'text-[13px]', 
    lg: 'text-[15px]',
    xl: 'text-[17px]'
  }[textSize];

  // UX Improvement: Increased title size
  const titleSizeClass = isCompact 
    ? "text-lg md:text-xl" 
    : { 
        sm: 'text-lg', 
        base: 'text-xl', 
        lg: 'text-2xl',
        xl: 'text-3xl'
      }[textSize];

  const currentSummary = (viewMode === 'enhanced' && enhancedData) ? enhancedData.summary : article.summary;
  const currentTldr = (viewMode === 'enhanced' && enhancedData) ? enhancedData.tldr : article.clinicalTldr;

  const rawAbstractContent = isXrayMode 
    ? highlightMedicalText(currentSummary, isDarkMode || false)
    : formatAbstract(currentSummary, isDarkMode || false);

  const abstractWithHighlights = applyUserHighlights(rawAbstractContent, highlights, isDarkMode || false);

  if (isCompact) {
      return (
          <motion.div 
            layout
            className={`flex flex-col rounded-[2rem] border transition-all duration-300 group relative overflow-hidden backdrop-blur-3xl saturate-[1.2] shadow-xl ${isDarkMode ? 'bg-[#020617]/80 border-white/5 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-900'}`}
          >
              <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                           <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                               {article.source.split(' ')[0]}
                           </span>
                           {isDownloaded && <WifiOff size={10} className="text-emerald-500" />}
                       </div>
                       <div className="flex items-center gap-2">
                           <CitationHeat score={article.relevanceScore} isDarkMode={isDarkMode} />
                           <button onClick={(e) => { e.stopPropagation(); onToggleSave(article); }} className="text-red-400 hover:text-red-500 p-1" title={t.remove}>
                               <Trash2 size={12} />
                           </button>
                       </div>
                  </div>

                  <h3 onClick={handleTitleClick} className={`${titleSizeClass} ${fontClass} font-bold leading-tight cursor-pointer hover:text-blue-500`}>
                      {article.title}
                  </h3>

                  <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 opacity-40 text-[8px] font-black uppercase">
                          <span>{article.date}</span>
                          {article.note && (
                              <span className="flex items-center gap-1 text-amber-500">
                                  <StickyNote size={10} /> {t.personalNote}
                              </span>
                          )}
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={() => onOpenImmersive && onOpenImmersive(article)} className={`p-1.5 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                              <BookOpen size={12} className="text-blue-500" />
                          </button>
                          <button onClick={handleEvidenceFlow} className={`p-1.5 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                              {isDownloaded ? <CheckCircle2 size={12} className="text-emerald-500" /> : <ExternalLink size={12} className="text-slate-50" />}
                          </button>
                      </div>
                  </div>
              </div>
          </motion.div>
      );
  }

  return (
    <div ref={cardRef} className={`flex flex-col rounded-[2.2rem] border transition-all duration-500 group relative overflow-hidden backdrop-blur-3xl shadow-xl ${isDarkMode ? 'bg-[#020617]/80 border-white/5 text-slate-100 hover:bg-[#020617]' : 'bg-white/90 border-slate-200 text-slate-900 hover:bg-white'} ${isSelected ? 'ring-4 ring-blue-500 border-transparent' : ''}`}>
      
      {article.imageUrl && !imageError && (
        <div className="relative w-full h-32 overflow-hidden group-hover:h-36 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
           <img src={article.imageUrl} alt={article.title} onError={() => setImageError(true)} className="w-full h-full object-cover saturate-[1.1] brightness-[0.9] dark:brightness-[0.7]" />
           <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? 'from-[#020617]' : 'from-white/90'} to-transparent opacity-80`}></div>
        </div>
      )}

      {/* Reduced padding-bottom (pb-16) to ensure the Ribbon is tight to the Action Bar */}
      <div className="p-5 pb-16 space-y-3 relative z-10">
        <div className="flex items-center justify-between">
             <div className="flex items-center gap-1.5 flex-wrap">
                 {/* SEMANTIC BADGE: Color Coded by Article Type */}
                 <span className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border shadow-sm ${badgeConfig.style}`}>
                     <BadgeIcon size={8} />
                     {article.category}
                 </span>

                 {/* STATS INLINE (N, P, HR) - Semantic Highlighting Applied */}
                 {(stats.n || stats.p || stats.ratio) && (
                    <div className="flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-left-2">
                        {/* Population (N) -> Purple Italic */}
                        {stats.n && (
                            <span className={`text-[9px] font-mono tracking-tight mr-1 ${isDarkMode ? 'text-purple-400 italic opacity-90' : 'text-purple-700 italic opacity-90'}`}>
                                N={stats.n}
                            </span>
                        )}
                        
                        {/* Effect Size (HR/RR/OR) -> Blue Pill */}
                        {stats.ratio && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${
                                isDarkMode 
                                    ? 'bg-blue-500/20 text-blue-300 border-b border-blue-500' 
                                    : 'bg-blue-50 text-blue-700 border-b border-blue-400 font-bold'
                            }`}>
                                {stats.ratio}
                            </span>
                        )}

                        {/* P-Value -> Green Pill (Sig) or Muted (NS) */}
                        {stats.p && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${
                                isSignificant
                                    ? (isDarkMode 
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' 
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold')
                                    : (isDarkMode 
                                        ? 'text-slate-500 decoration-slate-700 underline decoration-dotted' 
                                        : 'text-slate-400 decoration-slate-300 underline decoration-dotted')
                            }`}>
                                {stats.p}
                            </span>
                        )}
                    </div>
                 )}
                 
                 {isDownloaded && <WifiOff size={9} className="text-emerald-500 ml-0.5" />}
             </div>
             
             <div className="flex items-center gap-2">
                 {/* Simplified Citation Heat - Only Flame */}
                 <CitationHeat score={article.relevanceScore} isDarkMode={isDarkMode} />
                 
                 <button onClick={(e) => { e.stopPropagation(); handleEvidenceFlow(e); }} className={`p-1 rounded-full transition-all hover:scale-110 active:scale-95 ${isDownloaded ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : (article.isFree ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-amber-500 bg-amber-50 dark:bg-amber-900/20')}`} title={t.fullTextTip}>
                     {isDownloaded ? <CheckCircle2 size={13} strokeWidth={2.5} /> : (article.isFree ? <Unlock size={13} strokeWidth={2.5} /> : <Lock size={13} strokeWidth={2.5} />)}
                 </button>
             </div>
        </div>

        {/* Metadata Contrast */}
        <div className="flex justify-between items-end border-b border-dashed border-slate-200 dark:border-white/5 pb-2 gap-2">
             <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className={`text-[9px] font-bold uppercase tracking-[0.05em] truncate w-full ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{article.source}</span>
                <div className="flex items-center gap-2 opacity-50 text-[8px] font-medium uppercase tracking-widest">
                    <span>{article.date}</span>
                    <span>•</span>
                    <span>{readTime} {t.readTime}</span>
                </div>
             </div>
        </div>
        
        <h3 onClick={handleTitleClick} className={`${titleSizeClass} ${fontClass} font-bold leading-[1.3] tracking-tight transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 active:scale-[0.99]`}>
            {article.title}
        </h3>

        {/* CLINICAL TL;DR CAPSULE */}
        {currentTldr && (
            <div className={`mt-3 p-3.5 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-blue-950/20 border-blue-800/40' : 'bg-blue-50/50 border-blue-200 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400">
                        <Activity size={12} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{t.tldrTitle}</span>
                </div>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 shrink-0">{t.tldrChange}</span>
                        <p className={`text-[11px] leading-tight font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{currentTldr.change}</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">{t.tldrPopulation}</span>
                        <p className={`text-[11px] leading-tight font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{currentTldr.population}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="relative">
          <div onClick={handleToggleExpand} className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden relative cursor-pointer ${isExpanded ? 'max-h-[5000px]' : 'max-h-36'}`} style={!isExpanded ? { maskImage: 'linear-gradient(180deg, black 0%, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 70%, transparent 100%)' } : {}}>
              <div className={`${fontSizeClass} ${fontClass} leading-relaxed text-justify ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                   {isExpanded && (showNoteEditor || article.note) && isSaved && (
                       <div className={`mb-6 mt-2 rounded-2xl p-4 border relative animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-amber-900/20 border-amber-800/50' : 'bg-yellow-50 border-yellow-200 shadow-sm'}`} onClick={e => e.stopPropagation()}>
                           <div className="flex items-center gap-2 mb-2 text-amber-500">
                               <StickyNote size={14} />
                               <span className="text-[9px] font-black uppercase tracking-widest">{t.personalNote}</span>
                           </div>
                           <textarea value={article.note || ''} onChange={(e) => onUpdateNote && onUpdateNote(article.id, e.target.value)} placeholder={t.notePlaceholder} className={`w-full bg-transparent outline-none resize-none text-xs leading-relaxed ${isDarkMode ? 'text-amber-200 placeholder-amber-500/50' : 'text-slate-800 placeholder-slate-400'}`} rows={3} />
                       </div>
                   )}

                   {/* ASSOCIATED PUBLICATIONS SECTION */}
                   {article.associatedPublications && article.associatedPublications.length > 0 && isExpanded && (
                       <div className={`mt-4 mb-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`} onClick={e => e.stopPropagation()}>
                           <div className="flex items-center gap-2 mb-3">
                               <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                   <LinkIcon size={14} />
                               </div>
                               <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                   {t.assocPubs}
                               </h4>
                           </div>
                           <ul className="space-y-2">
                               {article.associatedPublications.map((pub, idx) => (
                                   <li key={idx} className="flex gap-2 text-[11px] leading-relaxed opacity-80">
                                       <span className="text-blue-500">•</span>
                                       <span dangerouslySetInnerHTML={{ __html: pub.replace(/(PMID:\s*\d+)/, '<span class="font-mono text-[9px] bg-blue-100 dark:bg-blue-900 px-1 rounded">$1</span>') }}></span>
                                   </li>
                                ))}
                           </ul>
                       </div>
                   )}

                   {isExpanded && article.visualAbstract && (
                       <div className="mb-8 mt-4 rounded-3xl overflow-hidden border dark:border-white/5 shadow-2xl">
                           <div className="p-3 bg-slate-100 dark:bg-slate-900 border-b dark:border-white/5 flex items-center justify-between">
                               <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">Visual Summary (AI)</span>
                               <span className="text-[8px] text-blue-500 font-bold">MERMAID.JS</span>
                           </div>
                           <MermaidDiagram chart={article.visualAbstract} isDarkMode={isDarkMode || false} />
                       </div>
                   )}
                   <div ref={textContainerRef} className="select-text pb-0 pt-1">{abstractWithHighlights}</div>
              </div>
          </div>
          {!isExpanded && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <div className={`p-1 rounded-full shadow-sm animate-bounce ${isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-white/50 text-slate-400 border border-slate-100'}`}><ChevronDown size={12} strokeWidth={2.5} /></div>
              </div>
          )}
        </div>
        
        {/* REMOVED: SMART EVIDENCE RIBBON */}

      </div>

      {/* Action Bar - Optimized Liquid Glass effect */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-sm z-30 pointer-events-none">
          <div className={`flex items-center justify-around p-1.5 rounded-full border shadow-2xl backdrop-blur-[32px] saturate-[1.8] pointer-events-auto transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-[#020617]/70 border-white/10 shadow-black/60' : 'bg-white/60 border-white/60 shadow-blue-200/40'}`}>
              
              {/* Button 1: Bookmark */}
              <button onClick={(e) => { e.stopPropagation(); onToggleSave(article); }} className={`p-2.5 rounded-full transition-all active:scale-90 ${isSaved ? 'text-blue-500 bg-blue-500/20' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10'}`} title={t.library}>
                 {isSaved ? <BookmarkCheck size={16} strokeWidth={2.5} /> : <Bookmark size={16} strokeWidth={2} />}
              </button>

              {/* Button 2: Personal Note */}
              <button onClick={handleToggleNote} disabled={!isSaved} className={`p-2.5 rounded-full transition-all active:scale-90 ${!isSaved ? 'opacity-20 cursor-not-allowed' : (article.note || showNoteEditor ? 'text-amber-500 bg-amber-500/20' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10')}`} title={t.personalNote}>
                  <StickyNote size={16} />
              </button>

              {/* Button 3: Cite */}
              <button onClick={handleCite} className="p-2.5 rounded-full text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title={t.cite}>
                  <Quote size={16} />
              </button>

              {/* Button 4: Share */}
              <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-2.5 rounded-full text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <Share2 size={16} />
              </button>

              <div className="h-4 w-px bg-slate-400/20 mx-0.5"></div>

              {/* Button 5: AI Enhance (Groq/Llama 3) */}
              <button onClick={handleEnhance} disabled={isEnhancing} className={`p-2.5 rounded-full transition-all active:scale-90 ${viewMode === 'enhanced' ? 'text-amber-500 bg-amber-500/20' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10'}`} title={t.enhanceGroq}>
                  {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              </button>

              {/* Button 6: Visual Abstract Generation */}
              <button onClick={handleGenerateVisual} disabled={isGeneratingVisual} className={`p-2.5 rounded-full transition-all active:scale-90 ${visualError ? 'text-red-500 bg-red-500/20' : (article.visualAbstract ? 'text-blue-500 bg-blue-500/20' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10')}`} title={visualError ? "Generation Failed" : t.visualAbstract}>
                  {isGeneratingVisual ? <Loader2 size={16} className="animate-spin" /> : (visualError ? <AlertCircle size={16} /> : <ImageIcon size={16} />)}
              </button>

              {/* Button 7: AI Related Study Search */}
              <button onClick={handleShowRelated} className={`p-2.5 rounded-full transition-all ${showRelated ? 'text-purple-500 bg-purple-500/20' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10'}`} title={t.iaRelated}>
                  <Sparkles size={16} />
              </button>

              {/* Button 8: Evidence Flow (Download Cascade) */}
              <button onClick={handleEvidenceFlow} className={`p-2.5 rounded-full transition-all active:scale-90 text-indigo-500 hover:bg-black/5 dark:hover:bg-white/10`} title={t.fullTextTip}>
                  <Workflow size={16} />
              </button>

          </div>
          <AnimatePresence>
            {showRelated && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`mt-2 p-5 rounded-[2rem] border shadow-2xl backdrop-blur-3xl ${isDarkMode ? 'bg-slate-950/90 border-white/10' : 'bg-white/95 border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-3"><span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">{t.iaRelated}</span><button onClick={() => setShowRelated(false)}><X size={12}/></button></div>
                    <div className="space-y-3">
                        {loadingRelated ? <Loader2 className="animate-spin mx-auto text-blue-500" size={16} /> : relatedArticles.map((ra, idx) => (
                            <a key={idx} href={ra.url} target="_blank" rel="noreferrer" className="block p-2 rounded-xl hover:bg-blue-500/5 transition-colors group">
                                <h4 className="text-[11px] font-bold leading-tight group-hover:text-blue-500">{ra.title}</h4>
                                <div className="flex justify-between mt-1 opacity-40 text-[8px] uppercase font-black"><span>{ra.source}</span><span>{ra.relevanceScore}% Match</span></div>
                            </a>
                        ))}
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
};

export default ArticleCard;
