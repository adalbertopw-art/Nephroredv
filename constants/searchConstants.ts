
export const calculateBaseClinicalScore = (title: string, abstract: string, source: string = "", topic: string = "", citationCount: number = 0, year: number = 0): number => {
  let score = 50;
  const textLower = (title + " " + abstract).toLowerCase();
  const titleLower = title.toLowerCase();
  const sourceLower = source.toLowerCase();

  // --- 0. STRICT VETERINARY & ANIMAL FILTER (Journal & Title Level) ---
  // Immediate disqualification for explicit veterinary journals
  const vetJournalTerms = ['veterinary', 'animals', 'zoology', 'equine', 'feline', 'canine', 'bovine', 'porcine', 'ovine', 'comparative medicine', 'laboratory animal', 'primatology'];
  if (vetJournalTerms.some(t => sourceLower.includes(t))) {
      return 0;
  }
  
  // --- 1. MURINE/ANIMAL/VETERINARY FILTER (Penalize Animals) ---
  const animalTerms = [
      "mice", "mouse", "rat ", "rats", "murine", "zebrafish", "drosophila", "in vitro", "biomarker discovery",
      "veterinary", "canine", "feline", "bovine", "porcine", "ovine", "dogs", "cats", "pigs", "sheep", "rabbits", "beagle", "monkey", "cynomolgus",
      "non-human", "primate", "macaque", "baboon", "hamster", "guinea pig", "gerbil"
  ];
  const humanTerms = ["human", "patient", "clinical", "people", "trial", "cohort", "epidemiology", "case report", "woman", "man", "child", "participant", "subject", "volunteer"];
  
  const hasAnimal = animalTerms.some(t => titleLower.includes(t) || abstract.toLowerCase().includes(t));
  const hasHuman = humanTerms.some(t => textLower.includes(t));
  
  if (hasAnimal && !hasHuman) {
      score -= 70; // Even heavier penalty for non-human studies
  } else if (hasAnimal && hasHuman) {
      score -= 20; // Moderate penalty for mixed studies (e.g., animal models for human disease)
  }

  // --- STRICT NEPHROLOGY ENFORCEMENT ---
  const isAuthorSearch = topic.toUpperCase().startsWith("AUTHOR:");
  if (!isAuthorSearch) {
      const kidneyRequired = ["kidney", "renal", "nephrology", "dialysis", "glomerul", "transplant", "urine", "aki", "ckd"];
      const hasKidneyTerm = kidneyRequired.some(k => textLower.includes(k));
      if (!hasKidneyTerm) {
          score -= 80;
      }
  }

  // --- 2. EVIDENCE PYRAMID ---
  if (titleLower.includes("kdigo") || titleLower.includes("guideline") || titleLower.includes("consensus") || titleLower.includes("position paper")) score += 45;
  else if (titleLower.includes("meta-analysis") || titleLower.includes("systematic review") || titleLower.includes("cochrane")) score += 35;
  else if (titleLower.includes("randomized") || titleLower.includes("rct") || titleLower.includes("clinical trial") || titleLower.includes("placebo-controlled")) score += 30;
  else if (titleLower.includes("prospective cohort") || titleLower.includes("multicenter") || titleLower.includes("registry study")) score += 20;
  else if (titleLower.includes("retrospective") || titleLower.includes("observational")) score += 5;
  else if (titleLower.includes("case report") || titleLower.includes("case series")) score -= 15;

  // --- 3. JOURNAL TIERING (Big 5 Boost & Nephrology Specifics) ---
  const tier1 = ["new england", "nejm", "lancet", "jama", "kidney international", "jasn", "nature medicine", "bmj", "annals of internal medicine"];
  const tier2 = ["cjasn", "ajkd", "ndt", "american journal of transplantation", "kidney international reports", "clinical kidney journal", "journal of nephrology"];
  const tier3 = ["bmc nephrology", "nephrology dialysis transplantation", "nephrology", "kidney", "renal"];
  
  if (tier1.some(j => sourceLower.includes(j))) score += 25;
  else if (tier2.some(j => sourceLower.includes(j))) score += 15;
  else if (tier3.some(j => sourceLower.includes(j))) score += 5;

  // --- 4. DISAMBIGUATION (Context Awareness) ---
  if (topic === 'Acute Kidney Injury') {
      if (titleLower.includes('maintenance') || titleLower.includes('chronic') || titleLower.includes('outpatient') || titleLower.includes('esrd')) score -= 40;
      if (titleLower.includes('critical care') || titleLower.includes('icu') || titleLower.includes('sepsis')) score += 10;
  }
  if (topic === 'Renal Transplant') {
      if (titleLower.includes('liver') || titleLower.includes('stem cell') || titleLower.includes('bone marrow') || titleLower.includes('heart')) {
           if (!titleLower.includes('kidney') && !titleLower.includes('renal')) score -= 50;
      }
      if (titleLower.includes('immunosuppression') || titleLower.includes('rejection') || titleLower.includes('allograft')) score += 10;
  }
  if (topic === 'Glomerular Diseases') {
      if (titleLower.includes('igA') || titleLower.includes('lupus') || titleLower.includes('nephrotic') || titleLower.includes('membranous')) score += 15;
  }

  // --- 5. FRESHNESS & CITATIONS (UPDATED FOR RECENCY & VELOCITY) ---
  const currentYear = new Date().getFullYear(); 
  
  // Massive boost for very recent (current or last year)
  if (year && year >= currentYear - 1) score += 35;
  // Standard boost for 2-3 years ago
  else if (year && year >= currentYear - 3) score += 15;
  // Penalty for older articles unless they are classics
  else if (year && year < currentYear - 5) score -= 40;
  
  // Citation Velocity (Simplified)
  if (citationCount > 0) {
      const yearsSincePub = Math.max(1, currentYear - year);
      const velocity = citationCount / yearsSincePub;
      score += Math.min(25, Math.log10(velocity + 1) * 10);
  }

  // --- 6. TOPIC-SPECIFIC KEYWORD BOOSTS ---
  const topicKeywords: Record<string, string[]> = {
    'Acute Kidney Injury': ['aki', 'rrt', 'crrt', 'creatinine', 'oliguria', 'biomarkers'],
    'Chronic Kidney Disease': ['ckd', 'gfr', 'egfr', 'progression', 'fibrosis', 'anemia'],
    'Renal Transplant': ['transplantation', 'allograft', 'rejection', 'immunosuppression', 'donor'],
    'Dialysis': ['hemodialysis', 'peritoneal', 'hd', 'pd', 'vascular access', 'fistula'],
    'Glomerular Diseases': ['glomerulonephritis', 'nephrotic', 'proteinuria', 'podocyte', 'complement'],
    'Hypertension': ['blood pressure', 'raas', 'aldosterone', 'resistant', 'preeclampsia'],
    'Electrolytes & Acid-Base': ['sodium', 'potassium', 'calcium', 'magnesium', 'acidosis', 'alkalosis']
  };

  if (topicKeywords[topic]) {
    const matches = topicKeywords[topic].filter(kw => titleLower.includes(kw) || abstract.toLowerCase().includes(kw));
    score += matches.length * 3;
  }

  return Math.max(0, Math.min(100, score));
};

