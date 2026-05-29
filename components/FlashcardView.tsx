import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Article, FontStyle, TextSize } from '../types';
import { X, ChevronLeft, ChevronRight, Bookmark, BookOpen, Share2, AlertCircle } from 'lucide-react';
import { generateDeepAnalysis } from '../services/geminiService';

interface FlashcardViewProps {
  articles: Article[];
  isDarkMode: boolean;
  onClose: () => void;
  onOpenImmersive: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  savedArticles: Article[];
  geminiApiKey?: string;
  fontStyle: FontStyle;
}

export default function FlashcardView({
  articles,
  isDarkMode,
  onClose,
  onOpenImmersive,
  onToggleSave,
  savedArticles,
  geminiApiKey,
  fontStyle
}: FlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [picoData, setPicoData] = useState<Record<string, { p: string, i: string, o: string }>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const article = articles[currentIndex];
  const fontClass = { sans: 'font-sans', serif: 'font-serif', modern: 'font-modern' }[fontStyle];

  useEffect(() => {
    if (!article) return;
    if (picoData[article.id]) return;

    const generatePico = async () => {
      setIsGenerating(true);
      try {
        if (geminiApiKey) {
          const analysis = await generateDeepAnalysis(article.title, article.summary, geminiApiKey);
          if (analysis) {
            setPicoData(prev => ({
              ...prev,
              [article.id]: {
                p: analysis.pico.patient,
                i: analysis.pico.intervention,
                o: analysis.pico.outcome
              }
            }));
            setIsGenerating(false);
            return;
          }
        }
        
        // Fallback heuristic if no API key or generation failed
        const sentences = article.summary.split('. ').filter(s => s.length > 10);
        setPicoData(prev => ({
          ...prev,
          [article.id]: {
            p: sentences[0] || 'No especificado',
            i: sentences[Math.floor(sentences.length / 2)] || 'No especificado',
            o: sentences[sentences.length - 1] || 'No especificado'
          }
        }));
      } catch (e) {
        console.error("Error generating PICO for flashcard", e);
      } finally {
        setIsGenerating(false);
      }
    };

    generatePico();
  }, [article, geminiApiKey, picoData]);

  if (!article) return null;

  const isSaved = savedArticles.some(a => a.id === article.id);
  const currentPico = picoData[article.id];

  const handleNext = () => {
    if (currentIndex < articles.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-0 z-[100] flex flex-col ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white/50'} backdrop-blur-xl z-10`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest opacity-50">Medical Shorts</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            {currentIndex + 1} / {articles.length}
          </span>
        </div>
        <button onClick={onClose} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}>
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, y: direction > 0 ? 100 : -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -100 : 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.y;
              if (swipe < -50 || velocity.y < -500) {
                handleNext();
              } else if (swipe > 50 || velocity.y > 500) {
                handlePrev();
              }
            }}
            className={`w-full max-w-md h-full max-h-[800px] flex flex-col rounded-[2rem] shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            {/* Image or Gradient Header */}
            <div className="h-64 relative shrink-0">
              {article.imageUrl ? (
                <img src={article.imageUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${isDarkMode ? 'from-blue-900/40 to-indigo-900/40' : 'from-blue-100 to-indigo-100'}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white">
                    {article.category}
                  </span>
                  <span className="text-[10px] font-bold text-white/90 line-clamp-1 flex-1">
                    {article.source} • {Array.isArray(article.authors) ? article.authors.join(', ') : article.authors || 'Autores desconocidos'}
                  </span>
                </div>
                <h2 className={`text-xl font-black text-white leading-tight line-clamp-5 ${fontClass}`}>
                  {article.title}
                </h2>
              </div>
            </div>

            {/* PICO Content */}
            <div className="flex-1 p-6 overflow-y-auto no-scrollbar flex flex-col gap-6">
              {isGenerating && !currentPico ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Extrayendo PICO...</span>
                </div>
              ) : currentPico ? (
                <>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-blue-900/10 border-blue-800/30' : 'bg-blue-50 border-blue-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 block">Paciente / Problema</span>
                    <p className="font-bold text-sm leading-relaxed">{currentPico.p}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1 block">Intervención</span>
                    <p className="font-bold text-sm leading-relaxed">{currentPico.i}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 block">Resultado (Outcome)</span>
                    <p className="font-bold text-sm leading-relaxed">{currentPico.o}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center opacity-50">
                  <AlertCircle size={32} className="mb-2" />
                  <span className="text-xs font-bold">No se pudo extraer PICO</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={`p-4 border-t flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <button 
                onClick={() => onToggleSave(article)}
                className={`p-3 rounded-xl transition-all ${isSaved ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border shadow-sm text-slate-500 hover:text-slate-900')}`}
              >
                <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
              </button>
              
              <button 
                onClick={() => onOpenImmersive(article)}
                className="flex-1 mx-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95"
              >
                <BookOpen size={18} /> Leer Completo
              </button>

              <button 
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: article.title, url: article.url || '' });
                    } catch (error) {
                      console.log('Error sharing:', error);
                    }
                  }
                }}
                className={`p-3 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border shadow-sm text-slate-500 hover:text-slate-900'}`}
              >
                <Share2 size={20} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Desktop Navigation Buttons */}
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className={`hidden md:flex absolute top-8 p-4 rounded-full shadow-2xl transition-all disabled:opacity-0 ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
        >
          <ChevronLeft size={32} className="rotate-90" />
        </button>
        <button 
          onClick={handleNext} 
          disabled={currentIndex === articles.length - 1}
          className={`hidden md:flex absolute bottom-8 p-4 rounded-full shadow-2xl transition-all disabled:opacity-0 ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
        >
          <ChevronRight size={32} className="rotate-90" />
        </button>
      </div>
    </motion.div>
  );
}
