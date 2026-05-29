
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResearchUpdate, Article, Topic, Language, DeepAnalysisResult, ChatMessage, Comment } from "../types";

const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean || ['n/a', 'not available', 'no link', 'pending'].includes(clean.toLowerCase())) {
    return '';
  }
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }
  return `https://${clean}`;
};

/**
 * Initializes the AI client.
 * Prioritizes the user-provided key, falls back to the environment variable.
 */
const getAIClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
      console.warn("No Gemini API Key provided.");
  }
  return new GoogleGenAI({ apiKey: key || "" });
};

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    const rawError = error?.error || error;
    const msg = rawError?.message || JSON.stringify(error);
    const code = rawError?.status || rawError?.code;
    const isRetryable = code === 500 || code === 503 || msg.includes('fetch failed') || msg.includes('Rpc failed');
    if (isRetryable) {
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let clean = text.trim();
  if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '');
  } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '');
  }
  return clean.trim();
};

export const verifyGeminiKey = async (apiKey?: string): Promise<boolean> => {
    try {
        const ai = getAIClient(apiKey);
        await fetchWithRetry(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Test",
        }));
        return true;
    } catch (error) {
        return false;
    }
};

export const generateGeminiSummary = async (
  articles: Article[],
  topic: string,
  language: Language,
  apiKey?: string
): Promise<string> => {
  if (articles.length === 0) return "";
  try {
    const ai = getAIClient(apiKey);
    const contextArticles = articles.slice(0, 10).map((a, i) => 
        `[Study ${i+1}] Title: ${a.title}\nFindings: ${a.summary.substring(0, 500)}...`
    ).join("\n\n");
    
    // Updated prompt to focus specifically on "Scientific Developments"
    const systemPrompt = language === 'es'
        ? "Actúa como un Nefrólogo Académico Senior. Identifica y sintetiza los DESARROLLOS CIENTÍFICOS y hallazgos clínicos más relevantes de los estudios proporcionados (2025-2026). Estructura la respuesta para responder claramente: ¿Cuáles son los avances recientes?"
        : "Act as a Senior Academic Nephrologist. Identify and synthesize the most relevant SCIENTIFIC DEVELOPMENTS and clinical findings from the provided studies (2025-2026). Structure the answer to address: What are the recent advances?";
    
    const prompt = `${systemPrompt}\n\nTopic: ${topic}\n\nStudies:\n${contextArticles}`;
    const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
    }));
    return response.text || "";
  } catch (error) {
      return "";
  }
};

export const searchMedicalGoogle = async (
    query: string,
    language: Language = 'es',
    apiKey?: string
): Promise<ResearchUpdate> => {
    const ai = getAIClient(apiKey);

    const prompt = `
        Search Google for the MOST RECENT and scientifically relevant articles, news, or clinical trial updates regarding: "${query}".
        Current year is 2026. PRIORITIZE publications from 2025 and 2026.
        Focus: Medical Research / Clinical Evidence.
        
        For each article, generate a "Clinical TL;DR" impact capsule:
        1. "change": What practice, treatment, or consensus changed?
        2. "population": To exactly whom does this apply? (e.g., CKD G4 patients with proteinuria).
        
        Return JSON object with 'articles' array. 
        Format: { "articles": [{ "title": "...", "summary": "...", "source": "...", "url": "...", "date": "YYYY-MM-DD", "category": "Research", "relevanceScore": 95, "clinicalTldr": { "change": "...", "population": "..." } }] }
    `;

    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        articles: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    summary: { type: Type.STRING },
                                    source: { type: Type.STRING },
                                    url: { type: Type.STRING },
                                    date: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    relevanceScore: { type: Type.NUMBER },
                                    clinicalTldr: {
                                        type: Type.OBJECT,
                                        properties: {
                                            change: { type: Type.STRING },
                                            population: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }));

        const result = JSON.parse(cleanJson(response.text || '{}')) as ResearchUpdate;
        if (result.articles) {
            result.articles = result.articles.map((a, i) => ({
                ...a,
                id: `goog-${Date.now()}-${i}`,
                authors: "Evidence via Google Search",
                isFree: true,
                url: sanitizeUrl(a.url)
            }));
        }
        return result || { summary: "", articles: [] };
    } catch (e) {
        return { summary: "", articles: [] };
    }
};

