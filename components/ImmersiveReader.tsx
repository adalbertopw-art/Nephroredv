
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronUp, Calendar, Users, BookOpen, Highlighter, StickyNote, Plus, Trash2, Check, Copy, Image as ImageIcon, Activity, Type, Link as LinkIcon } from 'lucide-react';
import { Article, FontStyle } from '../types';
import { highlightMedicalText } from '../utils/semanticHighlighter';
import { applyUserHighlights, CitationHeat } from './ArticleCard';
import MermaidDiagram from './MermaidDiagram';
import { motion, AnimatePresence } from 'framer-motion';

interface ImmersiveReaderProps {
  article: Article | null;
  onClose: () => void;
  isDarkMode: boolean;
  onUpdateNote?: (articleId: string, note: string) => void;
  onAddHighlight?: (articleId: string, text: string) => void;
  onRemoveHighlight?: (articleId: string, index: number) => void;
  onUpdateReadingStatus?: (articleId: string, status: 'completed') => void;
  fontStyle?: FontStyle;
}

const ImmersiveReader: React.FC<ImmersiveReaderProps> = ({ 
  article, 
  onClose, 
  isDarkMode, 
  onUpdateNote, 
  onAddHighlight, 
  onRemoveHighlight, 
  onUpdateReadingStatus,
  fontStyle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const touchStartY = useRef(0);
  const [imageError, setImageError] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeFont, setActiveFont] = useState<FontStyle>(fontStyle || 'serif');
  const [showFontMenu, setShowFontMenu] = useState(false);
  
  // Selection State
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  
  // Auto-Read Logic Refs
  const minTimePassed = useRef(false);
  const hasMarkedRead = useRef(false);
  
  useEffect(() => {
      if (article) {
          document.body.style.overflow = 'hidden';
          const timer = setTimeout(() => {
              minTimePassed.current = true;
          }, 5000);
          return () => {
              document.body.style.overflow = '';
              clearTimeout(timer);
          };
      } else {
          document.body.style.overflow = '';
      }
  }, [article]);

  useEffect(() => {
      if (fontStyle) setActiveFont(fontStyle);
  }, [fontStyle]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const text = sel.toString().trim();
        
        if (text.length > 0) {
            setSelection({
                text,
                x: rect.left + rect.width / 2,
                y: rect.top - 10
            });
        }
    } else {
        setSelection(null);
    }
  }, []);

  const addSelectionToHighlights = (color: string = 'yellow') => {
    if (selection && article && onAddHighlight) {
        const payload = color === 'yellow' ? selection.text : `${selection.text}:::${color}`;
        onAddHighlight(article.id, payload);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
        if (navigator.vibrate) navigator.vibrate(10);
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
        if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY.current;
      
      if (isAtBottom && deltaY < -50) {
          setSwipeCount(prev => prev + 1);
          if (swipeCount >= 1) {
              onClose();
          } else {
              if (navigator.vibrate) navigator.vibrate(50);
          }
      } else {
          if (!isAtBottom) {
              setSwipeCount(0);
          }
      }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      
      // Update Progress Bar
      const totalScroll = scrollHeight - clientHeight;
      const currentProgress = totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0;
      setScrollProgress(currentProgress);

      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
      if (!isAtBottom) {
          setSwipeCount(0);
      }

      if (!hasMarkedRead.current && minTimePassed.current && article && onUpdateReadingStatus) {
          if (scrollHeight - scrollTop - clientHeight < 200) {
              hasMarkedRead.current = true;
              onUpdateReadingStatus(article.id, 'completed');
              if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
          }
      }
  };

  if (!article) return null;

  const rawAbstractContent = highlightMedicalText(article.summary, isDarkMode);
  const abstractWithHighlights = applyUserHighlights(rawAbstractContent, article.highlights || [], isDarkMode);

  const glassButtonStyle = `p-3 rounded-full transition-all duration-300 backdrop-blur-md ${
    isDarkMode 
      ? 'bg-slate-800/50 text-white hover:bg-slate-700 border border-white/10' 
      : 'bg-white/50 text-slate-900 shadow-sm hover:bg-white border border-white/40'
  }`;

  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    modern: 'font-modern'
  }[activeFont];

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-0 z-[100] flex items-center justify-center sm:p-4 md:p-6 backdrop-blur-3xl ${isDarkMode ? 'bg-slate-950/80' : 'bg-slate-200/50'}`}
        onMouseUp={handleMouseUp}
    >
        {/* Floating Selection Toolbar */}
        <AnimatePresence>
            {selection && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    style={{ 
                        position: 'fixed', 
                        left: selection.x, 
                        top: selection.y, 
                        transform: 'translate(-50%, -100%)',
                        zIndex: 1000 
                    }}
                    className={`flex items-center gap-1 p-1 rounded-2xl border shadow-2xl backdrop-blur-xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex gap-1 p-1 border-r border-slate-200 dark:border-slate-700">
                        <button onClick={() => addSelectionToHighlights('yellow')} className="w-6 h-6 rounded-full bg-yellow-400 hover:scale-110 transition-transform"></button>
                        <button onClick={() => addSelectionToHighlights('green')} className="w-6 h-6 rounded-full bg-emerald-400 hover:scale-110 transition-transform"></button>
                        <button onClick={() => addSelectionToHighlights('red')} className="w-6 h-6 rounded-full bg-rose-400 hover:scale-110 transition-transform"></button>
                    </div>
                    <button 
                        onClick={() => addSelectionToHighlights('yellow')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        <Highlighter size={16} />
                    </button>
                    <div className={`w-px h-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <button 
                        onClick={addSelectionToNote}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-100 text-amber-600'}`}
                    >
                        <StickyNote size={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Right Vertical Action Bar (Close, Typography, Notes) */}
        <div className="absolute top-6 right-6 z-[110] flex flex-col gap-3">
            
            {/* 1. Close Button */}
            <button 
                onClick={onClose} 
                className={glassButtonStyle}
                title="Cerrar"
            >
                <X size={24} />
            </button>

            {/* 2. Typography Button */}
            <div className="relative">
                <button 
                    onClick={() => setShowFontMenu(!showFontMenu)} 
                    className={glassButtonStyle}
                    title="Tipografía"
                >
                    <Type size={24} />
                </button>
                {showFontMenu && (
                    <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`absolute top-0 right-full mr-2 p-2 rounded-2xl shadow-xl border w-40 overflow-hidden ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
                    >
                        <button 
                            onClick={() => { setActiveFont('serif'); setShowFontMenu(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-serif text-lg hover:bg-black/5 dark:hover:bg-white/5 ${activeFont === 'serif' ? 'text-blue-500' : ''}`}
                        >
                            Serif
                        </button>
                        <button 
                            onClick={() => { setActiveFont('sans'); setShowFontMenu(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-sans text-lg hover:bg-black/5 dark:hover:bg-white/5 ${activeFont === 'sans' ? 'text-blue-500' : ''}`}
                        >
                            Sans
                        </button>
                        <button 
                            onClick={() => { setActiveFont('modern'); setShowFontMenu(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-modern text-lg hover:bg-black/5 dark:hover:bg-white/5 ${activeFont === 'modern' ? 'text-blue-500' : ''}`}
                        >
                            Modern
                        </button>
                    </motion.div>
                )}
            </div>

            {/* 3. Notes Button */}
            <button 
                onClick={() => setShowNotes(!showNotes)} 
                className={`${showNotes ? 'p-3 rounded-full bg-amber-500 text-white shadow-lg transition-all duration-300' : glassButtonStyle}`}
                title="Notas"
            >
                <StickyNote size={24} />
            </button>
        </div>

        <div className="flex h-full w-full max-w-6xl gap-6">
            <div 
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onScroll={handleScroll}
                className={`flex-1 h-full sm:rounded-[2.5rem] shadow-2xl overflow-y-auto no-scrollbar relative flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-200 border border-slate-800' : 'bg-white text-slate-900 border border-white/60'}`}
            >
                {/* Reading Progress Bar */}
                <div className="sticky top-0 left-0 right-0 h-1 z-50 bg-transparent">
                    <motion.div 
                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${scrollProgress}%` }}
                        layoutId="readingProgress"
                    />
                </div>

                {/* Header / Masthead */}
                <div className={`relative shrink-0 overflow-hidden min-h-[20rem] md:min-h-[24rem] flex flex-col justify-end p-8 md:p-12 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <div className={`absolute inset-0 opacity-[0.07] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] ${isDarkMode ? 'invert' : ''}`}></div>
                    <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? 'from-slate-950 via-slate-900/90 to-slate-900/20' : 'from-white via-white/90 to-blue-50/20'}`}></div>
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-600 text-white border-blue-600'}`}>
                                {article.category}
                            </span>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white/60 border-slate-200 text-slate-600'}`}>
                                <CitationHeat score={article.relevanceScore} isDarkMode={isDarkMode} />
                                <span className="text-[10px] font-bold">{article.relevanceScore}% Impact</span>
                            </div>
                        </div>

                        <h1 className={`text-3xl md:text-5xl ${fontClass} font-black tracking-tight leading-[1.1] opacity-95 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {article.title}
                        </h1>
                        
                        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            <Calendar size={14} />
                            <span>{article.date}</span>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className={`px-6 py-10 md:px-16 md:py-12 max-w-3xl mx-auto w-full flex-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                    
                    {/* IMPACT CAPSULE IN IMMERSIVE */}
                    {article.clinicalTldr && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`mb-12 p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${isDarkMode ? 'bg-blue-900/10 border-blue-500/30' : 'bg-blue-50/50 border-blue-200 shadow-xl'}`}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                                    <Activity size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Cápsula de Impacto Clínico</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">¿Qué cambió?</span>
                                    <p className="text-base font-bold leading-snug">{article.clinicalTldr.change}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">¿A quién aplica?</span>
                                    <p className="text-base font-bold leading-snug">{article.clinicalTldr.population}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ASSOCIATED PUBLICATIONS SECTION IN IMMERSIVE */}
                    {article.associatedPublications && article.associatedPublications.length > 0 && (
                        <div className={`mb-12 p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <LinkIcon size={16} />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-widest opacity-70">
                                    Publicaciones Derivadas / Resultados
                                </h4>
                            </div>
                            <ul className="space-y-3">
                                {article.associatedPublications.map((pub, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm leading-relaxed opacity-90">
                                        <span className="text-blue-500 mt-1.5">•</span>
                                        <span dangerouslySetInnerHTML={{ __html: pub.replace(/(PMID:\s*\d+)/, '<span class="font-mono text-[10px] bg-blue-100 dark:bg-blue-900 px-1.5 rounded-md mx-1">$1</span>') }}></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Art Image in Reader */}
                    {article.imageUrl && !imageError && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-12 rounded-[2rem] overflow-hidden border shadow-xl bg-slate-100 dark:bg-slate-800"
                        >
                            <img 
                                src={article.imageUrl} 
                                alt="Figura principal" 
                                onError={() => setImageError(true)}
                                className="w-full h-auto max-h-[500px] object-contain"
                            />
                            <div className={`px-6 py-3 border-t flex items-center justify-between opacity-50 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <ImageIcon size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Evidencia Visual</span>
                                </div>
                                <span className="text-[9px] font-medium">{article.source}</span>
                            </div>
                        </motion.div>
                    )}

                    <div className="flex items-center gap-3 mb-8">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                            <BookOpen size={20} />
                        </div>
                        <h2 className={`text-xl md:text-2xl font-sans font-bold leading-tight ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                            {article.source}
                        </h2>
                    </div>

                    <div className={`flex items-center gap-2 text-sm mb-10 pb-8 border-b border-dashed ${isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
                        <Users size={16} />
                        <span className="font-medium italic">{article.authors || 'Unknown Authors'}</span>
                    </div>

                    {article.visualAbstract && (
                        <div className={`mb-12 rounded-3xl border overflow-hidden shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`px-6 py-3 border-b text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                <span>AI Visual Abstract</span>
                                <span className="text-blue-500">Mermaid.js</span>
                            </div>
                            <MermaidDiagram chart={article.visualAbstract} isDarkMode={isDarkMode} />
                        </div>
                    )}

                    <div className={`text-lg md:text-xl leading-loose ${fontClass} text-justify selection:bg-blue-500/30 dark:selection:bg-blue-500/50 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {abstractWithHighlights}
                    </div>

                    {/* Footer Exit Indicator */}
                    <div className="mt-32 pb-16 flex flex-col items-center justify-center space-y-4">
                        <div className={`${glassButtonStyle} ${swipeCount > 0 ? (isDarkMode ? 'bg-blue-600/80 border-blue-400' : 'bg-blue-500/80 text-white border-blue-400 shadow-xl') : ''}`}>
                             <ChevronUp size={28} className={swipeCount > 0 ? "animate-bounce" : ""} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-opacity duration-300 ${swipeCount > 0 ? 'opacity-100' : 'opacity-40'}`}>
                            {swipeCount > 0 ? "Desliza de nuevo para cerrar" : "Fin del Artículo"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sidebar Notes & Highlights */}
            <AnimatePresence>
                {showNotes && (
                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        className={`hidden lg:flex flex-col w-80 h-full p-6 rounded-[2.5rem] border shadow-2xl backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-xs uppercase tracking-widest opacity-50">Notas & Hallazgos</h3>
                            <button onClick={() => setShowNotes(false)} className={glassButtonStyle}><X size={16}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
                            <section>
                                <div className="flex items-center gap-2 mb-3 text-amber-500">
                                    <StickyNote size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Anotaciones</span>
                                </div>
                                <textarea 
                                    value={article.note || ''}
                                    onChange={(e) => onUpdateNote && onUpdateNote(article.id, e.target.value)}
                                    placeholder="Escribe tus observaciones clínicas..."
                                    className={`w-full h-40 bg-transparent outline-none resize-none text-sm leading-relaxed ${isDarkMode ? 'text-amber-200' : 'text-slate-800'}`}
                                />
                            </section>

                            <section>
                                <div className="flex items-center gap-2 mb-3 text-blue-500">
                                    <Highlighter size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Resaltados ({article.highlights?.length || 0})</span>
                                </div>
                                <div className="space-y-3">
                                    {article.highlights?.map((h, i) => {
                                        const [text] = h.includes(':::') ? h.split(':::') : [h];
                                        return (
                                            <div key={i} className={`p-3 rounded-xl text-xs relative group ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                                <p className="italic line-clamp-3">"{text}"</p>
                                                <button 
                                                    onClick={() => onRemoveHighlight && onRemoveHighlight(article.id, i)}
                                                    className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {(!article.highlights || article.highlights.length === 0) && (
                                        <p className="text-[10px] opacity-40 italic">Selecciona texto para resaltar</p>
                                    )}
                                </div>
                            </section>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Mobile Notes Sheet */}
        <AnimatePresence>
            {showNotes && (
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className={`fixed inset-x-0 bottom-0 z-[120] p-6 lg:hidden rounded-t-[3rem] shadow-2xl border-t backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}
                >
                    <div className="w-12 h-1.5 bg-slate-400/20 rounded-full mx-auto mb-6" />
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-xs uppercase tracking-widest opacity-50">Notas Clínicas</h3>
                        <button onClick={() => setShowNotes(false)} className={glassButtonStyle}><X size={20}/></button>
                    </div>
                    <textarea 
                        autoFocus
                        value={article.note || ''}
                        onChange={(e) => onUpdateNote && onUpdateNote(article.id, e.target.value)}
                        placeholder="Observaciones..."
                        className={`w-full h-32 bg-transparent outline-none resize-none text-base leading-relaxed ${isDarkMode ? 'text-amber-200' : 'text-slate-800'}`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
  );
};

export default ImmersiveReader;