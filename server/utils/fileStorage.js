import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 优先使用环境变量 DATA_DIR，如果未设置则使用默认的项目目录
// 在 Zeabur 上设置环境变量 DATA_DIR=/app/data 来使用挂载的持久化存储
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'feeds.json');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');

const KEEP_DAYS = 30; // Auto-cleanup threshold

// Helper to check if item should be kept
function shouldKeepItem(item) {
    if (!item.isoDate && !item.pubDate) return true; // Keep items without date
    const date = new Date(item.isoDate || item.pubDate);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
    return date >= cutoff;
}

// Ensure data directories exist
function ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
}

// Initialize and Migrate Data
function initializeData() {
    ensureDirectories();

    // Check if we need to migrate from old single-file format
    if (fs.existsSync(DATA_FILE)) {
        try {
            const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
            const data = JSON.parse(rawData);

            // Check if migration is needed (if feeds have items inline)
            const needsMigration = data.feeds && data.feeds.some(f => f.items && f.items.length > 0);

            if (needsMigration) {
                console.log('Migrating data to split storage format...');
                writeFeeds(data); // This will trigger the split write logic
                console.log('Migration complete.');
            }
        } catch (error) {
            console.error('Error checking/migrating data:', error);
        }
    } else {
        // Create empty initial file
        const initialData = {
            feeds: [],
            folders: [],
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
}

// Read all feeds (aggregating from storage)
export function readFeeds() {
    try {
        initializeData();
        const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(rawData);

        // Hydrate feeds with items from storage
        if (data.feeds) {
            data.feeds = data.feeds.map(feed => {
                const feedFile = path.join(STORAGE_DIR, `${feed.id}.json`);
                let items = [];
                if (fs.existsSync(feedFile)) {
                    try {
                        const fileContent = fs.readFileSync(feedFile, 'utf-8');
                        items = JSON.parse(fileContent);
                    } catch (e) {
                        console.error(`Failed to read items for feed ${feed.id}`, e);
                    }
                } else if (feed.items) {
                    // Fallback for partially migrated data or if file missing but inline data exists
                    items = feed.items;
                }
                return { ...feed, items };
            });
        }

        return data;
    } catch (error) {
        console.error('Error reading feeds:', error);
        return { feeds: [], folders: [], lastUpdated: new Date().toISOString() };
    }
}

// Write all feeds (splitting into storage)
export function writeFeeds(data) {
    try {
        ensureDirectories();

        // 1. Prepare metadata (feeds without items)
        const feedsMetadata = data.feeds.map(feed => {
            const { items, ...meta } = feed;
            return meta;
        });

        const mainData = {
            ...data,
            feeds: feedsMetadata,
            lastUpdated: new Date().toISOString()
        };

        // 2. Write main config file
        fs.writeFileSync(DATA_FILE, JSON.stringify(mainData, null, 2), 'utf-8');

        // 3. Write individual feed items
        data.feeds.forEach(feed => {
            if (feed.id) {
                const feedFile = path.join(STORAGE_DIR, `${feed.id}.json`);
                let items = feed.items || [];
                // Filter old items before writing
                items = items.filter(shouldKeepItem);
                fs.writeFileSync(feedFile, JSON.stringify(items, null, 2), 'utf-8');
            }
        });

        return true;
    } catch (error) {
        console.error('Error writing feeds:', error);
        return false;
    }
}

// Write just the main config file (feeds list without items)
export function writeMainConfig(data) {
    try {
        ensureDirectories();

        const feedsMetadata = data.feeds.map(feed => {
            const { items, ...meta } = feed;
            return meta;
        });

        const mainData = {
            ...data,
            feeds: feedsMetadata,
            lastUpdated: new Date().toISOString()
        };

        fs.writeFileSync(DATA_FILE, JSON.stringify(mainData, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('Error writing main config:', error);
        return false;
    }
}

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard DNS namespace

// Helper to generate stable ID (matches frontend logic)
const generateItemId = (item, feedUrl) => {
    // 1. Try to use GUID if available and valid
    if (item.guid) {
        if (typeof item.guid === 'string') return item.guid;
        if (typeof item.guid === 'object') {
            // Handle object GUIDs (e.g. { _: 'id', $: {...} })
            if (item.guid._) return item.guid._;
            // Fallback for other object structures - stringify stable parts
            return JSON.stringify(item.guid);
        }
    }

    // 2. Create a stable composite ID
    // We do NOT use uuidv4() here because we want the ID to be deterministic (stable)
    // so that refreshing the feed doesn't generate new IDs for the same items.
    const parts = [
        item.link || '',
        item.title || '',
        item.isoDate || item.pubDate || '',
        item.author || '',
        feedUrl || ''
    ];

    const payload = parts.join('|');

    // Use UUID v5 (SHA-1 namespace hashing) for stability
    return uuidv5(payload, NAMESPACE);
};

// Helper to update just one feed's items (Performance optimization)
export function updateFeedItems(feedId, items, feedUrl, preserveState = true) {
    try {
        ensureDirectories();
        const feedFile = path.join(STORAGE_DIR, `${feedId}.json`);

        let existingItems = [];
        if (fs.existsSync(feedFile)) {
            try {
                const fileContent = fs.readFileSync(feedFile, 'utf-8');
                existingItems = JSON.parse(fileContent);
            } catch (e) {
                console.error(`Failed to read existing items for feed ${feedId}`, e);
            }
        }

        // Create a map of existing items by ID for quick lookup
        const existingItemsMap = new Map();
        existingItems.forEach(item => {
            if (item.id) existingItemsMap.set(item.id, item);
        });

        // Process new items
        const processedItems = items.map(item => {
            // Generate stable ID
            const id = generateItemId(item, feedUrl);

            // Check if item already exists
            const existingItem = existingItemsMap.get(id);

            return {
                ...item,
                id,
                // Preserve local state from existing item ONLY if preserveState is true
                read: (preserveState && existingItem) ? existingItem.read : (item.read || false),
                feedId: feedId, // Ensure feedId is set
                // Preserve other potential local fields if any
                ...((existingItem && existingItem.starred) ? { starred: existingItem.starred } : {})
            };
        });

        // Merge with existing items that might not be in the current fetch (optional, depending on policy)
        // For now, we usually replace the list with the fetched list, but we might want to keep old items that are still within retention period?
        // The current logic seems to be "replace with fetched items", but we filtered them by date in the caller or here?
        // The caller (rssFetcher) passes `fetchedFeed.items`.

        // Let's stick to: New list is the source of truth for *existence*, but we preserve state.
        // However, we also have `shouldKeepItem` filter.

        // Filter old items before writing
        const filteredItems = processedItems.filter(shouldKeepItem);

        // Sort by date (newest first)
        filteredItems.sort((a, b) => {
            const dateA = new Date(a.isoDate || a.pubDate || 0);
            const dateB = new Date(b.isoDate || b.pubDate || 0);
            return dateB - dateA;
        });

        fs.writeFileSync(feedFile, JSON.stringify(filteredItems, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error updating feed items for ${feedId}:`, error);
        return false;
    }
}

// Helper to delete a feed's storage file
export function deleteFeedStorage(feedId) {
    try {
        const feedFile = path.join(STORAGE_DIR, `${feedId}.json`);
        if (fs.existsSync(feedFile)) {
            fs.unlinkSync(feedFile);
        }
        return true;
    } catch (error) {
        console.error(`Error deleting storage for ${feedId}:`, error);
        return false;
    }
}

// Helper to cleanup old items
export function cleanupOldItems(daysToKeep = 30) {
    try {
        ensureDirectories();
        const files = fs.readdirSync(STORAGE_DIR);
        let totalRemoved = 0;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const filePath = path.join(STORAGE_DIR, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const items = JSON.parse(content);

                if (!Array.isArray(items)) return;

                const initialCount = items.length;
                const filteredItems = items.filter(item => {
                    let itemDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null);

                    // Check if date is valid
                    if (itemDate && isNaN(itemDate.getTime())) {
                        itemDate = null;
                    }

                    if (!itemDate) return false; // Remove items without valid date
                    return itemDate >= cutoffDate;
                });

                if (filteredItems.length < initialCount) {
                    fs.writeFileSync(filePath, JSON.stringify(filteredItems, null, 2), 'utf-8');
                    totalRemoved += (initialCount - filteredItems.length);
                }
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
            }
        });

        return { success: true, removedCount: totalRemoved };
    } catch (error) {
        console.error('Error cleaning up old items:', error);
        return { success: false, error: error.message };
    }
}
