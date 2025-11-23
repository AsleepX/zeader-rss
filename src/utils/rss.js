import Parser from 'rss-parser';

const parser = new Parser();
const CORS_PROXY = "https://api.allorigins.win/get?url=";

const PROXIES = [
    (url) => `http://localhost:3001/api/proxy?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

export const fetchFeed = async (url) => {
    let lastError = null;
    // Strategy: Try direct fetch -> Proxy 1 -> Proxy 2

    // 1. Try Direct Fetch
    try {
        const response = await fetch(url);
        if (response.ok) {
            const text = await response.text();
            // Verify it looks like XML/RSS before parsing
            if (text.trim().startsWith('<')) {
                return await parser.parseString(text);
            }
        }
    } catch (e) {
        console.warn(`Direct fetch failed for ${url}, trying proxies...`);
    }

    // 2. Try Proxies
    for (const proxyGen of PROXIES) {
        try {
            const proxyUrl = proxyGen(url);
            const response = await fetch(proxyUrl);

            if (!response.ok) continue;

            let content;
            if (proxyUrl.includes('allorigins')) {
                const data = await response.json();
                if (!data.contents) throw new Error("No content from allorigins");
                content = data.contents;
            } else {
                // corsproxy.io and local proxy return the raw content
                content = await response.text();
            }

            return await parser.parseString(content);
        } catch (e) {
            console.warn(`Proxy failed: ${e.message}`);
            lastError = e;
            continue;
        }
    }

    throw new Error(`All fetch methods failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
};

/**
 * Extract video ID from pornhub URL and construct embed URL
 * @param {string} pageUrl - The pornhub page URL
 * @returns {string|null} - The embed URL or null
 */
export const getEmbedUrl = (pageUrl) => {
    try {
        // Extract viewkey from URL like: https://www.pornhub.com/view
        const viewkeyMatch = pageUrl.match(/viewkey=([a-zA-Z0-9]+)/);
        if (viewkeyMatch) {
            const viewkey = viewkeyMatch[1];
            // Construct embed URL
            return `https://www.pornhub.com/embed/${viewkey}`;
        }
        return null;
    } catch (e) {
        console.error('Error constructing embed URL:', e);
        return null;
    }
};

export const getCategoryFromUrl = (urlStr) => {
    try {
        const urlObj = new URL(urlStr);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        return pathSegments.length > 0 ? pathSegments[0] : null;
    } catch { return null; }
};

