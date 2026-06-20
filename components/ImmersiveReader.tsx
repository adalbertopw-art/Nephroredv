
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronUp, Calendar, Users, BookOpen, Highlighter, StickyNote, Plus, Trash2, Check, Copy, Image as ImageIcon, Activity, Type, Link as LinkIcon, FileText, MessageSquare, BarChart2, Zap, Flame, AlertTriangle, ShieldCheck, AlertCircle, FileText as PdfIcon, Download, ExternalLink, MessageCircle, Paperclip, Unlock, Lock } from 'lucide-react';
import { Article, FontStyle, DeepAnalysisResult } from '../types';
import { getJournalLogo } from '../constants/journalLogos';
import { highlightMedicalText } from '../utils/semanticHighlighter';
import { applyUserHighlights, CitationHeat } from './ArticleCard';
import MermaidDiagram from './MermaidDiagram';
import PdfViewer from './PdfViewer';
import ArticleChat from './ArticleChat';
import SocialJournalClub from './SocialJournalClub';
import { generateDeepAnalysis } from '../services/geminiService';
import { fetchArticleReferences } from '../services/semanticScholarService';
import { motion, AnimatePresence } from 'framer-motion';

interface ImmersiveReaderProps {
  article: Article | null;
  onClose: () => void;
  isDarkMode: boolean;
  onUpdateNote?: (articleId: string, note: string) => void;
  onAddHighlight?: (articleId: string, text: string) => void;
  onRemoveHighlight?: (articleId: string, index: number) => void;
  onUpdateReadingStatus?: (articleId: string, status: 'completed') => void;
  onProposeDebate?: (article: Article) => void;
  onUpdateArticle?: (article: Article) => void;
  fontStyle?: FontStyle;
  language?: 'es' | 'en';
  geminiApiKey?: string;
  onOpenAuth?: () => void;
}

type Tab = 'text' | 'pdf' | 'web' | 'chat' | 'analysis' | 'club' | 'references';

