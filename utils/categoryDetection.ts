
import { Article } from "../types";

/**
 * Detecta la categoría de un artículo basándose en patrones semánticos del título y abstract.
 * Prioridad de detección: Retraction (Alert) > Guideline > Clinical Trial > Meta-Analysis > Cohort > Case Study > Review > Research
 */
export const detectArticleCategory = (title: string, summary: string, source: string = ""): Article['category'] => {
  const text = (title + " " + summary).toLowerCase();
  const titleLower = title.toLowerCase();
  const sourceLower = source.toLowerCase();

  // 0. ALERTAS / RETRACTIONS (Prioridad Máxima - Rojo)
  const isRetraction = 
    /\b(retraction|retracted|withdrawn|expression of concern)\b/i.test(titleLower) ||
    /^retraction:/.test(titleLower);

  if (isRetraction) return 'Retraction';

  // 1. GUIDELINES / CONSENSUS (Prioridad Alta - Verde)
  const isGuideline = 
    /\b(kdigo|guideline|consensus|practice param|position statement|recommendation|guía de práctica|consenso)\b/.test(titleLower) ||
    sourceLower.includes('kdigo') ||
    sourceLower.includes('cochrane database'); // Cochrane usually implies high standard reviews/guidance
    
  if (isGuideline) return 'Guideline';

  // 2. ENSAYOS CLÍNICOS (Clinical Trial - Azul Intenso)
  const isTrial = 
    /\bnct\d{8}\b/i.test(text) || // Registro NCT
    /\b(randomized|randomised|aleatorizado)\b/.test(titleLower) ||
    /\b(rct|clinical trial|ensayo clínico)\b/.test(titleLower) ||
    /\bphase [1-4] (trial|study)\b/.test(titleLower) ||
    sourceLower.includes("clinicaltrials.gov");
  
  if (isTrial) return 'Clinical Trial';

  // 3. META-ANALYSIS / SYSTEMATIC REVIEW (Meta-Analysis - Púrpura)
  const isMeta = 
    /\b(meta-analysis|metaanálisis|systematic review|revisión sistemática)\b/.test(titleLower) ||
    ( /\b(pooled analysis|synthesis)\b/.test(titleLower) && /\bdata\b/.test(titleLower) );

  if (isMeta) return 'Meta-Analysis';

  // 4. COHORT / OBSERVATIONAL (Cohort - Azul/Slate)
  const isCohort = 
    /\b(cohort|prospective|retrospective|observational|longitudinal|registry|cross-sectional|transversal|multicenter study)\b/.test(titleLower) ||
    /\b(hazard ratio|risk of|association between)\b/.test(titleLower); // Títulos que sugieren asociación

  if (isCohort) return 'Cohort';

  // 5. REPORTES DE CASO (Case Study - Rosa)
  const isCaseStudy = 
    /\b(case report|reporte de caso|case series|serie de casos)\b/.test(titleLower) ||
    /\b(a \d+-year-old)\b/.test(titleLower) ||
    /\b(una? paciente de \d+ años)\b/.test(summary.toLowerCase()) ||
    /^case report:/.test(titleLower) ||
    /\bunusual presentation of\b/.test(titleLower);

  if (isCaseStudy) return 'Case Study';

  // 6. NOTICIAS / EDITORIALES (News - Amarillo)
  const isNews = 
    sourceLower.includes("news") || 
    sourceLower.includes("reuters") ||
    sourceLower.includes("medscape") ||
    sourceLower.includes("blog") ||
    /\b(breaking news|update on|editorial|commentary|perspective|news:|in brief)\b/.test(titleLower);

  if (isNews) return 'News';

  // 7. REVIEWS (Review - Naranja/Amber)
  // Revisiones narrativas que no son sistemáticas
  const isReview = 
    /\b(review|overview|update on|current concepts|review article|minireview)\b/.test(titleLower) ||
    /\b(mechanism of|pathophysiology of|advances in)\b/.test(titleLower); // Títulos explicativos suelen ser reviews

  if (isReview) return 'Review';

  // 8. Fallback: INVESTIGACIÓN PRIMARIA GENERAL
  return 'Research';
};

export type StudyDesign = 'RCT' | 'Meta-Analysis' | 'Guideline' | 'Cohort' | 'Review' | 'Case Report' | 'Basic Science' | 'Other';

export const detectStudyDesign = (article: { title: string; summary: string; source?: string; category?: string }): StudyDesign => {
  const cat = article.category;
  
  if (cat === 'Guideline') return 'Guideline';
  if (cat === 'Meta-Analysis') return 'Meta-Analysis';
  if (cat === 'Clinical Trial') return 'RCT';
  if (cat === 'Cohort') return 'Cohort';
  if (cat === 'Case Study') return 'Case Report';
  if (cat === 'Review') return 'Review';

  const text = (article.title + " " + article.summary).toLowerCase();

  // Fallback pattern matching if category missed it
  if (/\b(mice|mouse|rat|rats|murine|in vitro|cell line|zebrafish)\b/.test(text) && !/\b(human|patient|clinical)\b/.test(text)) {
      return 'Basic Science';
  }

  return 'Other';
};
