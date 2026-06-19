export const translateManualQueryWithoutAI = async (query: string): Promise<string> => {
    if (!query) return query;
    try {
        const targetUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=es|en`;
        
        let response;
        try {
            response = await fetch(targetUrl);
        } catch (e) {
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
            response = await fetch(proxyUrl);
        }

        if (!response || !response.ok) return query;

        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
            const text = data.responseData.translatedText;
            if (text.includes("MYMEMORY WARNING") || text.includes("QUERY TO LONG") || text.includes("PLEASE SELECT TWO DISTINCT LANGUAGES")) {
                return query;
            }
            return text;
        }
        return query;
    } catch (e) {
        console.error("Translation without AI failed", e);
        return query;
    }
};
