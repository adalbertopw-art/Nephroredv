
import React from 'react';

interface ArticleSkeletonProps {
  isDarkMode: boolean;
}

const ArticleSkeleton: React.FC<ArticleSkeletonProps> = ({ isDarkMode }) => {
  const bgClass = isDarkMode ? 'bg-slate-800' : 'bg-slate-200';
  const borderClass = isDarkMode ? 'border-slate-800' : 'border-slate-200';
  const containerClass = isDarkMode ? 'bg-slate-900' : 'bg-white';

  return (
    <div className={`flex flex-col h-full rounded-2xl border p-6 animate-pulse ${containerClass} ${borderClass}`}>
      {/* Meta Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
           <div className={`h-5 w-20 rounded-lg ${bgClass}`}></div>
           <div className={`h-5 w-8 rounded-lg ${bgClass}`}></div>
        </div>
        <div className={`h-5 w-16 rounded-full ${bgClass}`}></div>
      </div>

      {/* Title Area */}
      <div className="space-y-2 mb-6">
        <div className={`h-6 w-3/4 rounded-lg ${bgClass}`}></div>
        <div className={`h-6 w-1/2 rounded-lg ${bgClass}`}></div>
      </div>

      {/* Content Body */}
      <div className="flex-grow space-y-3 mb-6">
         <div className={`h-3 w-full rounded ${bgClass}`}></div>
         <div className={`h-3 w-full rounded ${bgClass}`}></div>
         <div className={`h-3 w-5/6 rounded ${bgClass}`}></div>
         <div className={`h-3 w-4/6 rounded ${bgClass}`}></div>
      </div>

      {/* Action Bar */}
      <div className={`pt-4 border-t flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
         <div className="flex gap-2">
            <div className={`h-10 w-10 rounded-xl ${bgClass}`}></div>
            <div className={`h-10 w-10 rounded-xl ${bgClass}`}></div>
            <div className={`h-10 w-10 rounded-xl ${bgClass}`}></div>
         </div>
         <div className="flex gap-2">
            <div className={`h-10 w-10 rounded-xl ${bgClass}`}></div>
            <div className={`h-10 w-20 rounded-xl ${bgClass}`}></div>
         </div>
      </div>
    </div>
  );
};

export default ArticleSkeleton;
