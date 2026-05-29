export const JOURNAL_LOGOS: Record<string, string> = {
  'NEJM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_New_England_Journal_of_Medicine_logo.svg/1200px-The_New_England_Journal_of_Medicine_logo.svg.png',
  'Lancet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Lancet_logo.svg/1200px-The_Lancet_logo.svg.png',
  'JASN': 'https://www.asn-online.org/images/jasn_logo.png',
  'Kidney International': 'https://www.kidney-international.org/pb/assets/raw/Health%20Advance/journals/kint/kint_logo.png',
  'CJASN': 'https://www.asn-online.org/images/cjasn_logo.png',
  'JAMA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/JAMA_logo.svg/1200px-JAMA_logo.svg.png',
  'BMJ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/BMJ_logo.svg/1200px-BMJ_logo.svg.png',
  'Nature Reviews Nephrology': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Nature_Reviews_Nephrology_logo.svg/1200px-Nature_Reviews_Nephrology_logo.svg.png',
  'NDT': 'https://academic.oup.com/view-large/logo/ndt.png',
  'AJKD': 'https://www.ajkd.org/pb/assets/raw/Health%20Advance/journals/ajkd/ajkd_logo.png',
  'Circulation': 'https://www.ahajournals.org/pb/assets/raw/Health%20Advance/journals/circ/circ_logo.png'
};

export const getJournalLogo = (source: string): string | null => {
  if (!source) return null;
  const normalizedSource = source.toLowerCase();
  for (const [name, logo] of Object.entries(JOURNAL_LOGOS)) {
    if (normalizedSource.includes(name.toLowerCase())) {
      return logo;
    }
  }
  return null;
};
