
import { Article, Language } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

// Models to try in order of preference/capability
const GROQ_MODELS_PRIORITY = [
    "llama-3.3-70b-versatile", // Top tier, latest
    "llama-3.1-70b-versatile", // Stable high intel
    "llama3-70b-8192",         // Legacy high intel
    "mixtral-8x7b-32768",      // Good fallback
    "llama-3.1-8b-instant"     // Fastest fallback
];

export const verifyGroqKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  const cleanKey = apiKey.trim();
  
  try {
    const response = await fetch(GROQ_MODELS_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (response.status === 200) {
        return true;
    } else {
        try {
            const errBody = await response.text();
            console.warn(`Groq Verification Failed: ${response.status} - ${errBody}`);
        } catch {
            console.warn(`Groq Verification Failed: HTTP ${response.status}`);
        }
        return false;
    }
  } catch (e) {
    console.error("Groq verification network error", e);
    return false;
  }
};

// Generic helper to try models sequentially
async function tryGroqGeneration(
    messages: any[],
    apiKey: string,
    maxTokens: number = 500,
    temperature: number = 0.3
): Promise<string | null> {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('REQUIRE_API_KEY', { detail: { provider: 'groq' } }));
        }
        throw new Error("MISSING_API_KEY");
    }
    const cleanKey = apiKey.trim();
    let lastError = null;

    for (const model of GROQ_MODELS_PRIORITY) {
        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${cleanKey}`
                },
                body: JSON.stringify({
                    messages: messages,
                    model: model,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // If rate limited (429) or server error (5xx), try next model
                if (response.status === 429 || response.status >= 500) {
                    console.warn(`Groq model ${model} failed (${response.status}), trying next...`);
                    lastError = `HTTP ${response.status}: ${errText}`;
                    continue; 
                }
                // For other errors (401, 400), stop immediately
                throw new Error(`Groq API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) return content;
            
        } catch (e: any) {
            console.warn(`Groq execution error with ${model}:`, e);
            lastError = e.message;
            // If it's a network error, maybe retry, but for now continue to next model
        }
    }
    
    console.error("All Groq models failed. Last error:", lastError);
    return null;
}

export const enhanceArticleSummary = async (
    title: string,
    currentSummary: string,
    language: Language,
    apiKey: string
): Promise<{ summary: string; tldr: { change: string; population: string } } | null> => {

    const systemPrompt = language === 'es'
        ? "Eres un experto nefrólogo senior. Tu tarea es reescribir el resumen de un estudio científico para que sea claro y generar una 'Cápsula de Impacto'.\n\nResponde en JSON con los campos:\n- summary: El abstract mejorado.\n- tldr: Un objeto con 'change' (¿Qué cambió?) y 'population' (¿A quién aplica?)."
        : "You are a senior expert nephrologist. Your task is to rewrite a scientific study abstract to be clear and generate an 'Impact Capsule'.\n\nRespond in JSON with the fields:\n- summary: The improved abstract.\n- tldr: An object with 'change' (What changed?) and 'population' (To whom does it apply?).";

    const userPrompt = `Title: ${title}\n\nAbstract/Snippet: ${currentSummary}`;

    const result = await tryGroqGeneration([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ], apiKey, 600, 0.3);

    if (!result) return null;
    try {
        const parsed = JSON.parse(result);
        return {
            summary: parsed.summary || currentSummary,
            tldr: parsed.tldr || { change: "", population: "" }
        };
    } catch {
        return null;
    }
};

export const generateGroqSummary = async (
  articles: Article[],
  topic: string,
  language: Language,
  apiKey: string
): Promise<string> => {
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('REQUIRE_API_KEY', { detail: { provider: 'groq' } }));
      }
      throw new Error("MISSING_API_KEY");
  }
  if (articles.length === 0) return "";

  const contextArticles = articles.slice(0, 8).map((a, i) => 
      `[Study ${i+1}] Title: ${a.title}\nFindings: ${a.summary.substring(0, 400)}...`
  ).join("\n\n");

  const systemPrompt = language === 'es'
      ? "Actúa como un Nefrólogo Académico Senior realizando una revisión rápida de literatura. Tu objetivo es crear una SÍNTESIS CLÍNICA INTEGRADA basada en los estudios proporcionados.\n\nInstrucciones Críticas:\n1. NO listes los artículos uno por uno. Evita formatos como 'El estudio 1 dice... El estudio 2 dice...'.\n2. AGRUPA los hallazgos por temáticas o mecanismos comunes.\n3. Sintetiza los resultados: ¿Existe un consenso emergente o hay resultados contradictorios?\n4. Enfatiza las IMPLICACIONES CLÍNICAS: ¿Cómo cambia esto el manejo del paciente?\n5. Redacta en párrafos fluidos y profesionales."
      : "Act as a Senior Academic Nephrologist performing a rapid literature review. Your goal is to create an INTEGRATED CLINICAL SYNTHESIS based on the provided studies.\n\nCritical Instructions:\n1. DO NOT list articles one by one. Avoid formats like 'Study 1 says... Study 2 says...'.\n2. GROUP findings by common themes or mechanisms.\n3. Synthesize results: Is there emerging consensus or conflicting data?\n4. Emphasize CLINICAL IMPLICATIONS: How does this impact patient management?\n5. Write in fluid, professional paragraphs.";

  const userPrompt = `Topic: ${topic}\n\nStudies to synthesize:\n${contextArticles}`;

  const cleanKey = apiKey.trim();
  try {
      const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${cleanKey}`
          },
          body: JSON.stringify({
              messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
              model: "llama-3.3-70b-versatile",
              temperature: 0.4,
              max_tokens: 1024
          })
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
  } catch {
      return "";
  }
};