export const getArticleImpactTier = (article: { source: string; title: string; category?: string }): number => {
  const sourceLower = (article.source || "").toLowerCase();
  const titleLower = (article.title || "").toLowerCase();
  const category = article.category || "";

  // Tier 0: Clinical Practice Guidelines (Absolute priority)
  if (titleLower.includes("kdigo") || titleLower.includes("guideline") || titleLower.includes("practice param")) return 0;

  // Tier 1: Top General Medical & Top Nephrology
  if (
    sourceLower.includes("new england") || sourceLower.includes("nejm") ||
    sourceLower.includes("lancet") ||
    sourceLower.includes("jama") ||
    sourceLower.includes("nature medicine") ||
    sourceLower.includes("bmj") ||
    sourceLower.includes("kidney international") || sourceLower === "kidney int" ||
    sourceLower.includes("jasn")
  ) return 1;

  // Tier 2: High Impact Nephrology
  if (
    sourceLower.includes("cjasn") ||
    sourceLower.includes("ajkd") ||
    sourceLower.includes("ndt") ||
    sourceLower.includes("nature reviews") ||
    sourceLower.includes("transplantation") ||
    sourceLower.includes("american journal of transplantation") ||
    sourceLower.includes("clinical kidney journal")
  ) return 2;
  
  // Tier 3: Standard Nephrology
  if (
    sourceLower.includes("bmc nephrology") ||
    sourceLower.includes("kidney int rep") ||
    sourceLower.includes("nephrology") || 
    sourceLower.includes("kidney") ||
    sourceLower.includes("renal")
  ) return 3;

  // Tier 4: Everything else
  return 4;
};
