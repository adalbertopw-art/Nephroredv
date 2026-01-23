
export const calculateBaseClinicalScore = (title: string, abstract: string, source: string = "", topic: string = "", citationCount: number = 0, year: number = 0): number => {
  let score = 50;
  const textLower = (title + " " + abstract).toLowerCase();
  const titleLower = title.toLowerCase();
  const sourceLower = source.toLowerCase();

  // --- 0. STRICT VETERINARY FILTER (Journal Level) ---
  // Immediate disqualification for explicit veterinary journals
  if (sourceLower.includes('veterinary') || sourceLower.includes('animals') || sourceLower.includes('zoology') || sourceLower.includes('equine') || sourceLower.includes('feline') || sourceLower.includes('canine')) {
      return 0;
  }
  
  // --- 1. MURINE/ANIMAL/VETERINARY FILTER (Penalize Animals) ---
  const animalTerms = [
      "mice", "mouse", "rat ", "rats", "murine", "zebrafish", "drosophila", "in vitro", "biomarker discovery",
      "veterinary", "canine", "feline", "bovine", "porcine", "ovine", "dogs", "cats", "pigs", "sheep", "rabbits", "beagle", "monkey", "cynomolgus"
  ];
  const humanTerms = ["human", "patient", "clinical", "people", "trial", "cohort", "epidemiology", "case report", "woman", "man", "child"];
  
  const hasAnimal = animalTerms.some(t => titleLower.includes(t) || abstract.toLowerCase().includes(t));
  const hasHuman = humanTerms.some(t => textLower.includes(t));
  
  if (hasAnimal && !hasHuman) {
      score -= 60; // Heavy penalty for non-human studies
  }

  // --- 2. EVIDENCE PYRAMID ---
  if (titleLower.includes("kdigo") || titleLower.includes("guideline") || titleLower.includes("consensus")) score += 40;
  else if (titleLower.includes("meta-analysis") || titleLower.includes("systematic review")) score += 30;
  else if (titleLower.includes("randomized") || titleLower.includes("rct") || titleLower.includes("clinical trial")) score += 25;
  else if (titleLower.includes("prospective cohort") || titleLower.includes("multicenter")) score += 15;
  else if (titleLower.includes("case report") || titleLower.includes("case series")) score -= 10;

  // --- 3. JOURNAL TIERING (Big 5 Boost) ---
  const tier1 = ["new england", "nejm", "lancet", "jama", "kidney international", "jasn", "nature medicine"];
  const tier2 = ["cjasn", "ajkd", "ndt", "american journal of transplantation"];
  
  if (tier1.some(j => sourceLower.includes(j))) score += 20;
  else if (tier2.some(j => sourceLower.includes(j))) score += 10;

  // --- 4. DISAMBIGUATION (Context Awareness) ---
  if (topic === 'Acute Kidney Injury') {
      if (titleLower.includes('maintenance') || titleLower.includes('chronic') || titleLower.includes('outpatient')) score -= 50;
  }
  if (topic === 'Renal Transplant') {
      if (titleLower.includes('liver') || titleLower.includes('stem cell') || titleLower.includes('bone marrow')) {
           if (!titleLower.includes('kidney') && !titleLower.includes('renal')) score -= 50;
      }
  }

  // --- 5. FRESHNESS & CITATIONS (UPDATED FOR RECENCY) ---
  const currentYear = new Date().getFullYear(); 
  
  // Massive boost for very recent (current or last year)
  if (year && year >= currentYear - 1) score += 30;
  // Standard boost for 2-3 years ago
  else if (year && year >= currentYear - 3) score += 10;
  // Penalty for older articles unless they are classics
  else if (year && year < currentYear - 4) score -= 30;
  
  if (citationCount > 0) {
      score += Math.min(20, Math.log10(citationCount) * 5);
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
