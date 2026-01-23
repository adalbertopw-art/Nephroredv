
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
      return '(concepts.id:C168038930 OR title:"kidney transplantation")';
    case 'Acute Kidney Injury':
      return '(concepts.id:C50294073 OR title:"acute kidney injury") NOT (title:chronic OR title:dialysis)';
    case 'Chronic Kidney Disease':
      return '(concepts.id:C152309569 OR title:"chronic kidney disease")';
    case 'Glomerular Diseases':
      return '(concepts.id:C55738837 OR title:glomerulonephritis OR title:"iga nephropathy")';
    case 'Hypertension':
      return '(concepts.id:C1459194 AND (title:renal OR title:kidney))';
    case 'Renal Support Therapies':
      return '(concepts.id:C29633887 OR title:hemodialysis OR title:"peritoneal dialysis")';
    case 'Onco-Nephrology':
      return '(title:"kidney cancer" OR title:"renal cell carcinoma" OR title:"onco-nephrology")';
    case 'General':
    default:
      // Broadened to the general Nephrology concept without restricting by publication type
      return '(concepts.id:C127413603 OR title:nephrology OR title:kidney)';
  }
};

// --- EuropePMC (MESH_HEADING Syntax) ---
export const getEPMCTopicQuery = (topic: Topic | string): string => {
  switch (topic) {
    case 'Renal Transplant':
      return '(MESH_HEADING:"Kidney Transplantation" OR TITLE:"Kidney Transplantation")';
    case 'Acute Kidney Injury':
      return '(MESH_HEADING:"Acute Kidney Injury" OR TITLE:"Acute Kidney Injury" OR TITLE:"AKI") NOT TITLE:"Chronic"';
    case 'Chronic Kidney Disease':
      return '(MESH_HEADING:"Renal Insufficiency, Chronic" OR TITLE:"Chronic Kidney Disease")';
    case 'Glomerular Diseases':
      return '(MESH_HEADING:"Glomerulonephritis" OR TITLE:"Glomerulonephritis")';
    case 'Hypertension':
      return '(MESH_HEADING:"Hypertension, Renal" OR TITLE:"Renal Hypertension")';
    case 'Renal Support Therapies':
      return '(MESH_HEADING:"Renal Dialysis" OR TITLE:"Hemodialysis" OR TITLE:"Peritoneal Dialysis")';
    case 'Onco-Nephrology':
      return '(MESH_HEADING:"Kidney Neoplasms" OR TITLE:"Renal Cell Carcinoma")';
    case 'General':
    default:
      // Broadened to general Kidney/Nephrology terms
      return '(MESH_HEADING:"Kidney Diseases" OR TITLE:"Nephrology" OR TITLE:"Kidney")';
  }
};

// --- Semantic Scholar (Keywords) ---
export const getS2TopicQuery = (topic: Topic | string): string => {
    switch (topic) {
      case 'Renal Transplant':
        return '"kidney transplantation"|"renal transplantation"';
      case 'Acute Kidney Injury':
        return '"acute kidney injury"|"AKI" -chronic';
      case 'Chronic Kidney Disease':
        return '"chronic kidney disease"|"CKD"';
      case 'Glomerular Diseases':
        return '"glomerulonephritis"|"iga nephropathy"';
      case 'Hypertension':
        return '"renal hypertension"';
      case 'Renal Support Therapies':
        return '"hemodialysis"|"peritoneal dialysis"';
      case 'Onco-Nephrology':
        return '"renal cell carcinoma"|"kidney cancer"';
      case 'General':
      default:
        // Broadened to general Nephrology terms
        return '"Nephrology"|"Kidney"|"Renal"';
    }
};

// --- LILACS / BVS (DeCS/MeSH simple boolean) ---
export const getLilacsTopicQuery = (topic: Topic | string): string => {
  // LILACS search engine works best with simple boolean descriptors
  // It searches in English, Spanish and Portuguese simultaneously via DeCS
  switch (topic) {
    case 'Renal Transplant':
      return '(ti:"kidney transplantation" OR ti:"trasplante de riñon" OR ti:"transplante de rim" OR mh:"Kidney Transplantation")';
    case 'Acute Kidney Injury':
      return '(ti:"acute kidney injury" OR ti:"lesion renal aguda" OR ti:"injuria renal aguda" OR mh:"Acute Kidney Injury")';
    case 'Chronic Kidney Disease':
      return '(ti:"chronic kidney disease" OR ti:"enfermedad renal cronica" OR ti:"insuficiencia renal cronica" OR mh:"Renal Insufficiency, Chronic")';
    case 'Glomerular Diseases':
      return '(ti:"glomerulonephritis" OR ti:"glomerulonefritis" OR ti:"iga nephropathy" OR mh:"Glomerulonephritis")';
    case 'Hypertension':
      return '(ti:"renal hypertension" OR ti:"hipertension renal" OR mh:"Hypertension, Renal")';
    case 'Renal Support Therapies':
      return '(ti:"hemodialysis" OR ti:"hemodiálisis" OR ti:"peritoneal dialysis" OR mh:"Renal Dialysis")';
    case 'Onco-Nephrology':
      return '(ti:"renal cell carcinoma" OR ti:"carcinoma de celulas renales" OR ti:"kidney neoplasms")';
    case 'General':
    default:
      return '(nephrology OR nefrologia OR kidney OR riñon OR rim)';
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