
import React from 'react';

interface Pattern {
  regex: RegExp;
  className: string;
  type: 'stat' | 'outcome' | 'design' | 'safety' | 'population' | 'neutral';
}

/**
 * Highlights medical text based on EBM patterns.
 */
export const highlightMedicalText = (text: string, isDarkMode: boolean): React.ReactNode => {
  if (!text) return null;

  // 1. Clean HTML tags strictly to plain text to avoid breaking regex
  const cleanText = text.replace(/<[^>]*>/g, ' ');

  // 2. Define Advanced EBM Highlighting Patterns
  const patterns: Pattern[] = [
    // A. SIGNIFICANT STATISTICS (Green) -> "Success Signal"
    {
      regex: /\b(p\s*[<]\s*0\.05|p\s*[<]\s*0\.01|p\s*[<]\s*0\.001|p\s*=\s*0\.0[0-4]\d*)\b/gi,
      className: isDarkMode 
        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold" 
        : "bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold",
      type: 'stat'
    },
    
    // B. NON-SIGNIFICANT (Gray/Muted) -> "Noise"
    {
      regex: /\b(p\s*=\s*NS|p\s*[>=]\s*0\.05|not significant|no significant difference)\b/gi,
      className: isDarkMode 
        ? "text-slate-500 decoration-slate-700 underline decoration-dotted" 
        : "text-slate-400 decoration-slate-300 underline decoration-dotted",
      type: 'neutral'
    },

    // C1. EFFECT SIZES - STRICT ACRONYMS (Blue) -> "Magnitude"
    // Case Sensitive (/g only, no i) to avoid "or" (lowercase) matching Odds Ratio (OR)
    {
      regex: /\b((?:HR|RR|OR)\s*[:=]?\s*\d+\.\d+)\b/g,
      className: isDarkMode 
        ? "bg-blue-500/20 text-blue-300 border-b-2 border-blue-500 font-mono" 
        : "bg-blue-50 text-blue-700 border-b-2 border-blue-400 font-mono font-bold",
      type: 'stat'
    },

    // C2. EFFECT SIZES - FULL TERMS (Blue)
    // Case Insensitive for full words
    {
      regex: /\b((?:Hazard Ratio|Odds Ratio|Relative Risk)\s*[:=]?\s*\d+\.\d+)\b/gi,
      className: isDarkMode 
        ? "bg-blue-500/20 text-blue-300 border-b-2 border-blue-500 font-mono" 
        : "bg-blue-50 text-blue-700 border-b-2 border-blue-400 font-mono font-bold",
      type: 'stat'
    },

    // D. STUDY DESIGN & QUALITY (Violet/Indigo) -> "Evidence Level"
    {
      regex: /\b(randomi[sz]ed controlled trial|rct|meta-analy|systematic review|prospective cohort|double-blind|multicenter|ensayo clínico|aleatorizado|prospectivo)\b/gi,
      className: isDarkMode 
        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" 
        : "bg-indigo-100 text-indigo-800 border border-indigo-200",
      type: 'design'
    },

    // E. HARD CLINICAL OUTCOMES (Amber/Orange) -> "Patient Impact"
    {
      regex: /\b(mortality|death|survival|esrd|kidney failure|dialysis|remission|hospitali[sz]ation|gfr decline|mortalidad|muerte|supervivencia|diálisis|fallo renal)\b/gi,
      className: isDarkMode 
        ? "bg-amber-500/10 text-amber-400 border-b border-amber-500/50" 
        : "bg-orange-50 text-orange-800 border-b border-orange-300 font-semibold",
      type: 'outcome'
    },

    // F. SAFETY & ADVERSE EVENTS (Rose/Red) -> "Warning"
    {
      regex: /\b(adverse event|side effect|bleed|infection|discontinuation|safety signal|complication|efecto adverso|sangrado|infección)\b/gi,
      className: isDarkMode 
        ? "bg-rose-900/30 text-rose-300 decoration-rose-500 underline" 
        : "bg-rose-50 text-rose-700 decoration-rose-400 underline",
      type: 'safety'
    },

    // G. ADVANCED METRICS (Teal/Cyan) -> "Precision"
    {
      regex: /\b(nnt|nnh|auc|c-statistic|sensitivity|specificity|confidence interval|95\s*%\s*CI|ci\s*[:=]\s*[\d\.\s,-]+)\b/gi,
      className: isDarkMode 
        ? "text-teal-400 text-[0.9em] font-mono tracking-tight" 
        : "text-teal-700 text-[0.9em] font-mono tracking-tight bg-teal-50/50 px-1 rounded",
      type: 'stat'
    },

    // H. POPULATION / SAMPLE SIZE (Purple)
    {
      regex: /\b(n\s*[:=]\s*\d+|participants|patients|subjects|pacientes|sujetos)\b/gi,
      className: isDarkMode 
        ? "text-purple-400 italic opacity-90" 
        : "text-purple-700 italic opacity-90",
      type: 'population'
    }
  ];

  // 3. Structural Regex to bold standard abstract sections
  const structuralRegex = /(?:^|\.\s+)(Introduction|Methods|Results|Conclusions|Objective|Background|Conclusion|Aim|Findings|Discusión|Métodos|Resultados|Conclusiones)[:\.]/gi;

  // Split matches logic
  const splitText = (input: string, patterns: Pattern[], keyPrefix: string = 'root'): React.ReactNode[] => {
    if (patterns.length === 0) return [input];

    const [currentPattern, ...rest] = patterns;
    const parts = input.split(currentPattern.regex);

    // Using any for the flatMap return to bypass strict JSX/ReactNode array compatibility issues
    return parts.flatMap((part, i): any => {
      // If matches current pattern
      if (currentPattern.regex.test(part)) {
         // Double check match to avoid false positives on split boundaries
         const match = part.match(currentPattern.regex);
         if (match && match[0] === part) {
             return [
               <span 
                 key={`${keyPrefix}-${currentPattern.type}-${i}`} 
                 className={`inline-block px-1 rounded-md mx-0.5 transition-colors duration-200 ${currentPattern.className}`}
               >
                 {part}
               </span>
             ];
         }
      }
      return splitText(part, rest, `${keyPrefix}-${i}`);
    });
  };

  // Main processing
  const parts = cleanText.split(structuralRegex);

  return (
    <span>
      {parts.map((part, i) => {
        // Structural Headers
        if (part.match(/^(Introduction|Methods|Results|Conclusions|Objective|Background|Conclusion|Aim|Findings|Discusión|Métodos|Resultados|Conclusiones)$/i)) {
            return (
                <strong key={`head-${i}`} className={`block font-black mt-4 mb-2 uppercase tracking-widest text-[10px] ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                    {part.toUpperCase()}
                </strong>
            );
        }
        
        // Content
        return (
            <span key={`content-${i}`}>
                {splitText(part, patterns, `chunk-${i}`)}
            </span>
        );
      })}
    </span>
  );
};