export const translateSimpleQuery = async (query: string, apiKey?: string): Promise<string> => {
    if (!query) return query;
    const ai = getAIClient(apiKey);
    const prompt = `Act as an expert Nephrology research librarian. Refine the following manual search query:
    1. Translate the query from Spanish (or any language) to English.
    2. Map the concepts to highly specific, relevant MeSH (Medical Subject Headings) terms focused on Nephrology and related conditions.
    3. Combine them using standard Boolean operators (AND, OR).
    
    Target: High-impact medical databases (PubMed, OpenAlex, Semantic Scholar).
    Format: Return ONLY the boolean query string.
    Rules:
    - Prioritize Nephrology-specific MeSH terms (e.g., "Kidney Failure, Chronic" instead of just "Kidney Disease").
    - Balance specificity with recall: Use "OR" for synonyms and "AND" only for truly essential distinct concepts.
    - Do NOT use database-specific tags like [MeSH] or [Title/Abstract] to ensure compatibility across different APIs, but use parentheses to group terms logically.
    - No extra text, quotes, or explanation.
    
    Query: "${query}"`;
    
    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        }));
        return response.text?.trim() || query;
    } catch (e) {
        return query;
    }
};

export const refinePicoTerms = async (
    p: string, i: string, c: string, o: string, apiKey?: string
): Promise<{ p: string; i: string; c: string; o: string }> => {
    const ai = getAIClient(apiKey);
    const prompt = `Refine and translate PICO terms for a broad medical database search into highly specific English medical keywords: P:"${p}" I:"${i}" C:"${c}" O:"${o}". 
    Ensure terms are standard medical English (MeSH-aligned keywords) but avoid using bracketed tags like [MeSH] to maintain compatibility with non-PubMed APIs.
    Return JSON.`;
    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text || '{}'));
    } catch (e) {
        return { p, i, c, o };
    }
};

export const generateVisualAbstract = async (
    title: string, summary: string, language: Language, apiKey?: string
): Promise<string | null> => {
    const ai = getAIClient(apiKey);
    const prompt = `Act as a data visualization expert. Create a MERMAID.JS flowchart that visually summarizes the methods and results of this study. 
    Title: ${title}. Abstract: ${summary}. 
    Return ONLY the code for the diagram, no explanations or markdown blocks.`;
    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        }));
        return response.text || null;
    } catch (e) {
        return null;
    }
};

export const fetchClinicalSuggestions = async (
    query: string,
    apiKey?: string
): Promise<string[]> => {
    if (!query || query.length < 2) return [];
    
    const ai = getAIClient(apiKey);
    const prompt = `Act as a medical autocomplete system. The user is typing a search query related to Nephrology or general medicine: "${query}".
    Suggest 5 highly relevant, specific medical terms, drug names, diseases, or clinical concepts that complete or relate to this query.
    Return ONLY a JSON array of strings. No markdown, no explanations.
    Example: ["diabetic nephropathy", "dialysis", "diuretics"]`;

    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        const text = cleanJson(response.text || '[]');
        const suggestions = JSON.parse(text);
        return Array.isArray(suggestions) ? suggestions : [];
    } catch (e) {
        console.error("Autocomplete Failed", e);
        return [];
    }
};

export const fetchLatestNephrologyNews = async (
  topic: Topic = 'General', 
  language: Language = 'es',
  customQuery?: string,
  apiKey?: string
): Promise<ResearchUpdate> => {
  const ai = getAIClient(apiKey);
  const prompt = `Find top scientific Nephrology developments for 2026 regarding "${customQuery || topic}" using Google Search. Focus on breakthroughs from 2025 and 2026. Return JSON.`;
  try {
    const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    }));
    const result = JSON.parse(cleanJson(response.text || '{"summary":"", "articles":[]}')) as ResearchUpdate;
    if (result.articles) {
      result.articles = result.articles.map((article, index) => ({
        ...article,
        id: article.id || `art-ai-${Date.now()}-${index}`,
        url: sanitizeUrl(article.url)
      }));
    }
    return result;
  } catch (error: any) {
    throw error;
  }
};

