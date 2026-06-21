import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, MessageCircle, BadgeCheck, MoreHorizontal, Users, Zap, Plus, X, Send, Loader2, Trash2, ShieldCheck, ChevronRight, BookOpen } from 'lucide-react';
import { ForumPost } from '../types';
import { supabase } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface DebateDashboardProps {
  debates: ForumPost[];
  onSelectDebate: (debate: ForumPost) => void;
  isDarkMode: boolean;
  user?: any;
  isAdmin?: boolean;
  onRefresh?: () => void;
  t?: any;
}

const DebateDashboard: React.FC<DebateDashboardProps> = ({ debates, onSelectDebate, isDarkMode, user, isAdmin, onRefresh, t }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [doi, setDoi] = useState('');
  const [tags, setTags] = useState('');
  const [sending, setSending] = useState(false);

  const formatCompactDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Ahora';
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  const handleCreateDebate = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSending(true);

    const debateId = uuidv4();
    const newDebate = {
        id: debateId,
        title: title.trim(),
        content: content.trim(),
        url: url.trim() || null,
        doi: doi.trim() || null,
        author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Dr. Anonymous',
        author_specialty: user.user_metadata?.specialty || 'Médico',
        author_id: user.id,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        created_at: new Date().toISOString(),
        replies_count: 0,
        likes_count: 0
    };

    if (supabase) {
        const { error } = await supabase.from('forums').insert([newDebate]);
        if (error) {
            console.error("Error creating debate:", error);
        } else {
            setIsCreating(false);
            setTitle('');
            setContent('');
            setUrl('');
            setDoi('');
            setTags('');
            if (onRefresh) onRefresh();
        }
    }
    setSending(false);
  };

  const handleDeleteDebate = async (e: React.MouseEvent, debateId: string) => {
    console.log("Delete debate triggered:", debateId);
    e.stopPropagation();
    if (!supabase || !user) return;
    
    const { error } = await supabase.from('forums').delete().eq('id', debateId);
    if (error) {
        console.error("Error deleting debate:", error);
    } else {
        if (onRefresh) onRefresh();
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDebates = debates.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header Section */}
      <div className={`p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/80 backdrop-blur-md' : 'border-slate-200 bg-white/80 backdrop-blur-md'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {t?.activeDebate || "Debates de la Comunidad"}
                        </h2>
                        <p className="text-[10px] opacity-50 font-black uppercase tracking-widest">
                            {debates.length} {t?.discoverDebates || "Temas propuestos • Tendencias médicas"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className={`relative flex-1 sm:w-64 group`}>
                    <input 
                        type="text"
                        placeholder={t?.searchDiscussions || "Buscar debates..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs font-bold border transition-all outline-none ${
                            isDarkMode 
                                ? 'bg-slate-800 border-slate-700 focus:border-emerald-500/50 focus:bg-slate-800/50' 
                                : 'bg-slate-100 border-slate-200 focus:border-emerald-500/50 focus:bg-white'
                        }`}
                    />
                    <TrendingUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-emerald-500 group-focus-within:opacity-100 transition-all" />
                </div>

                {user && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">{t?.proposeDebate || "Proponer"}</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}
          >
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Plus size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">{t?.newDebateProposal || "Nueva Propuesta de Debate"}</h3>
                </div>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">{t?.debateTitle || "Título del Debate"}</label>
                        <input 
                            type="text"
                            placeholder={t?.debateTitlePh || "Ej: Impacto de la IA en el diagnóstico radiológico"}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">{t?.contentQuestion || "Contenido / Pregunta"}</label>
                        <textarea 
                            placeholder={t?.contentQuestionPh || "Describe el tema o lanza una pregunta para iniciar la discusión..."}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none transition-all resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">{t?.linkOpt || "Enlace (Opcional)"}</label>
                        <input 
                            type="text"
                            placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">{t?.doiOpt || "DOI (Opcional)"}</label>
                        <input 
                            type="text"
                            placeholder="10.1038/s41586-021-03430-5"
                            value={doi}
                            onChange={(e) => setDoi(e.target.value)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">{t?.tags || "Etiquetas (Separadas por coma)"}</label>
                        <input 
                            type="text"
                            placeholder={t?.tagsPh || "Cardiología, IA, Ética"}
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                        />
                    </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleCreateDebate}
                  disabled={sending || !title.trim() || !content.trim()}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {t?.proposeDebate || "Publicar Debate"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredDebates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-30">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <MessageCircle size={40} />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest">{t?.noDebatesFound || "No se encontraron debates"}</p>
                <p className="text-[10px] max-w-[200px] mx-auto">{t?.tryOtherTerms || "Intenta con otros términos de búsqueda o propón un nuevo tema."}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredDebates.map((debate) => (
              <motion.div
                key={debate.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -6, scale: 1.01, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => onSelectDebate(debate)}
                className={`group p-5 sm:p-6 rounded-[2rem] border cursor-pointer transition-all flex flex-col h-full ${
                  isDarkMode 
                    ? 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 shadow-lg' 
                    : 'bg-white border-slate-100 hover:border-emerald-500/30 hover:shadow-xl shadow-sm'
                }`}
              >
                {/* Header: Author & Date */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20`}>
                      {debate.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                          {debate.author}
                        </span>
                        {(debate.author_id === user?.id && isAdmin) || debate.author_id === 'system' ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest shrink-0">
                              Admin
                          </span>
                        ) : (
                          <BadgeCheck size={14} className="text-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[9px] opacity-40 font-bold uppercase tracking-tighter truncate">
                        {debate.authorSpecialty} • {formatCompactDate(debate.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(user?.id === debate.author_id || isAdmin) && (
                      <button 
                        onClick={(e) => handleDeleteDebate(e, debate.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title={t?.deleteDebate || "Eliminar debate"}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Debate Title & Content */}
                <div className="flex-1 space-y-3">
                    <h3 className={`text-base sm:text-lg font-black leading-tight line-clamp-2 group-hover:text-emerald-500 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {debate.title}
                    </h3>

                    <p className={`text-xs sm:text-sm leading-relaxed line-clamp-3 opacity-70 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {debate.content}
                    </p>
                </div>

                {/* Footer Section */}
                <div className="mt-6 space-y-4">
                    {/* Tags */}
                    {debate.tags && debate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {debate.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    {tag}
                                </span>
                            ))}
                            {debate.tags.length > 3 && (
                                <span className="text-[9px] font-bold opacity-30">+{debate.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    <div className={`pt-4 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                <MessageCircle size={14} /> {debate.replies} respuestas
                            </span>
                            {debate.likes > 0 && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500">
                                    <Zap size={14} /> {debate.likes}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                            {(debate.url || debate.doi) && (
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <BookOpen size={12} />
                                </div>
                            )}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateDashboard;
