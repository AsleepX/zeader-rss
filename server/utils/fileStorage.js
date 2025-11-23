import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
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

// Helper to update just one feed's items (Performance optimization)
export function updateFeedItems(feedId, items) {
    try {
        ensureDirectories();
        const feedFile = path.join(STORAGE_DIR, `${feedId}.json`);
        // Filter old items before writing
        const filteredItems = items.filter(shouldKeepItem);
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