export const fetchRelatedArticles = async (articleTitle: string, language: Language = 'es', apiKey?: string): Promise<Article[]> => {
  try {
    const ai = getAIClient(apiKey);
    const prompt = `Find 3 high-impact related clinical articles for: "${articleTitle}". Return JSON.`;
    const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" },
    }));
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    return [];
  }
};

// --- NEW DEEP ANALYSIS & CHAT FEATURES ---

export const generateDeepAnalysis = async (
    title: string,
    content: string, // Full text or Summary
    apiKey?: string
): Promise<DeepAnalysisResult | null> => {
    const ai = getAIClient(apiKey);
    const prompt = `Act as an expert Academic Nephrologist. Perform a rigorous Methodological and Clinical Analysis of the following study.
    
    Target Structure (JSON):
    1. keyResults: Array of objects { group: "Intervention/Control", outcome: "Primary Outcome", pValue: "0.0x" }. Summarize quantitative data table.
    2. biasRisk: "Low", "Moderate", or "High".
    3. biasReason: Short explanation of bias assessment (e.g. "Open-label design", "Loss to follow-up").
    4. limitations: Array of strings listing methodological limitations.
    5. pico: Object { patient: "...", intervention: "...", outcome: "..." }. Extract PICO components.

    Study Title: ${title}
    Study Content: ${content.substring(0, 15000)} (Truncated if too long)`;

    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text || '{}')) as DeepAnalysisResult;
    } catch (e) {
        console.error("Deep Analysis Failed", e);
        return null;
    }
};

export const chatWithArticle = async (
    history: ChatMessage[],
    newMessage: string,
    context: string, // Article full text or summary
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    const systemPrompt = `You are an expert Nephrology Research Assistant. You are analyzing a specific scientific article.
    Context:
    ${context.substring(0, 20000)}...
    
    Instructions:
    1. Answer ONLY based on the provided text. If the text doesn't say, state "The article does not specify...".
    2. Be precise with data (doses, p-values, N).
    3. Keep answers concise and clinical.`;

    const historyParts = history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
    }));

    const chatSession = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction: systemPrompt },
        history: historyParts
    });

    try {
        const result = await chatSession.sendMessage({ message: newMessage });
        return result.text || "No response generated.";
    } catch (e) {
        console.error("Chat Failed", e);
        return "Error connecting to AI assistant.";
    }
};

export const generateModeratorComment = async (
    comments: Comment[],
    articleTitle: string,
    articleSummary: string,
    apiKey?: string,
    isGeneralForum?: boolean
): Promise<string> => {
    const ai = getAIClient(apiKey);
    const threadContext = comments.map(c => `${c.user_name} said: ${c.content}`).join("\n");
    
    let prompt = '';
    
    if (isGeneralForum) {
        prompt = `Act as an Expert Clinical Consultant in a Medical Community Forum.
        Your goal is to provide evidence-based insights, differential diagnoses, or point out clinical guidelines relevant to the ongoing discussion.
        
        Current Discussion:
        ${threadContext}
        
        Instructions:
        1. Identify the core clinical question or case being discussed.
        2. Provide a concise, evidence-based perspective or suggest a differential diagnosis/management step.
        3. Ask a follow-up question to the community to stimulate further clinical reasoning.
        4. Be concise (max 3 sentences).
        5. Maintain a professional, collegial tone.
        
        Generate the consultant comment in Spanish.`;
    } else {
        prompt = `Act as a "Devil's Advocate" Scientific Moderator in a Journal Club.
        Your goal is to break confirmation bias and challenge weak arguments in the discussion thread politely but rigorously.
        
        Article: ${articleTitle}
        Summary: ${articleSummary}
        
        Current Discussion:
        ${threadContext}
        
        Instructions:
        1. Identify logical fallacies or overlooked limitations in the study that the users are ignoring.
        2. Ask a provocative scientific question to stimulate critical thinking.
        3. Be concise (max 2 sentences).
        4. Do NOT be rude. Be purely academic.
        
        Generate the moderator comment in Spanish.`;
    }

    try {
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        }));
        return response.text || "Interesting points. However, have we considered the limitations of the sample size in this cohort?";
    } catch (e) {
        return "Critical analysis required. Please consider potential confounders.";
    }
};
