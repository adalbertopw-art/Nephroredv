
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, StopCircle } from 'lucide-react';
import { ChatMessage, Article } from '../types';
import { chatWithArticle } from '../services/geminiService';

interface ArticleChatProps {
  article: Article;
  apiKey?: string;
  isDarkMode: boolean;
}

const ArticleChat: React.FC<ArticleChatProps> = ({ article, apiKey, isDarkMode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: `Hola. He analizado "${article.title}". Pregúntame sobre métodos, dosis, criterios de inclusión o resultados.`, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Use Full Text if available (from PDF), otherwise Summary
    const context = article.fullTextContent || article.summary;

    try {
        // We pass the *previous* messages (excluding the one just added) to maintain history context if the service supports it, 
        // but our service wrapper re-initializes. 
        // Ideally, we pass the full history including the new user message to the service if doing stateless, 
        // or let the service handle it. 
        // Given the service implementation:
        const responseText = await chatWithArticle(messages, userMsg.content, context, apiKey);
        
        const botMsg: ChatMessage = { role: 'model', content: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', content: "Error de conexión. Intenta de nuevo.", timestamp: Date.now() }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-600')}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : (isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-sm' : 'bg-white border shadow-sm text-slate-800 rounded-tl-sm')
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-white border'}`}>
               <Bot size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-600'} />
             </div>
             <div className={`flex items-center gap-2 p-4 rounded-2xl rounded-tl-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white border'}`}>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-75"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-150"></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pregunta sobre este artículo..."
            className={`flex-1 p-3 rounded-xl outline-none transition-all ${isDarkMode ? 'bg-slate-800 text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-blue-500'}`}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-xl transition-all ${!input.trim() ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600' : 'bg-blue-600 text-white shadow-lg active:scale-95'}`}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleChat;
