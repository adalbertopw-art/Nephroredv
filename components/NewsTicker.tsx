
import React, { useEffect, useState } from 'react';
import { Rss, Calendar, Newspaper } from 'lucide-react';
import { Article } from '../types';
import { openExternalUrl } from '../services/browserService';

interface NewsTickerProps {
  isDarkMode: boolean;
  className?: string;
  articles?: Article[];
  title?: string;
}

interface NewsItem {
  source: string;
  title: string;
  url: string;
  isEvent?: boolean;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ isDarkMode, className = "", title }) => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded list of Nephrology News & Events
  const FEED_SOURCES = [
    // News Feeds
    { name: "NephJC", url: "http://www.nephjc.com/news?format=rss", home: "http://www.nephjc.com/" },
    { name: "Medscape", url: "https://rss.medscape.com/cx/rssfeeds/2723.xml", home: "https://www.medscape.com/nephrology" },
    { name: "AJKD Blog", url: "https://ajkdblog.org/feed/", home: "https://ajkdblog.org/" },
    { name: "Renal Fellow Network", url: "https://renalfellow.org/feed/", home: "https://renalfellow.org/" },
    { name: "Nature Reviews", url: "https://www.nature.com/nrneph.rss", home: "https://www.nature.com/nrneph/" },
    { name: "MedPage Nephrology", url: "https://www.medpagetoday.com/rss/nephrology.xml", home: "https://www.medpagetoday.com/nephrology" },
    { name: "Renal & Urology", url: "https://feeds.feedburner.com/latestarticlesfromrenalandurologynews", home: "https://www.renalandurologynews.com/" },
    { name: "The ISN", url: "https://www.theisn.org/feed", home: "https://www.theisn.org/" },
    { name: "BMC Nephrology", url: "https://bmcnephrol.biomedcentral.com/articles/most-recent/rss", home: "https://bmcnephrol.biomedcentral.com" },
    // Events (Some kept for potential future RSS capability)
    { name: "SLANH", url: "https://slanh.net/feed/", home: "https://slanh.net/" }
  ];

  const STATIC_EVENTS: NewsItem[] = [
    { source: "ASN", title: "ASN Kidney Week 2025: Orlando, FL", url: "https://www.asn-online.org/education/kidneyweek/", isEvent: true },
    { source: "ISN", title: "WCN'25: World Congress of Nephrology - New Delhi", url: "https://www.theisn.org/wcn/", isEvent: true },
    { source: "ERA", title: "62nd ERA Congress - Vienna & Virtual", url: "https://www.era-online.org/congress/2025/", isEvent: true },
    { source: "SLANH", title: "XX Congreso Latinoamericano de Nefrología - 2025", url: "https://slanh.net/", isEvent: true },
    { source: "SEN", title: "55º Congreso Nacional de la SEN - España", url: "https://www.senefro.org/", isEvent: true }
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchRSS = async () => {
      try {
        // Filter sources that look like feeds
        const newsSources = FEED_SOURCES.filter(s => s.url.includes('rss') || s.url.includes('feed') || s.url.includes('xml'));
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const promises = newsSources.map(src => 
          fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}`)
            .then(res => res.json())
            .then(data => {
              if (data.status === 'ok' && data.items) {
                // Filter items from the last 30 days
                const recentItems = data.items.filter((item: any) => {
                    const itemDate = new Date(item.pubDate.replace(/-/g, '/'));
                    return !isNaN(itemDate.getTime()) && itemDate >= thirtyDaysAgo;
                });
                
                // Return top 3 most recent items
                return recentItems.slice(0, 3).map((item: any) => ({
                  source: src.name,
                  title: item.title,
                  url: item.link,
                  isEvent: false
                }));
              }
              return [];
            })
            .catch(() => [])
        );
        
        const results = await Promise.all(promises);
        if (isMounted) {
          const dynamicItems = results.flat();
          // Combine static events with dynamic news
          const combined = [...STATIC_EVENTS, ...dynamicItems];
          // Deduplicate
          const unique = Array.from(new Map(combined.map(item => [item.url, item])).values());
          // Shuffle specifically to mix events and news
          setItems(unique.sort(() => Math.random() - 0.5));
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setItems(STATIC_EVENTS);
          setLoading(false);
        }
      }
    };
    fetchRSS();
    return () => { isMounted = false; };
  }, []);

  const displayItems = items.length > 0 ? items : STATIC_EVENTS;

  return (
    <div className={`flex items-center gap-2 py-1 px-2 rounded-full border border-transparent ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-100/50'} ${className}`}>
      <div className="flex items-center gap-1.5 shrink-0 pr-1.5 border-r border-slate-500/20">
        <Rss size={11} className="text-orange-500 animate-pulse" />
        {title && <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{title}</span>}
      </div>
      
      <div className="flex-1 overflow-hidden relative h-5">
        <div className="animate-marquee whitespace-nowrap absolute top-0 left-0 flex gap-6 items-center h-full">
           {displayItems.map((item, i) => (
             <button 
               key={`item-${i}`} 
               onClick={() => openExternalUrl(item.url, isDarkMode)}
               className={`text-[10px] font-medium hover:text-blue-500 cursor-pointer flex items-center gap-1.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
             >
               {item.isEvent ? (
                 <span className="flex items-center gap-1 text-orange-500">
                    <Calendar size={9} />
                    <span className="font-bold">[{item.source}]</span>
                 </span>
               ) : (
                 <span className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="font-bold">[{item.source}]</span>
                 </span>
               )}
               <span>{item.title}</span>
             </button>
           ))}
           {/* Loop Duplicate for smooth infinite scroll */}
           {displayItems.map((item, i) => (
             <button 
               key={`dup-${i}`} 
               onClick={() => openExternalUrl(item.url, isDarkMode)}
               className={`text-[10px] font-medium hover:text-blue-500 cursor-pointer flex items-center gap-1.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
             >
               {item.isEvent ? (
                 <span className="flex items-center gap-1 text-orange-500">
                    <Calendar size={9} />
                    <span className="font-bold">[{item.source}]</span>
                 </span>
               ) : (
                 <span className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="font-bold">[{item.source}]</span>
                 </span>
               )}
               <span>{item.title}</span>
             </button>
           ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 100s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default NewsTicker;
