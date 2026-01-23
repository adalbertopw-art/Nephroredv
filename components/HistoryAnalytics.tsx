
import React, { useMemo } from 'react';
import { HistorySnapshot } from '../types';
import { BarChart2, TrendingUp, Calendar, Activity } from 'lucide-react';

interface HistoryAnalyticsProps {
  history: HistorySnapshot[];
  isDarkMode: boolean;
}

const HistoryAnalytics: React.FC<HistoryAnalyticsProps> = ({ history, isDarkMode }) => {
  
  // 1. Topic Distribution Analysis
  const topicStats = useMemo(() => {
    const stats: Record<string, number> = {};
    history.forEach(h => {
      const t = h.topic || 'General';
      stats[t] = (stats[t] || 0) + 1;
    });
    return Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5
  }, [history]);

  // 2. Activity Heatmap (Last 14 days)
  const activityStats = useMemo(() => {
    const days = 14;
    const stats = new Array(days).fill(0);
    const today = new Date();
    today.setHours(0,0,0,0);

    history.forEach(h => {
        const date = new Date(h.timestamp);
        date.setHours(0,0,0,0);
        const diffTime = Math.abs(today.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays < days) {
            stats[days - 1 - diffDays] += 1;
        }
    });
    return stats;
  }, [history]);

  const maxActivity = Math.max(...activityStats, 1);

  return (
    <div className={`rounded-2xl p-5 mb-6 border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      <div className="flex items-center gap-2 mb-6">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Activity size={20} />
          </div>
          <div>
              <h3 className={`font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Clinical Intelligence Map</h3>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Search patterns & activity</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Topic Distribution */}
          <div>
              <h4 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <TrendingUp size={12} /> Top Interests
              </h4>
              <div className="space-y-3">
                  {topicStats.map(([topic, count], idx) => (
                      <div key={topic} className="relative">
                          <div className="flex justify-between text-xs font-medium mb-1 z-10 relative">
                              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{topic}</span>
                              <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{count} searches</span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              <div 
                                  className={`h-full rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'}`} 
                                  style={{ width: `${(count / topicStats[0][1]) * 100}%` }}
                              ></div>
                          </div>
                      </div>
                  ))}
                  {topicStats.length === 0 && <p className="text-xs opacity-50 italic">No data yet.</p>}
              </div>
          </div>

          {/* Activity Grid */}
          <div>
              <h4 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar size={12} /> Last 14 Days Activity
              </h4>
              <div className="flex items-end justify-between h-24 gap-1">
                  {activityStats.map((count, i) => {
                      const heightPercent = (count / maxActivity) * 100;
                      return (
                          <div key={i} className="flex flex-col items-center gap-1 w-full group">
                              <div 
                                  className={`w-full rounded-t-sm transition-all duration-500 ${count > 0 ? (isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500') : (isDarkMode ? 'bg-slate-800' : 'bg-slate-100')}`}
                                  style={{ height: `${Math.max(heightPercent, 10)}%`, opacity: count > 0 ? 1 : 0.3 }}
                              ></div>
                              <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4">{count}</span>
                          </div>
                      )
                  })}
              </div>
              <div className={`mt-2 text-[10px] text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  ← Previous Days ................. Today →
              </div>
          </div>

      </div>
    </div>
  );
};

export default HistoryAnalytics;
