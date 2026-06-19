
import { Topic } from "../types";

// --- PubMed (MeSH Optimized & Strict) ---
export const getPubMedTopicQuery = (topic: Topic | string): string => {
  const baseFilter = 'NOT ("Animals"[MeSH] NOT "Humans"[MeSH])';
  
  switch (topic) {
    case 'Renal Transplant':
      return `("Kidney Transplantation"[MeSH Major Topic] OR "Kidney Transplantation"[Title]) AND ("Humans"[MeSH]) ${baseFilter}`;
    
    case 'Acute Kidney Injury':
      return `("Acute Kidney Injury"[MeSH Major Topic] OR "Acute Kidney Injury"[Title]) NOT ("Renal Replacement Therapy"[MeSH Major Topic] OR "Renal Dialysis"[MeSH Major Topic] OR "Chronic"[Title]) ${baseFilter}`;
    
    case 'Chronic Kidney Disease':
      return `("Renal Insufficiency, Chronic"[MeSH Major Topic] OR "Chronic Kidney Disease"[Title] OR "Diabetic Nephropathies"[MeSH Major Topic]) ${baseFilter}`;
    
    case 'Glomerular Diseases':
      return `("Glomerulonephritis"[MeSH Major Topic] OR "Lupus Nephritis"[MeSH] OR "IgA Nephropathy"[Title]) ${baseFilter}`;
    
    case 'Hypertension':
      return `("Hypertension, Renal"[MeSH Major Topic] OR ("Hypertension"[Title] AND "Kidney"[Title])) ${baseFilter}`;
    
    case 'Renal Support Therapies':
      return `("Renal Dialysis"[MeSH Major Topic] OR "Renal Replacement Therapy"[MeSH Major Topic] OR "Hemodialysis"[Title] OR "Peritoneal Dialysis"[Title]) NOT ("Acute Kidney Injury"[Title]) ${baseFilter}`;
    
    case 'Onco-Nephrology':
      return `("Kidney Neoplasms"[MeSH Major Topic] OR "Carcinoma, Renal Cell"[MeSH] OR "Onco-Nephrology"[Title]) ${baseFilter}`;
    
    case 'General':
    default:
      // Broadened to include all Human Kidney Diseases/Nephrology articles, regardless of type
      return `("Kidney Diseases"[MeSH Major Topic] OR "Nephrology"[Title] OR "Kidney"[Title]) AND "Humans"[MeSH] ${baseFilter}`;
  }
};

// --- OpenAlex (Concept IDs & Boolean Logic) ---
export const getOpenAlexTopicQuery = (topic: Topic | string): string => {
  switch (topic) {
    case 'Renal Transplant':
      return '"kidney transplantation"';
    case 'Acute Kidney Injury':
      return '"acute kidney injury"';
    case 'Chronic Kidney Disease':
      return '"chronic kidney disease"';
    case 'Glomerular Diseases':
      return 'glomerulonephritis OR "iga nephropathy"';
    case 'Hypertension':
      return '"renal hypertension" OR "hypertensive nephropathy"';
    case 'Renal Support Therapies':
      return 'hemodialysis OR "peritoneal dialysis"';
    case 'Onco-Nephrology':
      return '"kidney cancer" OR "renal cell carcinoma"';
    case 'General':
    default:
      // Broadened to the general Nephrology concept without restricting by publication type
      return 'nephrology OR kidney';
  }
};

// --- EuropePMC (MESH Syntax) ---
export const getEPMCTopicQuery = (topic: Topic | string): string => {
  switch (topic) {
    case 'Renal Transplant':
      return '(MESH:"Kidney Transplantation" OR TITLE:"Kidney Transplantation")';
    case 'Acute Kidney Injury':
      return '(MESH:"Acute Kidney Injury" OR TITLE:"Acute Kidney Injury" OR TITLE:"AKI") NOT TITLE:"Chronic"';
    case 'Chronic Kidney Disease':
      return '(MESH:"Renal Insufficiency, Chronic" OR TITLE:"Chronic Kidney Disease")';
    case 'Glomerular Diseases':
      return '(MESH:"Glomerulonephritis" OR TITLE:"Glomerulonephritis")';
    case 'Hypertension':
      return '(MESH:"Hypertension, Renal" OR TITLE:"Renal Hypertension")';
    case 'Renal Support Therapies':
      return '(MESH:"Renal Dialysis" OR TITLE:"Hemodialysis" OR TITLE:"Peritoneal Dialysis")';
    case 'Onco-Nephrology':
      return '(MESH:"Kidney Neoplasms" OR TITLE:"Renal Cell Carcinoma")';
    case 'General':
    default:
      // Broadened to general Kidney/Nephrology terms
      return '(MESH:"Kidney Diseases" OR TITLE:"Nephrology" OR TITLE:"Kidney")';
  }
};

