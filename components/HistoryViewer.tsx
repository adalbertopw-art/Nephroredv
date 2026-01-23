
import React from 'react';
import { X, Calendar, Clock, Search, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { HistorySnapshot, Article, Language, TextSize, FontStyle } from '../types';
import ArticleCard from './ArticleCard';

interface HistoryViewerProps {
  snapshot: HistorySnapshot;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleSave: (article: Article) => void;
  savedArticles: Article[];
  language: Language;
  textSize: TextSize;
  fontStyle?: FontStyle;
  apiKey: string;
  groqApiKey: string;
  offlineStatus: Record<string, boolean>;
  onReadOffline: (id: string) => void;
  onReadFullText: (article: Article) => void; // New Prop
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({
  snapshot,
  onClose,
  isDarkMode,
  onToggleSave,
  savedArticles,
  language,
  textSize,
  fontStyle,
  apiKey,
  groqApiKey,
  offlineStatus,
  onReadOffline,
  onReadFullText
}) => {
  const isSession = snapshot.sessionQueries && snapshot.sessionQueries.length > 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 animate-in slide-in-from-bottom-10 fade-in duration-300">
      
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md`}>
        <div className="flex flex-col flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
                {isSession ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                        <Layers size={10} /> {language === 'es' ? 'SESIÓN DE INVESTIGACIÓN' : 'RESEARCH SESSION'}
                    </span>
                ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        HISTORIAL
                    </span>
                )}
                <span className={`text-xs font-medium flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Clock size={10} /> {new Date(snapshot.timestamp).toLocaleString()}
                </span>
            </div>
            
            <h2 className={`text-lg font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {snapshot.topic}
            </h2>
            
            {/* Session Breadcrumbs / Path */}
            {isSession && snapshot.sessionQueries ? (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                    {snapshot.sessionQueries.map((q, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <ArrowRight size={10} className="opacity-30" />}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                {q}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            ) : (
                snapshot.query && <p className="opacity-50 text-xs font-medium mt-1">"{snapshot.query}"</p>
            )}
        </div>
        <button 
          onClick={onClose}
          className={`p-2 rounded-full transition-colors flex-shrink-0 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
         <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Snapshot Summary */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                    <h3 className={`font-bold text-sm uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {isSession ? (language === 'es' ? 'Síntesis de la Sesión' : 'Session Synthesis') : (language === 'es' ? 'Resumen Registrado' : 'Snapshot Summary')}
                    </h3>
                </div>
                <div className={`prose max-w-none text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {snapshot.summary.split('\n').map((para, i) => (
                        <p key={i} className="mb-2 last:mb-0">{para}</p>
                    ))}
                </div>
            </div>

            {/* Articles Grid */}
            <div>
                <h3 className={`font-black text-sm uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'es' ? `Evidencia Recopilada (${snapshot.articles.length})` : `Evidence Collected (${snapshot.articles.length})`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {snapshot.articles.map((article) => (
                        <ArticleCard 
                            key={article.id} 
                            article={article} 
                            isSaved={savedArticles.some(a => a.id === article.id)} 
                            onToggleSave={onToggleSave}
                            language={language}
                            textSize={textSize}
                            fontStyle={fontStyle}
                            isDarkMode={isDarkMode}
                            groqApiKey={groqApiKey}
                            isDownloaded={!!offlineStatus[article.id]}
                            offlineStatus={offlineStatus[article.id] ? 'full' : undefined}
                            onReadOffline={onReadOffline}
                            onReadFullText={onReadFullText}
                        />
                    ))}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default HistoryViewer;