const ImmersiveReader: React.FC<ImmersiveReaderProps> = ({ 
  article, 
  onClose, 
  isDarkMode, 
  onUpdateNote, 
  onAddHighlight, 
  onRemoveHighlight, 
  onUpdateReadingStatus,
  onProposeDebate,
  onUpdateArticle,
  fontStyle,
  language = 'es',
  geminiApiKey,
  onOpenAuth
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [activeFont, setActiveFont] = useState<FontStyle>(fontStyle || 'serif');
  const [showFontMenu, setShowFontMenu] = useState(false);
  
  const [swipeCount, setSwipeCount] = useState(0);
  const touchStartY = useRef(0);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [isAuthorsExpanded, setIsAuthorsExpanded] = useState(false);
  const lastScrollY = useRef(0);
  
  const [analysisData, setAnalysisData] = useState<DeepAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // References State
  const [references, setReferences] = useState<Article[]>([]);
  const [isFetchingReferences, setIsFetchingReferences] = useState(false);
  const [hasFetchedReferences, setHasFetchedReferences] = useState(false);

  const journalLogo = getJournalLogo(article?.source || '');

  const translations = {
    es: {
      authors: 'Autores & Afiliaciones',
      saveNote: 'Nota',
      fontMenu: 'Fuente',
      markAsRead: 'Marcar como Leído',
      studyData: 'Datos del Estudio',
      published: 'Publicado',
      journal: 'Revista',
      source: 'Fuente Original',
      attachPdf: 'Adjuntar PDF Local',
      noPdfFound: 'No se encontró archivo PDF.',
      abstract: 'Abstract (Original)',
      fullText: 'Cuerpo del Documento',
      personalNotes: 'Notas Clínicas Privadas',
      writeNote: 'Escribe tu observación o resumen aquí...',
      highlights: 'Texto Resaltado',
      runAnalysis: 'Generar Análisis Profundo Groq/Gemini',
      analyzing: 'Analizando evidencia profunda...',
      analysisTitle: 'Groq AI - Análisis Crítico',
      analysisTakeaway: 'Takeaway Clínico',
      close: 'Cerrar',
      tabs: {
        text: 'Texto',
        pdf: 'PDF',
        web: 'Web',
        chat: 'Chat',
        analysis: 'Análisis',
        club: 'Club',
        references: 'Referencias'
      }
    },
    en: {
      authors: 'Authors & Affiliations',
      saveNote: 'Note',
      fontMenu: 'Font',
      markAsRead: 'Mark as Read',
      studyData: 'Study Data',
      published: 'Published',
      journal: 'Journal',
      source: 'Original Source',
      attachPdf: 'Attach Local PDF',
      noPdfFound: 'No PDF file found.',
      abstract: 'Abstract (Original)',
      fullText: 'Document Body',
      personalNotes: 'Private Clinical Notes',
      writeNote: 'Write your observation or summary here...',
      highlights: 'Highlighted Text',
      runAnalysis: 'Generate Deep Groq/Gemini Analysis',
      analyzing: 'Analyzing deep evidence...',
      analysisTitle: 'Groq AI - Critical Analysis',
      analysisTakeaway: 'Clinical Takeaway',
      close: 'Close',
      tabs: {
        text: 'Text',
        pdf: 'PDF',
        web: 'Web',
        chat: 'Chat',
        analysis: 'Analysis',
        club: 'Club',
        references: 'References'
      }
    }
  };

  const t = translations[language];

  useEffect(() => {
    if (activeTab === 'references' && !hasFetchedReferences && article) {
        setIsFetchingReferences(true);
        fetchArticleReferences(article.id).then((refs) => {
            setReferences(refs);
            setHasFetchedReferences(true);
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            setIsFetchingReferences(false);
        });
    }
  }, [activeTab, article, hasFetchedReferences]);

  const displayImageUrl = (article && (!article.imageUrl || imageError))
    ? `https://picsum.photos/seed/${article.id}/1200/600?blur=2`
    : article?.imageUrl;

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && onUpdateArticle && article) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const base64 = e.target?.result as string;
              onUpdateArticle({ ...article, localPdfData: base64 });
          };
          reader.readAsDataURL(file);
      }
  };

  useEffect(() => {
      if (article) {
          document.body.style.overflow = 'hidden';
          setImageError(false);
          // Prioritize PDF if available and not explicitly set otherwise (could add logic here)
          if (article.localPdfData && activeTab === 'text') setActiveTab('pdf');
          return () => { document.body.style.overflow = ''; };
      }
  }, [article]);

  const handleMouseUp = useCallback(() => {
    if (activeTab !== 'text') { setSelection(null); return; }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const text = sel.toString().trim();
        if (text.length > 0) {
            setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 10 });
        }
    } else {
        setSelection(null);
    }
  }, [activeTab]);

  const addSelectionToHighlights = (color: string = 'yellow') => {
    if (selection && article && onAddHighlight) {
        const payload = color === 'yellow' ? selection.text : `${selection.text}:::${color}`;
        onAddHighlight(article.id, payload);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    }
  };

  const addSelectionToNote = () => {
    if (selection && article && onUpdateNote) {
        const currentNote = article.note || '';
        const newNote = currentNote + (currentNote ? '\n\n' : '') + `> ${selection.text}`;
        onUpdateNote(article.id, newNote);
        setShowNotes(true);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!containerRef.current || activeTab !== 'text') return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (isAtBottom && deltaY < -50) {
          setSwipeCount(prev => prev + 1);
          if (swipeCount >= 1) onClose();
      } else {
          setSwipeCount(0);
      }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (activeTab !== 'text') return;
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const totalScroll = scrollHeight - clientHeight;
      setScrollProgress(totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0);

      // Smart Scroll Logic
      if (scrollTop > lastScrollY.current + 10) {
          setIsScrollingDown(true);
      } else if (scrollTop < lastScrollY.current - 10) {
          setIsScrollingDown(false);
      }
      if (scrollTop <= 50) {
          setIsScrollingDown(false);
      }
      lastScrollY.current = scrollTop;
  };

  const runDeepAnalysis = async () => {
      if (!article || isAnalyzing || analysisData) return;
      setIsAnalyzing(true);
      const content = article.fullTextContent || article.summary;
      const result = await generateDeepAnalysis(article.title, content, geminiApiKey);
      if (result) setAnalysisData(result);
      setIsAnalyzing(false);
  };

  if (!article) return null;

  const rawAbstractContent = highlightMedicalText(article.summary, isDarkMode);
  const abstractWithHighlights = applyUserHighlights(rawAbstractContent, article.highlights || [], isDarkMode);
  const fontClass = { sans: 'font-sans', serif: 'font-serif', modern: 'font-modern' }[activeFont];

  // Resolve external URL (prefer DOI if available)
  const doiMatch = article.url?.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9a-zA-Z]+/i);
  const targetUrl = doiMatch ? `https://doi.org/${doiMatch[0]}` : article.url;

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-0 z-[110] flex flex-col backdrop-blur-3xl ${isDarkMode ? 'bg-slate-950/80' : 'bg-slate-50/80'}`}
        onMouseUp={handleMouseUp}
    >
        {/* Immersive Background Layer */}
        <div className="absolute inset-0 z-[-1] overflow-hidden opacity-10 saturate-[1.5] pointer-events-none">
            <img 
                src={displayImageUrl} 
                className="w-full h-full object-cover blur-3xl scale-110" 
                alt="" 
                referrerPolicy="no-referrer"
            />
        </div>
        {/* Selection Toolbar */}
        <AnimatePresence>
            {selection && activeTab === 'text' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    style={{ position: 'fixed', left: selection.x, top: selection.y, transform: 'translate(-50%, -100%)', zIndex: 1000 }}
                    className={`flex items-center gap-1 p-1.5 rounded-xl border shadow-2xl backdrop-blur-xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex gap-1.5 p-1 border-r border-slate-200 dark:border-slate-700 pr-2">
                        {['yellow', 'green', 'red'].map(c => (
                            <button key={c} onClick={() => addSelectionToHighlights(c)} className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${c === 'yellow' ? 'bg-amber-400' : c === 'green' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        ))}
                    </div>
                    <button onClick={addSelectionToNote} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-100 text-amber-600'}`}>
                        <StickyNote size={14} /> <span className="text-xs font-bold">Nota</span>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header (Sticky) - Always Visible */}
        <div className={`flex items-center justify-between px-4 h-14 border-b z-50 shrink-0 ${isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
            <div className="flex items-center gap-4 overflow-hidden">
                <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                    <X size={20} />
                </button>
                <div className="flex flex-col min-w-0 relative p-2 px-4 rounded-xl overflow-hidden group/header-meta">
                    {/* Cover Image Background */}
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={displayImageUrl} 
                            alt="" 
                            className="w-full h-full object-cover opacity-10 dark:opacity-20 saturate-[1.2]" 
                            referrerPolicy="no-referrer"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-r ${isDarkMode ? 'from-slate-950 via-slate-950/80' : 'from-white via-white/80'} to-transparent`}></div>
                    </div>

                    <div className="flex items-center gap-2 relative z-10">
                        {journalLogo && (
                            <div className="absolute -left-2 -top-1 -bottom-1 w-12 opacity-10 pointer-events-none overflow-hidden flex items-center justify-center">
                                <img src={journalLogo} alt="" className="max-w-full max-h-full object-contain grayscale" referrerPolicy="no-referrer" />
                            </div>
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 truncate relative z-10">{article.source}</span>
                    </div>
                    <div className="flex items-center gap-1.5 relative z-10 mt-1">
                        <h2 className="text-xs font-bold truncate max-w-[190px] md:max-w-[300px]">{article.title}</h2>
                        <button 
                            onClick={() => targetUrl && window.open(targetUrl, '_system', 'noopener,noreferrer')}
                            className={`p-1 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 ${article.localPdfData ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : (article.isFree ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-amber-500 bg-amber-50 dark:bg-amber-900/20')}`}
                            title={article.localPdfData ? 'PDF Local' : (article.isFree ? 'Open Access - Ir al PDF' : 'Closed Access - Ir a la fuente')}
                        >
                            {article.localPdfData ? <PdfIcon size={12} strokeWidth={2.5} /> : (article.isFree ? <Unlock size={12} strokeWidth={2.5} /> : <Lock size={12} strokeWidth={2.5} />)}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Desktop Tabs */}
                <div className={`hidden md:flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    {[
                        { id: 'text', label: t.tabs.text, icon: FileText },
                        { id: 'pdf', label: t.tabs.pdf, icon: PdfIcon, disabled: !article.localPdfData },
                        { id: 'web', label: t.tabs.web, icon: ExternalLink },
                        { id: 'chat', label: t.tabs.chat, icon: MessageSquare },
                        { id: 'analysis', label: t.tabs.analysis, icon: BarChart2 },
                        { id: 'club', label: t.tabs.club, icon: MessageCircle },
                        { id: 'references', label: t.tabs.references, icon: BookOpen }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as Tab)} 
                            disabled={tab.disabled}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                activeTab === tab.id 
                                    ? (isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {tab.id === 'pdf' && article.fullTextContent && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />}
                        </button>
                    ))}
                </div>
                
                {/* External Link Button (System Browser) */}
                <button 
                    onClick={() => targetUrl && window.open(targetUrl, '_system', 'noopener,noreferrer')}
                    className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Abrir en Navegador"
                >
                    <ExternalLink size={18} />
                </button>

                <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handlePdfUpload} />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Adjuntar PDF"
                >
                    <Paperclip size={18} />
                </button>

                {activeTab === 'text' && (
                    <div className="relative">
                        <button onClick={() => setShowFontMenu(!showFontMenu)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                            <Type size={18} />
                        </button>
                        {showFontMenu && (
                            <div className={`absolute top-full right-0 mt-2 w-32 p-1 rounded-xl border shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                {['sans', 'serif', 'modern'].map((f) => (
                                    <button key={f} onClick={() => { setActiveFont(f as FontStyle); setShowFontMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${activeFont === f ? 'text-blue-500' : ''}`}>{f}</button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-xl transition-all ${showNotes ? 'bg-amber-500 text-white' : (isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600')}`}>
                    <StickyNote size={18} />
                </button>
                
                {onProposeDebate && (
                    <button 
                        onClick={() => onProposeDebate(article)}
                        className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}
                        title={language === 'es' ? 'Proponer para Debate' : 'Propose for Debate'}
                    >
                        <MessageCircle size={18} />
                    </button>
                )}
            </div>
        </div>

        {/* Mobile Floating Bottom Bar - Glassmorphism */}
        <div className={`md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 p-1.5 rounded-full border shadow-2xl backdrop-blur-[40px] saturate-[2] transition-all duration-500 overflow-x-auto no-scrollbar max-w-[90vw] ${isScrollingDown ? 'opacity-0 pointer-events-none translate-y-20' : 'opacity-100 translate-y-0'}`} style={{ backgroundColor: isDarkMode ? 'rgba(2, 6, 23, 0.5)' : 'rgba(255, 255, 255, 0.5)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)' }}>
             {[
                { id: 'text', icon: FileText, label: t.tabs.text },
                { id: 'pdf', icon: PdfIcon, disabled: !article.localPdfData, label: t.tabs.pdf },
                { id: 'web', icon: ExternalLink, label: t.tabs.web },
                { id: 'chat', icon: MessageSquare, label: t.tabs.chat },
                { id: 'analysis', icon: BarChart2, label: t.tabs.analysis },
                { id: 'club', icon: MessageCircle, label: t.tabs.club },
                { id: 'references', icon: BookOpen, label: t.tabs.references }
            ].map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as Tab)} 
                    disabled={tab.disabled}
                    className={`relative p-3.5 rounded-full transition-all duration-300 disabled:opacity-20 disabled:grayscale ${
                        activeTab === tab.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110' 
                            : (isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100')
                    }`}
                >
                    <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                    {tab.id === 'pdf' && article.localPdfData && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                </button>
            ))}
        </div>

        {/* Content Area - Split Logic for PDF vs Text */}
        <div className="flex flex-1 overflow-hidden relative">
            
            {/* 1. TEXT VIEW (Scrollable) */}
            {activeTab === 'text' && (
                <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onScroll={handleScroll} className={`flex-1 overflow-y-auto no-scrollbar relative pb-24 md:pb-0 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
                    <div className="max-w-3xl mx-auto min-h-full">
                        <div className="sticky top-0 left-0 right-0 h-1 z-30 bg-transparent"><motion.div className="h-full bg-blue-500" style={{ width: `${scrollProgress}%` }} /></div>
                        
                        <div className={`p-8 pb-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${isDarkMode ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{article.category}</span>
                                <div className="flex items-center gap-1"><CitationHeat score={article.relevanceScore} isDarkMode={isDarkMode} /><span className="text-[10px] font-bold opacity-60">{article.relevanceScore}% Impact</span></div>
                            </div>
                            <h1 className={`text-2xl md:text-4xl ${fontClass} font-black leading-tight mb-4`}>{article.title}</h1>
                            <div className={`flex flex-col sm:flex-row sm:items-start flex-wrap gap-2 sm:gap-4 text-xs font-bold opacity-50 uppercase tracking-wider relative`}>
                                <span className="flex items-center gap-1 shrink-0 mt-0.5"><Calendar size={12}/> {article.date}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsAuthorsExpanded(!isAuthorsExpanded); }} 
                                    className={`flex items-start gap-1 hover:text-blue-500 transition-colors text-left w-full ${isAuthorsExpanded ? 'block' : 'max-h-6 overflow-hidden'}`}
                                >
                                    <Users size={12} className="shrink-0 mt-0.5" /> 
                                    <span className={isAuthorsExpanded ? "whitespace-normal break-words leading-relaxed inline" : "truncate w-full block"}>
                                        {isAuthorsExpanded ? (article.fullAuthors || article.authors || 'Unknown') : (article.authors || 'Unknown')}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className={`p-8 space-y-10 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                            {article.clinicalTldr && (
                                <div className={`p-6 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-blue-50/50 border-blue-100'}`}>
                                    <div className="flex items-center gap-2 mb-4 text-blue-500"><Zap size={18} fill="currentColor" /><span className="text-xs font-black uppercase tracking-widest">Impact Capsule</span></div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div><span className="text-[10px] font-black uppercase opacity-50 block mb-1">Cambio Práctico</span><p className="font-bold leading-snug">{article.clinicalTldr.change}</p></div>
                                        <div><span className="text-[10px] font-black uppercase opacity-50 block mb-1">Población</span><p className="font-bold leading-snug">{article.clinicalTldr.population}</p></div>
                                    </div>
                                </div>
                            )}

                            {article.imageUrl && !imageError && (
                                <div className="rounded-2xl overflow-hidden border dark:border-slate-800 shadow-2xl">
                                    <img 
                                        src={displayImageUrl} 
                                        onError={() => setImageError(true)} 
                                        className="w-full h-auto object-cover max-h-[500px]" 
                                        alt="Figure" 
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            )}

                            {article.visualAbstract && (
                                <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="px-4 py-2 border-b dark:border-slate-800 text-[10px] font-black uppercase tracking-widest opacity-50 flex justify-between"><span>AI Visual Abstract</span><span>Mermaid.js</span></div>
                                    <MermaidDiagram chart={article.visualAbstract} isDarkMode={isDarkMode} />
                                </div>
                            )}

                            <div className={`text-lg leading-loose ${fontClass} text-justify selection:bg-blue-500/30`}>
                                {abstractWithHighlights}
                            </div>

                            {(targetUrl || article.url) && (
                                <div className="mt-8 flex justify-center">
                                    <button
                                        onClick={() => setActiveTab('web')}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95 ${isDarkMode ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'}`}
                                    >
                                        <ExternalLink size={16} />
                                        {language === 'es' ? 'Leer Artículo Original en Web' : 'Read Full Original Web Article'}
                                    </button>
                                </div>
                            )}

                            <div className="pt-20 pb-32 flex flex-col items-center opacity-30">
                                <ChevronUp size={24} className={swipeCount > 0 ? "animate-bounce" : ""} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-2">{swipeCount > 0 ? "Release to Close" : "End of Article"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WEB VIEW (Iframe embedded) */}
            {activeTab === 'web' && (targetUrl || article.url) && (
                <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white pb-24 md:pb-0 relative">
                    {/* Header bar indicating it's the external web view */}
                    <div className="flex items-center justify-between p-2 px-4 shadow-sm z-10 sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-800">
                         <span className="text-xs font-bold uppercase flex items-center gap-2">
                              <ExternalLink size={14}/> Original Web View: {new URL(targetUrl || article.url).hostname}
                         </span>
                         <button 
                             onClick={() => window.open(targetUrl || article.url, '_system', 'noopener,noreferrer')}
                             className="text-xs font-bold bg-slate-200 px-3 py-1 rounded-md hover:bg-slate-300 transition-colors uppercase tracking-widest text-slate-700"
                         >
                             {language === 'es' ? 'Saltar al Navegador Externo' : 'Open in System Browser'}
                         </button>
                    </div>
                    {/* The iframe rendering the external URL via proxy to bypass Frame Options */}
                    <iframe 
                        src={`/api/html-iframe-proxy?url=${encodeURIComponent(targetUrl || article.url)}`}
                        className="w-full h-full border-none flex-1 bg-white"
                        title="Original Source"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                </div>
            )}

            {/* 2. PDF VIEW (Fixed Height) */}
            {activeTab === 'pdf' && article.localPdfData && (
                <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
                    <PdfViewer pdfData={article.localPdfData} isDarkMode={isDarkMode} />
                </div>
            )}

            {/* 3. CHAT VIEW */}
            {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col h-full w-full overflow-hidden pb-24 md:pb-0">
                    <ArticleChat article={article} apiKey={geminiApiKey} isDarkMode={isDarkMode} />
                </div>
            )}

            {/* 4. DEEP ANALYSIS VIEW */}
            {activeTab === 'analysis' && (
                <div className={`flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-0 p-6 md:p-12 ${isDarkMode ? 'text-slate-200 bg-slate-950' : 'text-slate-800 bg-white'}`}>
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <BarChart2 size={28} className="text-blue-500" /> Deep Analysis
                            </h2>
                            <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-2">Powered by Gemini 2.5 Pro • Methodological Assessment</p>
                        </div>

                        {!analysisData ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-6">
                                <div className={`p-8 rounded-full ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                                    <Activity size={48} className={`opacity-20 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                                </div>
                                <button 
                                    onClick={runDeepAnalysis} 
                                    disabled={isAnalyzing}
                                    className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} disabled:opacity-50`}
                                >
                                    {isAnalyzing ? 'Analyzing Evidence...' : 'Generate Deep Report'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className={`p-6 rounded-3xl border flex items-start gap-4 ${
                                    analysisData.biasRisk === 'Low' ? (isDarkMode ? 'bg-emerald-900/10 border-emerald-800' : 'bg-emerald-50 border-emerald-200') :
                                    analysisData.biasRisk === 'Moderate' ? (isDarkMode ? 'bg-amber-900/10 border-amber-800' : 'bg-amber-50 border-amber-200') :
                                    (isDarkMode ? 'bg-rose-900/10 border-rose-800' : 'bg-rose-50 border-rose-200')
                                }`}>
                                    <div className={`p-3 rounded-xl shrink-0 ${
                                        analysisData.biasRisk === 'Low' ? 'bg-emerald-500 text-white' :
                                        analysisData.biasRisk === 'Moderate' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                                    }`}>
                                        {analysisData.biasRisk === 'Low' ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">Risk of Bias</h3>
                                        <div className="text-xl font-black mb-2">{analysisData.biasRisk} Risk</div>
                                        <p className="text-sm font-medium leading-relaxed opacity-90">{analysisData.biasReason}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 ml-1">Quantitative Results</h3>
                                    <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                        <table className="w-full text-sm text-left">
                                            <thead className={`text-xs uppercase font-black ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                                <tr>
                                                    <th className="px-6 py-4">Group / Comparison</th>
                                                    <th className="px-6 py-4">Primary Outcome</th>
                                                    <th className="px-6 py-4">Significance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-slate-800">
                                                {analysisData.keyResults.map((res, i) => (
                                                    <tr key={i} className={`font-medium ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                                        <td className="px-6 py-4">{res.group}</td>
                                                        <td className="px-6 py-4">{res.outcome}</td>
                                                        <td className={`px-6 py-4 font-mono font-bold ${res.pValue.includes('<') || res.pValue.startsWith('0.00') ? 'text-emerald-500' : 'opacity-50'}`}>{res.pValue}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 ml-1">Methodological Limitations</h3>
                                    <div className="grid gap-3">
                                        {analysisData.limitations.map((lim, i) => (
                                            <div key={i} className={`flex gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                                <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                                <p className="text-sm font-medium">{lim}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 5. SOCIAL JOURNAL CLUB */}
            {activeTab === 'club' && (
                <div className="flex-1 flex flex-col h-full w-full overflow-hidden pb-24 md:pb-0">
                    <SocialJournalClub 
                        article={article} 
                        isDarkMode={isDarkMode} 
                        geminiApiKey={geminiApiKey} 
                        onOpenAuth={onOpenAuth}
                    />
                </div>
            )}

            {/* 6. REFERENCES VIEW */}
            {activeTab === 'references' && (
                <div className={`flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-0 p-6 md:p-12 ${isDarkMode ? 'text-slate-200 bg-slate-950' : 'text-slate-800 bg-white'}`}>
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <BookOpen size={28} className="text-emerald-500" /> {t.tabs.references}
                            </h2>
                            <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-2">Semantic Scholar Graph API</p>
                        </div>

                        {isFetchingReferences ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Activity size={32} className="animate-pulse text-emerald-500" />
                                <span className="text-xs font-black uppercase tracking-widest opacity-50">Localizando referencias...</span>
                            </div>
                        ) : references.length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <span className="text-sm font-bold uppercase tracking-widest">No se encontraron referencias o no hay acceso abierto.</span>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {references.map(ref => (
                                    <div key={ref.id} className={`p-6 rounded-3xl border text-left flex flex-col gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${isDarkMode ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{ref.category}</span>
                                            <span className="text-[10px] font-bold opacity-50">{ref.date}</span>
                                            {ref.isFree && <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Open Access</span>}
                                        </div>
                                        <h3 className="text-lg font-black leading-snug">{ref.title}</h3>
                                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest line-clamp-1">{ref.authors}</p>
                                        
                                        <div className="mt-2 flex-1 relative group/ref">
                                            <div className="text-sm leading-relaxed opacity-80 text-justify">
                                                {ref.summary}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t dark:border-slate-800 flex items-center justify-between">
                                            <button
                                                onClick={() => ref.url && window.open(ref.url, '_system', 'noopener,noreferrer')}
                                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${ref.url ? 'text-blue-500 hover:text-blue-600' : 'opacity-30 cursor-not-allowed'}`}
                                                title={ref.url ? "Fuente Original" : "Sin URL"}
                                            >
                                                <ExternalLink size={14} /> Link Original
                                            </button>
                                            {ref.pdfUrl && (
                                                <button 
                                                    onClick={() => window.open(ref.pdfUrl, '_system', 'noopener,noreferrer')}
                                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600"
                                                >
                                                    <PdfIcon size={14} /> PDF
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sidebar Notes Drawer */}
            <AnimatePresence>
                {showNotes && (
                    <motion.div 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
                        className={`absolute top-0 right-0 w-80 h-full border-l shadow-2xl z-40 flex flex-col backdrop-blur-3xl ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}
                    >
                        <div className="p-4 border-b flex justify-between items-center dark:border-slate-800">
                            <span className="text-xs font-black uppercase tracking-widest opacity-50">Personal Notes</span>
                            <button onClick={() => setShowNotes(false)}><X size={16}/></button>
                        </div>
                        <textarea 
                            value={article.note || ''} 
                            onChange={(e) => onUpdateNote && onUpdateNote(article.id, e.target.value)}
                            placeholder="Add your clinical observations..."
                            className="flex-1 w-full p-6 bg-transparent resize-none outline-none text-sm leading-relaxed" 
                        />
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Highlights</span>
                            <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                {article.highlights?.map((h, i) => (
                                    <div key={i} className="flex gap-2 text-[10px] p-2 rounded bg-white dark:bg-slate-900 border dark:border-slate-800">
                                        <div className={`w-1 shrink-0 rounded-full ${h.includes('red') ? 'bg-rose-400' : h.includes('green') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                        <p className="line-clamp-2 italic opacity-80">{h.split(':::')[0]}</p>
                                        <button onClick={() => onRemoveHighlight && onRemoveHighlight(article.id, i)} className="ml-auto opacity-30 hover:opacity-100"><Trash2 size={10}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </motion.div>
  );
};

export default ImmersiveReader;