// --- Semantic Scholar (Keywords) ---
export const getS2TopicQuery = (topic: Topic | string): string => {
    switch (topic) {
      case 'Renal Transplant':
        return 'kidney transplantation';
      case 'Acute Kidney Injury':
        return 'acute kidney injury';
      case 'Chronic Kidney Disease':
        return 'chronic kidney disease';
      case 'Glomerular Diseases':
        return 'glomerulonephritis';
      case 'Hypertension':
        return 'renal hypertension';
      case 'Renal Support Therapies':
        return 'hemodialysis';
      case 'Onco-Nephrology':
        return 'kidney cancer';
      case 'General':
      default:
        return 'nephrology';
    }
};

// --- LILACS / BVS (DeCS/MeSH simple boolean) ---
export const getLilacsTopicQuery = (topic: Topic | string): string => {
  switch (topic) {
    case 'Renal Transplant':
      return '(tw:"kidney transplantation") OR (tw:"trasplante de rinon") OR (tw:"transplante de rim")';
    case 'Acute Kidney Injury':
      return '(tw:"acute kidney injury") OR (tw:"lesion renal aguda") OR (tw:"injuria renal aguda")';
    case 'Chronic Kidney Disease':
      return '(tw:"chronic kidney disease") OR (tw:"enfermedad renal cronica") OR (tw:"insuficiencia renal cronica")';
    case 'Glomerular Diseases':
      return '(tw:"glomerulonephritis") OR (tw:"glomerulonefritis") OR (tw:"iga nephropathy")';
    case 'Hypertension':
      return '(tw:"renal hypertension") OR (tw:"hipertension renal")';
    case 'Renal Support Therapies':
      return '(tw:"hemodialysis") OR (tw:"hemodialisis") OR (tw:"peritoneal dialysis")';
    case 'Onco-Nephrology':
      return '(tw:"renal cell carcinoma") OR (tw:"carcinoma de celulas renales") OR (tw:"kidney neoplasms")';
    case 'General':
    default:
      return '(tw:"nephrology") OR (tw:"nefrologia") OR (tw:"kidney") OR (tw:"rinon") OR (tw:"rim")';
  }
};

export const getClinicalTrialsQuery = (topic: Topic | string): string => {
    switch (topic) {
      case 'Renal Transplant': return 'Kidney Transplantation';
      case 'Acute Kidney Injury': return 'Acute Kidney Injury';
      case 'Chronic Kidney Disease': return 'Chronic Kidney Disease';
      case 'Glomerular Diseases': return 'Glomerulonephritis';
      case 'Hypertension': return 'Renal Hypertension';
      case 'Renal Support Therapies': return 'Dialysis';
      case 'Onco-Nephrology': return 'Renal Cell Carcinoma';
      case 'General': default: return 'Kidney Disease';
    }
};

export const getGeneralTopicQuery = (topic: Topic | string): string => {
    switch (topic) {
        case 'Renal Transplant': return 'kidney transplantation';
        case 'Acute Kidney Injury': return 'acute kidney injury';
        case 'Chronic Kidney Disease': return 'chronic kidney disease';
        case 'Glomerular Diseases': return 'glomerulonephritis';
        case 'Hypertension': return 'renal hypertension';
        case 'Renal Support Therapies': return 'hemodialysis';
        case 'Onco-Nephrology': return 'kidney cancer';
        default: return 'nephrology kidney';
    }
};