import Parser from 'rss-parser';
import { readFeeds, updateFeedItems, writeMainConfig } from './fileStorage.js';

const parser = new Parser();

// Helper to fetch a single feed
async function fetchFeed(url) {
    try {
        // Server-side fetch doesn't need CORS proxies
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const feed = await parser.parseString(text);
        return feed;
    } catch (error) {
        console.error(`Error fetching feed ${url}:`, error.message);
        return null;
    }
}

// Main function to refresh all feeds
export async function refreshAllFeeds() {
    console.log(`[${new Date().toISOString()}] Starting scheduled feed refresh...`);

    try {
        const data = readFeeds();
        const feeds = data.feeds || [];

        if (feeds.length === 0) {
            console.log('No feeds to refresh.');
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        // Process feeds sequentially to avoid overwhelming the network/cpu
        for (const feed of feeds) {
            try {
                const fetchedFeed = await fetchFeed(feed.url);

                if (fetchedFeed && fetchedFeed.items) {
                    // Update items for this feed
                    // We map the fetched items to match our schema if necessary, 
                    // but rss-parser output is usually compatible.
                    // We rely on updateFeedItems to filter duplicates/old items.
                    const success = updateFeedItems(feed.id, fetchedFeed.items);
                    if (success) updatedCount++;
                } else {
                    errorCount++;
                }
            } catch (err) {
                console.error(`Failed to refresh feed ${feed.title || feed.url}:`, err);
                errorCount++;
            }
        }

        // Update lastUpdated timestamp in main config
        data.lastUpdated = new Date().toISOString();
        writeMainConfig(data);

        console.log(`[${new Date().toISOString()}] Feed refresh complete. Updated: ${updatedCount}, Errors: ${errorCount}`);
    } catch (error) {
        console.error('Fatal error during feed refresh:', error);
    }
}
