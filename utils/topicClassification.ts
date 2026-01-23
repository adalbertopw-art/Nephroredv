
import { Topic } from "../types";

export const detectArticleTopic = (title: string, summary: string, currentTopic: Topic): Topic => {
  const titleLower = title.toLowerCase();
  const summaryLower = summary.toLowerCase();
  const fullText = `${titleLower} ${summaryLower}`;

  // --- 0. SAFETY CHECKS (EXCLUSIONS) ---
  if (titleLower.includes('stem cell') || titleLower.includes('bone marrow') || titleLower.includes('corneal transplant') || titleLower.includes('liver transplant') || titleLower.includes('heart transplant') || titleLower.includes('lung transplant')) {
      if (!titleLower.includes('kidney') && !titleLower.includes('renal') && !titleLower.includes('combined') && !titleLower.includes('recipient')) {
          return currentTopic === 'Renal Transplant' ? 'General' : currentTopic;
      }
  }

  // --- 1. DEFINICIONES DE VOCABULARIO (REGEX) ---
  
  const gnRegex = /\b(glomerulo|nephritis|nefritis|iga nephropathy|igav|lupus|sle|vasculitis|anca|nephrotic|nefrótico|fsgs|membranous|membranosa|anti-gbm|minimal change|c3 glomerulopathy|podocytopathy|complement mediated|alport|fabry)\b/;

  const oncoRegex = /\b(cancer|cáncer|carcinoma|tumor|malignan|oncolog|rcc|renal\s+cell|nephrectomy|nefrectomía|urothelial|urotelial|cisplatin|checkpoint\s+inhibitor|immunotherapy|inmunoterapia|chemotherapy|quimioterapia|paraneoplastic|paraneoplásico|wilms|angiomyolipoma|onco-nephrology|onconefrología|tuberous sclerosis)\b/;

  const maintenancePhraseRegex = /\b(maintenance\s+h[ae]modialysis|chronic\s+h[ae]modialysis|h[ae]modiálisis\s+de\s+mantenimiento|diálisis\s+crónica|long-term\s+dialysis|esrd\s+patient|end-stage\s+renal\s+disease|enfermedad\s+renal\s+crónica\s+terminal|stable\s+h[ae]modialysis)\b/;

  const chronicKeywordsRegex = /\b(maintenance|chronic|crónica|crónico|mantenimiento|long-term|largo\s+plazo|esrd|end-stage|terminal|vintage|ambulatory|ambulatoria|outpatient|stable|estatble)\b/;
  
  const dialysisBaseRegex = /\b(dialysis|diálisis|h[ae]modialysis|h[ae]modiálisis|hemodiafiltration|hemodiafiltración|ultrafiltration|ultrafiltración)\b/;

  const pdRegex = /\b(peritoneal\s+dialysis|diálisis\s+peritoneal|capd|apd|pd\s+patients|peritonitis)\b/;

  const dialysisPatientRegex = /\b(h[ae]modialysis\s+patient|patient(s)?\s+on\s+h[ae]modialysis|receiving\s+h[ae]modialysis|undergoing\s+h[ae]modialysis|pacientes\s+en\s+hemodiálisis|pacientes\s+en\s+diálisis|recibiendo\s+hemodiálisis)\b/;

  const chronicIssuesRegex = /\b(sarcopenia|frailty|fragilidad|quality\s+of\s+life|calidad\s+de\s+vida|constipation|constipación|depression|depresión|malnutrition|malnutrición|pruritus|prurito|cognitive|cognitivo|sexual|fatigue|fatiga|vascular\s+access|acceso\s+vascular|fistula|fístula|graft\s+patency)\b/;

  // CRRT / Acute Support
  const crrtRegex = /\b(crrt|cvvh|cvvhd|hemofiltration|continuous\s+renal\s+replacement|sled|pirrt|continuous\s+venovenous|citrate\s+anticoagulation)\b/; 

  const transplantSpecific = /\b(allograft|graft|injerto|donor|donante|transplant|trasplante|immunosuppression|inmunosupresión|calcineurin|mtor|belatacept|tacrolimus|cyclosporine|mycophenolate|thymoglobulin|basiliximab)\b/;
  
  const akiSpecific = /\b(acute\s+kidney\s+injury|aki|lesión\s+renal\s+aguda|lra|tubular\s+necrosis|atin|contrast|contraste|sepsis|septic|rhabdomyolysis|rabdomiolisis|nephrotoxicity|nefrotoxicidad|oliguria|anuria|cardiorenal|cardio-renal|hepatorenal|icu|intensive\s+care|critically\s+ill)\b/;
  
  const ckdSpecific = /\b(chronic\s+kidney|ckd|erc|gfr\s+decline|albuminuria|proteinuria|diabetic|diabética|dkd|mineral\s+bone|ckd-mbd|anemia|fibrosis|polycystic|adpkd|autosomal\s+dominant)\b/;

  const htnSpecific = /\b(resistant\s+hypertension|hipertensión|renovascular|aldosteronism|blood\s+pressure|presión\s+arterial|antihypertensive|sympathetic\s+denervation)\b/;


  // --- 2. TITLE AUTHORITY (Strict Hierarchy) ---

  // A. TRANSPLANT (Highest priority for explicit transplant titles)
  if (transplantSpecific.test(titleLower) && (titleLower.includes('kidney') || titleLower.includes('renal') || titleLower.includes('recipient') || titleLower.includes('donor'))) {
      return 'Renal Transplant';
  }

  // B. ONCO-NEPHROLOGY
  if (oncoRegex.test(titleLower)) return 'Onco-Nephrology';

  // C. MAINTENANCE DIALYSIS (Strong Support)
  if (maintenancePhraseRegex.test(titleLower)) return 'Renal Support Therapies';
  if (pdRegex.test(titleLower) && !titleLower.includes('acute') && !titleLower.includes('aguda')) return 'Renal Support Therapies';

  // D. CRRT / ACUTE DIALYSIS (Ambiguity Resolution)
  if (crrtRegex.test(titleLower)) {
      // If purely technical (filters, anticoagulation) -> Support. 
      // If clinical/outcome focused in AKI context -> AKI.
      // Note: "icu", "sepsis" are in akiSpecific.
      const techTerms = /\b(filter|membrane|circuit|anticoagulation|citrate|adsorption|blood\s+flow|effluent|dose|machine|cartridge)\b/;
      
      // If technical terms exist and NO explicit clinical AKI context (like sepsis/icu/aki) in title
      if (techTerms.test(titleLower) && !akiSpecific.test(titleLower)) {
          return 'Renal Support Therapies';
      }
      return 'Acute Kidney Injury';
  }

  // E. AKI (Explicit)
  if (akiSpecific.test(titleLower)) {
      // Safety: Ensure it's not a CKD paper talking about "history of AKI"
      if (!ckdSpecific.test(titleLower) || titleLower.includes('acute') || titleLower.includes('injury')) {
          return 'Acute Kidney Injury';
      }
  }

  // F. GLOMERULAR
  if (gnRegex.test(titleLower)) return 'Glomerular Diseases';

  // G. DIALYSIS + CHRONIC CONTEXT
  if (dialysisBaseRegex.test(titleLower)) {
      if (chronicKeywordsRegex.test(titleLower) || dialysisPatientRegex.test(titleLower) || chronicIssuesRegex.test(titleLower)) {
          return 'Renal Support Therapies';
      }
      // "Hemodialysis" alone in title often implies the chronic therapy
      if (titleLower.includes('hemodialysis') || titleLower.includes('hemodiálisis')) {
          return 'Renal Support Therapies';
      }
  }

  // H. CKD
  if (ckdSpecific.test(titleLower)) return 'Chronic Kidney Disease';
  
  // I. HYPERTENSION
  if (htnSpecific.test(titleLower)) return 'Hypertension';


  // --- 3. SCORING SYSTEM (Fallback for ambiguous titles or abstracts) ---

  let scores = {
      'Glomerular Diseases': 0,
      'Renal Transplant': 0,
      'Acute Kidney Injury': 0,
      'Renal Support Therapies': 0,
      'Chronic Kidney Disease': 0,
      'Hypertension': 0,
      'Onco-Nephrology': 0
  };

  const addScore = (regex: RegExp, category: Topic, weight: number) => {
      const matches = fullText.match(new RegExp(regex.source, 'g')) || [];
      scores[category as keyof typeof scores] += (matches.length * weight);
  };

  addScore(oncoRegex, 'Onco-Nephrology', 5);
  addScore(gnRegex, 'Glomerular Diseases', 4);
  addScore(transplantSpecific, 'Renal Transplant', 4);
  addScore(akiSpecific, 'Acute Kidney Injury', 4);
  
  // Support Therapies Scoring
  addScore(maintenancePhraseRegex, 'Renal Support Therapies', 10);
  addScore(pdRegex, 'Renal Support Therapies', 5);
  addScore(dialysisBaseRegex, 'Renal Support Therapies', 3);
  addScore(chronicKeywordsRegex, 'Renal Support Therapies', 2); 
  addScore(chronicIssuesRegex, 'Renal Support Therapies', 3);
  
  // CRRT logic in scoring
  if (crrtRegex.test(fullText)) {
      if (akiSpecific.test(fullText) || fullText.includes('sepsis') || fullText.includes('icu') || fullText.includes('shock')) {
          scores['Acute Kidney Injury'] += 4;
      } else {
          scores['Renal Support Therapies'] += 3; // Technical CRRT
      }
  }

  addScore(ckdSpecific, 'Chronic Kidney Disease', 2);
  addScore(htnSpecific, 'Hypertension', 3);

  // --- 4. CONTEXTUAL ADJUSTMENTS ---

  // Fix 1: Maintenance/Chronic Dialysis is NOT AKI.
  const isChronicDialysisContext = 
      maintenancePhraseRegex.test(fullText) || 
      ((dialysisBaseRegex.test(fullText) || pdRegex.test(fullText)) && 
       (chronicKeywordsRegex.test(fullText) || dialysisPatientRegex.test(fullText) || chronicIssuesRegex.test(fullText)));

  if (isChronicDialysisContext) {
      scores['Acute Kidney Injury'] -= 50; 
      scores['Renal Support Therapies'] += 20;
  }

  // Fix 2: Exclusion of transplant in abstract (common in CKD studies)
  if (summaryLower.includes('excluded transplant') || summaryLower.includes('exclusion of transplant') || summaryLower.includes('non-transplant')) {
      scores['Renal Transplant'] -= 10; 
  }

  // Fix 3: Diabetic Nephropathy -> CKD (usually)
  if (fullText.includes('diabetic') && fullText.includes('nephropathy')) {
      scores['Chronic Kidney Disease'] += 5;
  }

  // --- 5. DETERMINE WINNER ---
  let maxScore = 0;
  let winner: Topic = currentTopic;

  for (const [topic, score] of Object.entries(scores)) {
      if (score > maxScore) {
          maxScore = score;
          winner = topic as Topic;
      }
  }

  // Threshold to switch
  if (maxScore < 3) return currentTopic;

  return winner;
};
