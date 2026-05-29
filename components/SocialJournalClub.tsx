
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Article, Comment, ReactionType, Reaction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Send, User, Users, MessageCircle, AlertTriangle, Lightbulb, TrendingDown, ShieldCheck, Loader2, Bot, LogIn, BadgeCheck, ThumbsUp, Activity, BookOpen, X, Share2, Heart, Repeat, MessageSquare, MoreHorizontal, Zap, ChevronDown, Trash2, Edit3 } from 'lucide-react';
import { generateModeratorComment } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialJournalClubProps {
  article: Article;
  isDarkMode: boolean;
  geminiApiKey?: string;
  onOpenAuth?: () => void;
  isGeneralForum?: boolean;
  isDebate?: boolean;
  onRefresh?: () => void;
}

const REACTION_CONFIG: Record<ReactionType, { icon: React.ElementType, label: string, color: string }> = {
    'solid': { icon: ShieldCheck, label: 'Sólido', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    'biased': { icon: AlertTriangle, label: 'Sesgado', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
    'novel': { icon: Lightbulb, label: 'Novedoso', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
    'limited': { icon: TrendingDown, label: 'Limitado', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
    'like': { icon: ThumbsUp, label: 'Me gusta', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    'useful': { icon: Lightbulb, label: 'Útil', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    'doubt': { icon: AlertTriangle, label: 'Duda', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
};

const SocialJournalClub: React.FC<SocialJournalClubProps> = ({ article, isDarkMode, geminiApiKey, onOpenAuth, isGeneralForum, isDebate, onRefresh }) => {
  const { user, isLoading: authLoading, verificationStatus, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [moderatorThinking, setModeratorThinking] = useState(false);
  const [pollVote, setPollVote] = useState<'yes' | 'no' | 'maybe' | null>(null);
  
  // Propose Article State
  const [isProposing, setIsProposing] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propUrl, setPropUrl] = useState('');
  const [propDoi, setPropDoi] = useState('');
  const [propReason, setPropReason] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Comments & Reactions
  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    if (!supabase) {
        setLoading(false);
        return;
    }
    
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq((isGeneralForum || isDebate || article.id.startsWith('dm_shared:')) ? 'post_id' : 'article_id', article.id)
        .order('created_at', { ascending: true })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
    
    if (!error && data) {
        if (append) {
            setComments(prev => [...prev, ...data as Comment[]]);
        } else {
            setComments(data as Comment[]);
        }
        setHasMore(data.length === PAGE_SIZE);
    }
    
    setLoading(false);
    setLoadingMore(false);
  }, [article.id, isGeneralForum, isDebate]);

  const fetchReactions = useCallback(async () => {
    if (!supabase) return;
    
    const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .or(`post_id.eq.${article.id},comment_id.in.(${comments.map(c => c.id).join(',') || 'NULL'})`);
    
    if (!error && data) {
        setReactions(data as Reaction[]);
    }
  }, [article.id, comments]);

  useEffect(() => {
    fetchComments(0);
    setPage(0);
  }, [fetchComments]);

  useEffect(() => {
    if (comments.length > 0) {
        fetchReactions();
    }
  }, [comments, fetchReactions]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!supabase) return;

    const commentsChannel = supabase
      .channel('public:comments')
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments', 
          filter: (isGeneralForum || isDebate || article.id.startsWith('dm_shared:')) ? `post_id=eq.${article.id}` : `article_id=eq.${article.id}` 
      }, (payload) => {
          setComments(prev => {
              if (prev.some(c => c.id === payload.new.id)) return prev;
              return [...prev, payload.new as Comment];
          });
      })
      .subscribe();

    const reactionsChannel = supabase
      .channel('public:reactions')
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'reactions'
      }, (payload) => {
          if (payload.eventType === 'INSERT') {
              setReactions(prev => [...prev, payload.new as Reaction]);
          } else if (payload.eventType === 'DELETE') {
              setReactions(prev => prev.filter(r => r.id !== payload.old.id));
          }
      })
      .subscribe();

    return () => { 
        supabase.removeChannel(commentsChannel); 
        supabase.removeChannel(reactionsChannel);
    };
  }, [article.id, isGeneralForum, isDebate]);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [comments]);

  const handlePostComment = async () => {
      if (!newComment.trim() || !user) return;
      setSending(true);

      const commentId = uuidv4();
      const payload = {
          id: commentId,
          article_id: (isGeneralForum || isDebate || article.id.startsWith('dm_shared:')) ? null : article.id,
          post_id: (isGeneralForum || isDebate || article.id.startsWith('dm_shared:')) ? article.id : null,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous Dr.',
          user_specialty: user.user_metadata?.specialty || 'Nephrology',
          content: newComment,
          parent_id: replyTo?.id || null,
          created_at: new Date().toISOString()
      };

      // Optimistic UI
      setComments(prev => [...prev, payload as Comment]);
      setNewComment('');
      setReplyTo(null);

      if (!supabase) {
          setSending(false);
          return;
      }

      const { error } = await supabase.from('comments').insert([payload]);
      
      if (error) {
          console.error("Error posting:", error);
          // Revert optimistic update on error
          setComments(prev => prev.filter(c => c.id !== commentId));
          setNewComment(payload.content); // Restore text
      } else {
          // Increment replies_count in forums table if it's a debate
          if (isDebate) {
              const { data: forumData } = await supabase.from('forums').select('replies_count').eq('id', article.id).single();
              if (forumData) {
                  await supabase.from('forums').update({ replies_count: (forumData.replies_count || 0) + 1 }).eq('id', article.id);
              }
          }
      }
      setSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
      console.log("Delete comment triggered:", commentId);
      if (!supabase || !user) return;
      
      const isOwner = comments.find(c => c.id === commentId)?.user_id === user.id;
      if (!isOwner && !isAdmin) return;

      // Optimistic UI
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) {
          console.error("Error deleting comment:", error);
          fetchComments(0);
      }
  };

  const handleCommentClick = () => {
      if (inputRef.current) {
          inputRef.current.focus();
      }
  };

  const handleShareComment = async (comment: Comment) => {
      const shareText = `"${comment.content}" - ${comment.user_name} (${comment.user_specialty}) en NephroUpdate`;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Comentario en NephroUpdate',
                  text: shareText,
                  url: window.location.href
              });
          } catch (err) {
              // Ignore abort errors
              if ((err as Error).name !== 'AbortError') {
                  console.error('Error sharing:', err);
              }
          }
      } else {
          try {
              await navigator.clipboard.writeText(shareText);
              // Simple toast-like feedback could be better but alert is fine for now
          } catch (err) {
              console.error('Error copying:', err);
          }
      }
  };

  const handlePostProposal = async () => {
      if (!user || !propTitle.trim()) return;
      setSending(true);

      const debateId = uuidv4();
      const forumPayload = {
          id: debateId,
          title: isGeneralForum ? `Propuesta: ${propTitle.trim()}` : `Debate: ${propTitle.trim()}`,
          content: propReason.trim() || `Debate propuesto sobre el artículo: ${propTitle.trim()}`,
          url: propUrl.trim() || null,
          doi: propDoi.trim() || null,
          article_id: isGeneralForum ? null : article.id,
          author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          author_specialty: user.user_metadata?.specialty || 'Médico',
          author_id: user.id,
          tags: isGeneralForum ? ['Propuesta', 'Comunidad'] : ['Artículo', 'Debate'],
          created_at: new Date().toISOString(),
          replies_count: 0,
          likes_count: 0
      };

      if (supabase) {
          const { error } = await supabase.from('forums').insert([forumPayload]);
          if (error) {
              console.error("Error posting forum proposal:", error);
          }
          
          // Always add a comment to the current thread so the user sees their proposal
          const commentContent = `🚀 **PROPUESTA DE DEBATE**\n\n**Artículo:** ${propTitle.trim()}\n**Enlace:** ${propUrl.trim() || 'No provisto'}\n**DOI:** ${propDoi.trim() || 'No provisto'}\n\n**¿Por qué discutirlo?:** ${propReason.trim() || 'Interés general'}`;
          await supabase.from('comments').insert([{
              article_id: isGeneralForum ? null : article.id,
              post_id: isGeneralForum ? article.id : null,
              user_id: user.id,
              user_name: forumPayload.author_name,
              user_specialty: forumPayload.author_specialty,
              content: commentContent
          }]);
          
          if (onRefresh) onRefresh();
      }

      setPropTitle('');
      setPropUrl('');
      setPropDoi('');
      setPropReason('');
      setIsProposing(false);
      setSending(false);
  };

  const handleTriggerModerator = async () => {
      setModeratorThinking(true);
      const modText = await generateModeratorComment(comments, article.title, article.summary, geminiApiKey, isGeneralForum);
      
      const modPayload = {
          article_id: article.id,
          user_id: 'ai-moderator',
          user_name: isGeneralForum ? 'Consultor Clínico AI' : 'AI Moderator (Devil\'s Advocate)',
          user_specialty: isGeneralForum ? 'Evidencia y Guías' : 'Evidence Based AI',
          content: modText,
          is_ai_moderator: true
      };

      if (supabase) {
          await supabase.from('comments').insert([modPayload]);
      }
      // Also local fallback if db fails or supabase is null
      setComments(prev => [...prev, { id: Date.now().toString(), created_at: new Date().toISOString(), ...modPayload } as Comment]);
      
      setModeratorThinking(false);
  };

  const handleReaction = async (type: ReactionType, commentId?: string) => {
      if (!user || !supabase) return;
      
      const existingReaction = reactions.find(r => 
          r.user_id === user.id && 
          (commentId ? r.comment_id === commentId : r.post_id === article.id)
      );

      const reactionId = uuidv4();
      const newReaction: Reaction = {
          id: reactionId,
          user_id: user.id,
          post_id: commentId ? undefined : article.id,
          comment_id: commentId,
          reaction_type: type,
          created_at: new Date().toISOString()
      };

      // Optimistic UI
      if (existingReaction) {
          if (existingReaction.reaction_type === type) {
              // Toggle off
              setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
              await supabase.from('reactions').delete().eq('id', existingReaction.id);
          } else {
              // Change type
              setReactions(prev => prev.map(r => r.id === existingReaction.id ? { ...r, reaction_type: type } : r));
              await supabase.from('reactions').update({ reaction_type: type }).eq('id', existingReaction.id);
          }
      } else {
          // Add new
          setReactions(prev => [...prev, newReaction]);
          const { error } = await supabase.from('reactions').insert([newReaction]);
          if (error) {
              setReactions(prev => prev.filter(r => r.id !== reactionId));
          }
      }
  };

  const getReactionCounts = (commentId?: string) => {
      const relevantReactions = reactions.filter(r => 
          commentId ? r.comment_id === commentId : r.post_id === article.id
      );
      
      const counts: Record<string, number> = {};
      relevantReactions.forEach(r => {
          counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      
      return counts;
  };

  const getUserReaction = (commentId?: string) => {
      return reactions.find(r => 
          r.user_id === user?.id && 
          (commentId ? r.comment_id === commentId : r.post_id === article.id)
      )?.reaction_type;
  };

  const getCommentType = (content: string): 'proposal' | 'dm' | 'standard' => {
    if (content.includes('🚀 **PROPUESTA DE DEBATE**')) return 'proposal';
    if (content.includes('🤝 **TRABAJO COLABORATIVO**')) return 'dm';
    return 'standard';
  };

  const formatCommentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    return date.toLocaleDateString();
  };

  // Grouping logic for General Forum
  const groupedComments = useMemo(() => {
    if (!isGeneralForum) return { threads: comments.filter(c => !c.parent_id), orphans: [] };

    const threads: { proposal: Comment; children: Comment[] }[] = [];
    const orphans: Comment[] = [];
    let currentThread: { proposal: Comment; children: Comment[] } | null = null;

    // Sort by date to ensure chronological grouping
    const sorted = [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sorted.forEach(comment => {
      const type = getCommentType(comment.content);
      
      if (type === 'proposal') {
        currentThread = { proposal: comment, children: [] };
        threads.push(currentThread);
      } else if (comment.parent_id) {
        // Find the thread this reply belongs to (either directly or via parent)
        const findRoot = (parentId: string): Comment | null => {
            const parent = comments.find(c => c.id === parentId);
            if (!parent) return null;
            if (getCommentType(parent.content) === 'proposal') return parent;
            if (parent.parent_id) return findRoot(parent.parent_id);
            return parent;
        };
        const root = findRoot(comment.parent_id);
        const thread = threads.find(t => t.proposal.id === root?.id);
        if (thread) {
          thread.children.push(comment);
        } else {
          orphans.push(comment);
        }
      } else {
        // Top level standard comment
        if (currentThread) {
          currentThread.children.push(comment);
        } else {
          orphans.push(comment);
        }
      }
    });

    return { threads, orphans };
  }, [comments, isGeneralForum]);

  const renderCommentTree = (c: Comment, allComments: Comment[], depth = 0) => {
    const type = getCommentType(c.content);
    const replies = allComments.filter(reply => reply.parent_id === c.id);
    const isUserEndorsed = user && c.endorsed_by?.includes(user.id);

    return (
        <div key={c.id} className={`flex flex-col ${depth > 0 ? 'ml-6 mt-2' : 'mt-2'}`}>
            <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition-all ${
                    type === 'proposal' 
                        ? (isDarkMode ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-md')
                        : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm')
                } flex gap-3`}
            >
                {/* Avatar */}
                <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                        c.is_ai_moderator ? 'bg-purple-500 text-white' : 'bg-blue-600 text-white'
                    }`}>
                        {c.is_ai_moderator ? <Bot size={24} /> : c.user_name.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className={`text-base font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {c.user_name}
                            </span>
                            {(c.user_id === user?.id && isAdmin) || c.user_id === 'system' ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <ShieldCheck size={10} /> Admin
                                </span>
                            ) : (
                                !c.is_ai_moderator && <BadgeCheck size={16} className="text-blue-500 shrink-0" />
                            )}
                            <span className="text-xs opacity-50 truncate">
                                @{c.user_name.toLowerCase().replace(/\s+/g, '')} • {formatCommentDate(c.created_at)}
                            </span>
                            {type === 'proposal' && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">
                                    Debate
                                </span>
                            )}
                            {new Date(c.created_at).getTime() > Date.now() - 86400000 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">
                                    Nuevo
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {(user?.id === c.user_id || isAdmin) && (
                                <button 
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    title="Eliminar comentario"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button className="opacity-40 hover:opacity-100 p-1.5"><MoreHorizontal size={18} /></button>
                        </div>
                    </div>

                    <div className={`text-base leading-relaxed break-words prose dark:prose-invert max-w-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <ReactMarkdown>{c.content}</ReactMarkdown>
                    </div>

                    {/* Interaction Counts & Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-50">
                            <span className="flex items-center gap-1.5"><MessageCircle size={14} /> {replies.length} respuestas</span>
                            <div className="flex items-center gap-3">
                                {Object.entries(getReactionCounts(c.id)).map(([type, count]) => (
                                    <span key={type} className="flex items-center gap-1">
                                        {type === 'like' && <ThumbsUp size={12} />}
                                        {type === 'useful' && <Lightbulb size={12} />}
                                        {type === 'doubt' && <AlertTriangle size={12} />}
                                        {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    setReplyTo(c);
                                    handleCommentClick();
                                }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                                    isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                <Repeat size={14} /> Responder
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {(['like', 'useful', 'doubt'] as ReactionType[]).map(rType => {
                                    const isActive = getUserReaction(c.id) === rType;
                                    return (
                                        <button 
                                            key={rType}
                                            onClick={() => handleReaction(rType, c.id)}
                                            className={`p-2 rounded-lg transition-all ${
                                                isActive 
                                                    ? 'bg-blue-500 text-white' 
                                                    : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                            }`}
                                            title={rType}
                                        >
                                            {rType === 'like' && <ThumbsUp size={14} />}
                                            {rType === 'useful' && <Lightbulb size={14} />}
                                            {rType === 'doubt' && <AlertTriangle size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            {/* Recursive Replies */}
            {replies.map(reply => renderCommentTree(reply, allComments, depth + 1))}
        </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        
        {/* Header / Info */}
        <div className={`p-4 border-b shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className={`font-black uppercase tracking-widest text-xs flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {(article.id.startsWith('dm:') || article.id.startsWith('dm_shared:')) ? <Users size={14} className="text-indigo-500" /> : <MessageCircle size={14} className="text-blue-500" />}
                    {(article.id.startsWith('dm:') || article.id.startsWith('dm_shared:')) ? 'Espacio de Colaboración' : (isGeneralForum ? 'Foro Clínico Abierto' : (isDebate ? 'Debate de la Comunidad' : 'Social Journal Club'))}
                </h3>
                <span className="text-[10px] opacity-50 font-bold">{(article.id.startsWith('dm:') || article.id.startsWith('dm_shared:')) ? 'COLABORACIÓN' : (isGeneralForum ? 'DEBATE Y CASOS' : (isDebate ? 'DISCUSIÓN' : 'LIVE EBD'))}</span>
            </div>
            <p className={`text-[10px] opacity-60 leading-tight ${(!isGeneralForum && !isDebate && !article.id.startsWith('dm_shared:')) ? 'mb-4' : ''}`}>
                {(article.id.startsWith('dm:') || article.id.startsWith('dm_shared:'))
                    ? 'Artículos compartidos por colegas para futuros trabajos colaborativos. Usa este espacio para coordinar investigación o revisión de casos.'
                    : (isGeneralForum 
                        ? 'Comparte casos clínicos, haz preguntas a la comunidad o debate sobre guías de práctica clínica.'
                        : (isDebate ? 'Participa en el debate con otros colegas.' : 'Discusión basada en evidencia. Usa las reacciones científicas para evaluar la metodología.'))}
            </p>

            {/* Article Reference for Debates */}
            {isDebate && (article.url || article.doi) && (
                <div className={`mt-3 p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={12} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Artículo en Debate</span>
                    </div>
                    {article.url && (
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className={`text-xs font-bold hover:underline truncate block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {article.url}
                        </a>
                    )}
                    {article.doi && (
                        <p className="text-[10px] opacity-60 mt-1">DOI: {article.doi}</p>
                    )}
                </div>
            )}

            {/* Clinical Impact Poll - Only for Articles */}
            {(!isGeneralForum && !isDebate) && (
                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Impacto Clínico</span>
                    </div>
                    <p className="text-xs font-bold mb-2">¿Cambiará este artículo tu práctica clínica?</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPollVote('yes')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${pollVote === 'yes' ? 'bg-emerald-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border')}`}
                        >Sí</button>
                        <button 
                            onClick={() => setPollVote('no')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${pollVote === 'no' ? 'bg-rose-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border')}`}
                        >No</button>
                        <button 
                            onClick={() => setPollVote('maybe')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${pollVote === 'maybe' ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border')}`}
                        >Dudoso</button>
                    </div>
                </div>
            )}

            {(!isProposing && !isDebate) && (
                <button 
                    onClick={() => {
                        if (!isGeneralForum) {
                            setPropTitle(article.title);
                            setPropUrl(article.url || '');
                        }
                        setIsProposing(true);
                    }}
                    className={`mt-3 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${isDarkMode ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                >
                    <BookOpen size={14} /> {isGeneralForum ? 'Proponer un Caso Clínico' : 'Llevar a Debate Principal'}
                </button>
            )}
        </div>

        {/* Proposal Section */}
        {isProposing && (
            <div className={`p-4 border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-blue-500">
                        <BookOpen size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Proponer Artículo</span>
                    </div>
                    <button onClick={() => setIsProposing(false)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
                </div>
                <div className="space-y-2">
                    <input 
                        type="text" 
                        value={propTitle}
                        onChange={e => setPropTitle(e.target.value)}
                        placeholder="Título del artículo..."
                        className={`w-full p-2 rounded-lg text-xs outline-none border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                    <input 
                        type="text" 
                        value={propUrl}
                        onChange={e => setPropUrl(e.target.value)}
                        placeholder="Enlace / URL (opcional)..."
                        className={`w-full p-2 rounded-lg text-xs outline-none border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                    <input 
                        type="text" 
                        value={propDoi}
                        onChange={e => setPropDoi(e.target.value)}
                        placeholder="DOI (opcional)..."
                        className={`w-full p-2 rounded-lg text-xs outline-none border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                    <textarea 
                        value={propReason}
                        onChange={e => setPropReason(e.target.value)}
                        placeholder="¿Por qué deberíamos debatirlo?..."
                        rows={2}
                        className={`w-full p-2 rounded-lg text-xs outline-none border resize-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                    <button 
                        onClick={handlePostProposal}
                        disabled={sending || !propTitle.trim()}
                        className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar Propuesta
                    </button>
                </div>
            </div>
        )}

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-0" ref={scrollRef}>
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : comments.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                    <MessageCircle size={48} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">Sé el primero en opinar</p>
                </div>
            ) : isGeneralForum ? (
                <>
                    {/* Render Threads (Debates) */}
                    {groupedComments.threads.map((thread) => (
                        <div key={thread.proposal.id} className={`p-4 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-900/40 border-blue-500/20' : 'bg-blue-50/30 border-blue-100'} space-y-4`}>
                            <div className="flex items-center gap-2 mb-2 px-2">
                                <Zap size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Debate Activo</span>
                            </div>
                            {renderCommentTree(thread.proposal, comments)}
                            {thread.children.filter(c => !c.parent_id || c.parent_id === thread.proposal.id).map(child => {
                                if (child.id === thread.proposal.id) return null;
                                const isDirectReply = child.parent_id === thread.proposal.id;
                                if (isDirectReply) return null; 
                                return renderCommentTree(child, comments, 1);
                            })}
                        </div>
                    ))}

                    {/* Render Orphans (General Comments) */}
                    {groupedComments.orphans.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2 px-2 opacity-50">
                                <MessageSquare size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Comentarios Generales</span>
                            </div>
                            {groupedComments.orphans.map(orphan => renderCommentTree(orphan, comments))}
                        </div>
                    )}
                </>
            ) : (
                comments.filter(c => !c.parent_id).map((comment) => renderCommentTree(comment, comments))
            )}
            
            {hasMore && (
                <div className="flex justify-center pt-4">
                    <button 
                        onClick={() => {
                            const nextPage = page + 1;
                            setPage(nextPage);
                            fetchComments(nextPage, true);
                        }}
                        disabled={loadingMore}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                            isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                        Cargar más comentarios
                    </button>
                </div>
            )}
            
            {moderatorThinking && (
                <div className="flex gap-2 items-center text-xs font-bold text-purple-500 animate-pulse">
                    <Bot size={14} /> {isGeneralForum ? 'Consultor AI analizando...' : 'AI Moderator analyzing bias...'}
                </div>
            )}
        </div>

        {/* Reaction Bar (Sticky Bottom of Feed) - Only for Articles */}
        {(!isGeneralForum && !isDebate) && (
            <div className={`p-2 flex justify-center gap-2 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
                {(['solid', 'biased', 'novel', 'limited'] as ReactionType[]).map(type => {
                    const conf = REACTION_CONFIG[type as keyof typeof REACTION_CONFIG];
                    if (!conf) return null;
                    const isActive = getUserReaction() === type;
                    return (
                        <button 
                            key={type} 
                            onClick={() => handleReaction(type)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all active:scale-95 ${
                                isActive ? 'bg-blue-500 text-white border-blue-600' : conf.color
                            } hover:brightness-110`}
                        >
                            <conf.icon size={16} />
                            <span className="text-[8px] font-black uppercase">{conf.label}</span>
                            {getReactionCounts()[type] > 0 && (
                                <span className="text-[8px] font-bold">{getReactionCounts()[type]}</span>
                            )}
                        </button>
                    )
                })}
            </div>
        )}

        {/* Input Area */}
        <div className={`p-3 border-t flex flex-col gap-2 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            {comments.length > 2 && !moderatorThinking && (
                <button 
                    onClick={handleTriggerModerator}
                    className={`w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${isDarkMode ? 'bg-purple-900/20 text-purple-400 hover:bg-purple-900/30' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                >
                    <Bot size={12} /> {isGeneralForum ? 'Invocar Consultor AI (Segunda Opinión)' : 'Invocar Moderador (Devil\'s Advocate)'}
                </button>
            )}
            
            {authLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : user ? (
                <div className="flex flex-col gap-2">
                    {replyTo && (
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-xl text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <span className="flex items-center gap-1">
                                <MessageSquare size={12} /> Replying to @{replyTo.user_name.toLowerCase().replace(/\s+/g, '')}
                            </span>
                            <button onClick={() => setReplyTo(null)} className="opacity-50 hover:opacity-100"><X size={12} /></button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                            placeholder={replyTo ? "Escribe tu respuesta..." : (isGeneralForum ? "Comparte un caso, pregunta o comentario..." : "Añade tu crítica o comentario...")}
                            className={`flex-1 p-3 rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'} ${replyTo ? 'rounded-tl-none' : ''}`}
                        />
                        <button 
                            onClick={handlePostComment}
                            disabled={sending || !newComment.trim()}
                            className="p-3 rounded-xl bg-blue-600 text-white shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={onOpenAuth}
                    className={`w-full p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all hover:border-blue-500/50 hover:bg-blue-500/5 ${
                        isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                    }`}
                >
                    <LogIn size={24} className="opacity-50" />
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-widest">Inicia sesión para participar</p>
                        <p className="text-[10px] opacity-60">Debes iniciar sesión para dar tu opinión en el Social Club</p>
                    </div>
                </button>
            )}
        </div>
    </div>
  );
};

export default SocialJournalClub;
