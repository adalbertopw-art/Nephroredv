
import { Article } from "../types";

// --- CONFIGURATION ---
const JINA_BASE = "https://r.jina.ai/";
const UNPAYWALL_BASE = "https://api.unpaywall.org/v2/";
// List of proxies to try for raw HTML fetching
const PROXY_LIST = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url="
];

// --- HELPERS ---

/**
 * Extracts DOI from a URL if present.
 */
const extractDoi = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    return match ? match[0] : null;
};

/**
 * Converts simple Markdown (from Jina) to HTML.
 */
const markdownToHtml = (md: string): string => {
    if (!md) return "";
    let html = md
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Images
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" class="article-img" loading="lazy" />')
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
        // Blockquotes
        .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        // Paragraphs
        .replace(/\n\s*\n/g, '</p><p>')
        // Fix line breaks
        .replace(/([^\n])\n([^\n])/g, '$1 $2');
    
    return `<div class="markdown-content"><p>${html}</p></div>`;
};

/**
 * Heuristic parser to extract main content from Raw HTML (Mozilla Readability style).
 */
const parseReaderView = (html: string): string => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove clutter
        const junkSelectors = [
            'script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 
            '.ad', '.advertisement', '.social-share', '.cookie-banner', '#sidebar',
            '.navigation', '.menu', '.hidden', '[role="alert"]', '[role="banner"]',
            '.popup', '.modal', '#onetrust-banner-sdk', '.promo', '.subscription', 
            '.login-overlay', '.paywall-overlay'
        ];
        junkSelectors.forEach(sel => doc.querySelectorAll(sel).forEach(el => el.remove()));

        // Identify text containers
        const paragraphs = doc.querySelectorAll('p');
        const candidateNodes = new Map<HTMLElement, number>();

        paragraphs.forEach(p => {
            const textLen = p.textContent?.length || 0;
            if (textLen < 25) return;
            let parent = p.parentElement as HTMLElement;
            let depth = 0;
            while (parent && parent.tagName !== 'BODY' && depth < 3) {
                const currentScore = candidateNodes.get(parent) || 0;
                // Score based on text length + commas (sentence structure)
                const score = textLen + (p.textContent?.split(',').length || 0) * 5;
                candidateNodes.set(parent, currentScore + score);
                parent = parent.parentElement as HTMLElement;
                depth++;
            }
        });

        // Find winner
        let bestCandidate: HTMLElement | null = null;
        let maxScore = 0;

        candidateNodes.forEach((score, node) => {
            if (score > maxScore) {
                maxScore = score;
                bestCandidate = node;
            }
        });

        if (bestCandidate) return (bestCandidate as HTMLElement).innerHTML;
        
        // Fallback: Body content if clean enough
        if (doc.body.textContent && doc.body.textContent.length > 500) return doc.body.innerHTML;
        
        return "";
    } catch (e) {
        return html; 
    }
};

