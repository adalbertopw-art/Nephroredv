import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, WifiOff, FileText, Globe, Loader2, Zap, Palette, Check, ArrowLeft, Download, CheckCircle2 } from 'lucide-react';
import { Article } from '../types';
import { openExternalUrl } from '../services/browserService';
import { motion } from 'framer-motion';

interface OfflineReaderProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  htmlContent: string;
  isDarkMode: boolean;
  isLoading?: boolean;
  onUpdateReadingStatus?: (articleId: string, status: 'completed') => void;
  onSaveOffline?: (article: Article, html: string) => void;
  isAlreadyDownloaded?: boolean;
}

type ReaderTheme = 'light' | 'dark' | 'cream' | 'sepia';

const OfflineReader: React.FC<OfflineReaderProps> = ({ isOpen, onClose, article, htmlContent, isDarkMode, isLoading = false, onUpdateReadingStatus, onSaveOffline, isAlreadyDownloaded = false }) => {
  const [viewMode, setViewMode] = useState<'web' | 'reader'>('reader');
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(isDarkMode ? 'dark' : 'light');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Auto-Read Logic Refs
  const minTimePassed = useRef(false);
  const hasMarkedRead = useRef(false);

  useEffect(() => {
      setReaderTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, isOpen]);

  useEffect(() => {
      if (isOpen && article) {
          minTimePassed.current = false;
          hasMarkedRead.current = false;
          const timer = setTimeout(() => {
              minTimePassed.current = true;
          }, 5000);
          return () => clearTimeout(timer);
      }
  }, [isOpen, article]);

  useEffect(() => {
      if (!isLoading && isOpen && (!htmlContent || htmlContent.length < 500) && article?.url) {
          setViewMode('web');
      } else {
          setViewMode('reader');
      }
  }, [isLoading, htmlContent, article, isOpen]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
              setShowThemeMenu(false);
          }
      };
      if (showThemeMenu) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemeMenu]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      
      // Update Progress
      const totalScroll = scrollHeight - clientHeight;
      const currentProgress = totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0;
      setScrollProgress(currentProgress);

      if (!hasMarkedRead.current && minTimePassed.current && article && onUpdateReadingStatus) {
          if (scrollHeight - scrollTop - clientHeight < 150) {
              hasMarkedRead.current = true;
              onUpdateReadingStatus(article.id, 'completed');
              if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
          }
      }
  };

  if (!isOpen || !article) return null;

  const doiMatch = article.url?.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9a-zA-Z]+/i);
  const doi = doiMatch ? doiMatch[0] : null;
  const externalLinkUrl = doi ? `https://doi.org/${doi}` : article.url;

  const getThemeStyles = (theme: ReaderTheme) => {
      switch(theme) {
          case 'dark': return 'bg-slate-950 text-slate-300';
          case 'cream': return 'bg-[#F5E6D3] text-[#433422]';
          case 'sepia': return 'bg-[#e8dcc4] text-[#433422]';
          case 'light': 
          default: return 'bg-white text-slate-900';
      }
  };

  const getProseClass = (theme: ReaderTheme) => {
      if (theme === 'dark') return 'prose-invert';
      return '';
  };

  const isFullContent = htmlContent && htmlContent.length > 1000;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-500 animate-in slide-in-from-bottom-5 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
      
      {/* Header with Navigation */}
      <div className={`flex items-center justify-between p-4 border-b h-16 ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-xl sticky top-0 z-50`}>
        <div className="flex items-center gap-3 flex-1 mr-4 overflow-hidden">
             <button onClick={onClose} className={`p-2.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <ArrowLeft size={20} />
             </button>
             <div className="flex flex-col min-w-0">
                 <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${isLoading ? 'bg-blue-500 text-white animate-pulse' : (isAlreadyDownloaded ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white')}`}>
                        {isLoading ? 'ANALYZING' : (isAlreadyDownloaded ? 'OFFLINE READY' : 'LIVE VIEW')}
                    </span>
                    <span className="text-[10px] opacity-50 font-bold truncate uppercase tracking-widest">{article.source}</span>
                 </div>
                 <h2 className={`text-xs md:text-sm font-black truncate max-w-md ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{article.title}</h2>
             </div>
        </div>

        <div className="flex gap-2 items-center">
            {!isLoading && (
                <>
                    {/* Botón Guardar Offline */}
                    {isFullContent && onSaveOffline && (
                        <button 
                            onClick={() => onSaveOffline(article, htmlContent)}
                            disabled={isAlreadyDownloaded}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isAlreadyDownloaded ? 'text-emerald-500 bg-emerald-500/10' : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-900 text-white hover:bg-black')}`}
                        >
                            {isAlreadyDownloaded ? <><CheckCircle2 size={14} /> Saved</> : <><Download size={14} /> Download Offline</>}
                        </button>
                    )}

                    <button 
                        onClick={() => openExternalUrl(externalLinkUrl, isDarkMode)}
                        className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-lg ${isDarkMode ? 'bg-blue-600 text-white shadow-blue-900/20' : 'bg-blue-600 text-white shadow-blue-200/40'}`}
                    >
                        <Globe size={14} /> Open Original
                    </button>
                    
                    <div className={`flex rounded-xl p-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button onClick={() => setViewMode('reader')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'reader' ? (isDarkMode ? 'bg-slate-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-400'}`}>
                            <FileText size={18} />
                        </button>
                        <button onClick={() => setViewMode('web')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'web' ? (isDarkMode ? 'bg-slate-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-400'}`}>
                            <Globe size={18} />
                        </button>
                    </div>

                    {viewMode === 'reader' && (
                        <div className="relative" ref={themeMenuRef}>
                            <button onClick={() => setShowThemeMenu(!showThemeMenu)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                <Palette size={18} />
                            </button>
                            {showThemeMenu && (
                                <div className={`absolute top-full right-0 mt-2 p-3 rounded-2xl shadow-2xl border w-48 z-50 animate-in zoom-in-95 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['light', 'dark', 'cream', 'sepia'] as ReaderTheme[]).map(t => (
                                            <button key={t} onClick={() => setReaderTheme(t)} className={`h-10 rounded-lg border flex items-center justify-center font-bold ${readerTheme === t ? 'ring-2 ring-blue-500' : ''} ${t === 'dark' ? 'bg-slate-900 text-white' : (t === 'cream' ? 'bg-[#F5E6D3] text-[#433422]' : (t === 'sepia' ? 'bg-[#e8dcc4] text-[#433422]' : 'bg-white text-black'))}`}>Aa</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-16 left-0 right-0 h-1 z-40 bg-transparent pointer-events-none">
          <motion.div 
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${scrollProgress}%` }}
            layoutId="offlineProgress"
          />
      </div>

      {/* Main Container */}
      <div className="flex-grow w-full h-full relative overflow-hidden" onScroll={viewMode === 'reader' ? handleScroll : undefined}>
         {isLoading ? (
             <div className={`w-full h-full flex flex-col items-center justify-center space-y-6 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
                 <div className="relative">
                     <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                     <Loader2 size={48} className="animate-spin text-blue-600 relative z-10" />
                 </div>
                 <div className="text-center">
                     <p className="font-black text-xl tracking-tight uppercase">Analizando Acceso Directo</p>
                     <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Intentando motor JINA AI / Unpaywall...</p>
                 </div>
             </div>
         ) : (
             viewMode === 'web' ? (
                 <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                     <iframe src={article.url} title="Web View" className="w-full h-full border-0 bg-white" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" />
                     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 bg-black/80 backdrop-blur-xl text-white rounded-2xl flex items-center gap-4 shadow-2xl border border-white/10 max-w-xs text-center">
                         <div className="flex-1">
                             <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Dificultad de carga?</p>
                             <button onClick={() => openExternalUrl(externalLinkUrl, isDarkMode)} className="bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">Abrir en Navegador Externo</button>
                         </div>
                     </div>
                 </div>
             ) : (
                 <div className={`w-full h-full overflow-y-auto p-6 md:p-12 transition-colors duration-300 ${getThemeStyles(readerTheme)}`} onScroll={handleScroll}>
                     <div className={`max-w-3xl mx-auto prose prose-sm md:prose-lg transition-colors duration-300 ${getProseClass(readerTheme)}`}>
                         <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                         <div className="mt-20 pt-10 border-t opacity-40 text-center pb-20">
                             <p className="text-xs uppercase font-black tracking-widest">Fin del Artículo • NephroUpdate IA</p>
                             <button onClick={() => openExternalUrl(externalLinkUrl, isDarkMode)} className="mt-4 text-blue-500 font-bold text-xs uppercase underline">Ver Fuente Original</button>
                         </div>
                     </div>
                 </div>
             )
         )}
      </div>
    </div>
  );
};

export default OfflineReader;