const fixRelativeUrls = (html: string, baseUrl: string): string => {
    try {
        const origin = new URL(baseUrl).origin;
        return html
            .replace(/src=["']\/(.*?)["']/g, `src="${origin}/$1"`)
            .replace(/href=["']\/(.*?)["']/g, `href="${origin}/$1"`);
    } catch { return html; }
};

// --- CASCADE STRATEGIES ---

/**
 * Strategy 1: Jina AI
 * Uses a special LLM-reader endpoint to fetch clean Markdown.
 * Best for bypassing anti-bots and complex JS rendering.
 */
const fetchJina = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(`${JINA_BASE}${url}`, {
            headers: { 'X-Return-Format': 'markdown' }
        });
        if (!response.ok) return null;
        
        const text = await response.text();
        
        // Validation
        if (text.includes("Title: Access Denied") || 
            text.includes("Cloudflare") || 
            text.includes("Just a moment...") ||
            text.length < 200) {
            return null;
        }
        
        return markdownToHtml(text);
    } catch { return null; }
};

/**
 * Strategy 2: Unpaywall (Legal Open Access)
 * Checks if there is a legal free PDF available via DOI.
 */
const fetchUnpaywall = async (doi: string): Promise<string | null> => {
    try {
        const response = await fetch(`${UNPAYWALL_BASE}${doi}?email=demo@nephroupdate.com`);
        if (!response.ok) return null;
        
        const data = await response.json();
        const pdfUrl = data.best_oa_location?.url_for_pdf;
        
        if (pdfUrl) {
            // Return an HTML block that embeds the PDF or links to it strongly
            return `
                <div class="pdf-container" style="text-align:center; padding: 20px;">
                    <div style="background:rgba(2, 132, 199, 0.1); border:1px solid rgba(2, 132, 199, 0.2); padding:20px; border-radius:12px; margin-bottom:20px;">
                        <h3 style="margin:0 0 10px 0; color:#0284c7;">🎉 Full Text PDF Available</h3>
                        <p style="margin:0 0 15px 0; font-size:0.9em; opacity:0.8;">We found a free legal version of this article via Unpaywall.</p>
                        <a href="${pdfUrl}" target="_blank" class="btn">Download / View PDF</a>
                    </div>
                    <div style="height: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc;">
                        <object data="${pdfUrl}" type="application/pdf" width="100%" height="100%">
                            <div style="padding: 40px; text-align: center;">
                                <p>Your browser does not support embedded PDFs.</p>
                                <a href="${pdfUrl}" class="btn">Click here to open PDF</a>
                            </div>
                        </object>
                    </div>
                </div>
            `;
        }
        return null;
    } catch { return null; }
};

/**
 * Strategy 3: Proxy + Readability
 * Attempts to fetch raw HTML via CORS proxies and clean it up.
 */
const fetchProxy = async (url: string): Promise<string | null> => {
    for (const proxy of PROXY_LIST) {
        try {
            const response = await fetch(`${proxy}${encodeURIComponent(url)}`);
            if (response.ok) {
                const text = await response.text();
                // Basic validation
                if (text.length > 1000 && !text.includes("Security Check") && !text.includes("Cloudflare")) {
                     const parsed = parseReaderView(text);
                     if (parsed.length > 500) {
                         return fixRelativeUrls(parsed, url);
                     }
                }
            }
        } catch { 
            // Continue to next proxy
        }
    }
    return null;
};

// --- HTML CONTAINER GENERATOR ---

const generateHtmlContainer = (article: Article, content: string, sourceMethod: string): string => {
    const date = new Date().toLocaleDateString();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1e293b;
      --link: #2563eb;
      --border: #e2e8f0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --text: #e2e8f0;
        --link: #60a5fa;
        --border: #334155;
      }
    }
    body { 
        font-family: 'Georgia', 'Cambria', serif; 
        line-height: 1.8; 
        color: var(--text); 
        background: var(--bg);
        max-width: 800px; 
        margin: 0 auto; 
        padding: 20px; 
        padding-top: 40px;
    }
    h1 { font-family: -apple-system, sans-serif; font-weight: 800; line-height: 1.2; margin-bottom: 0.5em; }
    h2, h3 { font-family: -apple-system, sans-serif; margin-top: 1.5em; color: var(--text); }
    a { color: var(--link); text-decoration: none; border-bottom: 1px dotted var(--link); }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; display: block; }
    blockquote { border-left: 4px solid var(--link); margin: 1em 0; padding-left: 1em; font-style: italic; opacity: 0.8; }
    .meta { font-family: -apple-system, sans-serif; font-size: 0.85em; opacity: 0.7; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    .method-tag { font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(125,125,125,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); margin-left: 8px; }
    .btn { display: inline-block; background: var(--link); color: white !important; padding: 10px 20px; border-radius: 99px; font-family: -apple-system, sans-serif; font-weight: bold; font-size: 0.9em; text-decoration: none; border:none; margin-top: 10px; }
    .content p { margin-bottom: 1.5em; text-align: justify; }
    
    /* Progress Bar */
    #progress-container { position: fixed; top: 0; left: 0; width: 100%; height: 4px; background: transparent; z-index: 9999; }
    #progress-bar { height: 100%; background: var(--link); width: 0%; transition: width 0.1s; }
  </style>
</head>
<body>
  <div id="progress-container"><div id="progress-bar"></div></div>
  
  <h1>${article.title}</h1>
  <div class="meta">
    ${article.source} • ${article.date} <span class="method-tag">${sourceMethod}</span>
  </div>

  <div class="content">
    ${content}
  </div>

  <div style="margin-top: 50px; border-top: 1px solid var(--border); padding-top: 20px; text-align: center;">
      <p style="font-family: -apple-system, sans-serif; font-size: 0.8em; opacity: 0.5;">
          Extracted using ${sourceMethod}
      </p>
      <a href="${article.url}" target="_blank" class="btn">View Original Source</a>
  </div>

  <script>
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (docHeight > 0) ? (scrollTop / docHeight) * 100 : 0;
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) progressBar.style.width = scrollPercent + '%';
    });
  </script>
</body>
</html>
    `;
};

// --- MAIN EXPORT ---

/**
 * Fetches article content using a Cascade Strategy:
 * 1. Jina AI (Smart Reader)
 * 2. Unpaywall (Legal PDF)
 * 3. Proxy + Readability (Raw HTML)
 */
export const fetchArticleContent = async (article: Article): Promise<{ html: string; isFullText: boolean }> => {
    let content = "";
    let method = "";
    let isFullText = false;

    // 1. Try Jina AI (Priority 1)
    if (article.url) {
        console.debug("Attempting Strategy 1: Jina AI");
        content = await fetchJina(article.url) || "";
        if (content) {
            method = "AI Reader (Jina)";
            isFullText = true;
        }
    }

    // 2. Try Unpaywall (Priority 2)
    if (!content) {
        const doi = extractDoi(article.url);
        if (doi) {
            console.debug("Attempting Strategy 2: Unpaywall (DOI: " + doi + ")");
            content = await fetchUnpaywall(doi) || "";
            if (content) {
                method = "Unpaywall (Open Access PDF)";
                isFullText = true;
            }
        }
    }

    // 3. Try Proxy (Priority 3)
    if (!content && article.url) {
        console.debug("Attempting Strategy 3: Proxy");
        content = await fetchProxy(article.url) || "";
        if (content) {
            method = "Web Proxy";
            isFullText = true;
        }
    }

    // Fallback: Show Abstract & Link
    if (!content) {
        console.debug("All strategies failed. Falling back to summary.");
        content = `
            <div style="background:rgba(255,100,100,0.05); padding:20px; border-radius:12px; text-align:center; border: 1px dashed rgba(255,100,100,0.2);">
                <h3 style="margin-top:0;">🔒 Full Text Protected</h3>
                <p style="opacity:0.8;">Publisher blocked automated reading. Please open the link directly.</p>
                <div style="text-align:left; background:rgba(255,255,255,0.5); padding:15px; border-radius:8px; margin:15px 0;">
                    <strong>Abstract:</strong><br/>
                    ${article.summary}
                </div>
                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                    <a href="${article.url}" target="_blank" class="btn">Open Original</a>
                    <a href="https://archive.is/latest/${article.url}" target="_blank" class="btn" style="background:#475569;">Try Archive.is</a>
                </div>
            </div>
        `;
        method = "Summary Only";
        isFullText = false;
    }

    return {
        html: generateHtmlContainer(article, content, method),
        isFullText
    };
};
