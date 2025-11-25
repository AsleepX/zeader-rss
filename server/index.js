import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import {
    readFeeds,
    writeFeeds,
    writeMainConfig,
    updateFeedItems,
    deleteFeedStorage,
    cleanupOldItems
} from './utils/fileStorage.js';
import { refreshAllFeeds } from './utils/rssFetcher.js';

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// GET all feeds
app.get('/api/feeds', (req, res) => {
    try {
        const data = readFeeds();
        res.json(data.feeds);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read feeds' });
    }
});

// GET all folders
app.get('/api/folders', (req, res) => {
    try {
        const data = readFeeds();
        res.json(data.folders || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read folders' });
    }
});

// POST new folder
app.post('/api/folders', (req, res) => {
    try {
        const newFolder = req.body;
        const data = readFeeds();
        if (!data.folders) data.folders = [];
        data.folders.push(newFolder);

        if (writeMainConfig(data)) {
            res.status(201).json(newFolder);
        } else {
            res.status(500).json({ error: 'Failed to save folder' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// Cleanup old items
app.post('/api/cleanup', (req, res) => {
    try {
        const { days } = req.body;
        const result = cleanupOldItems(days || 30);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to cleanup items' });
    }
});

// DELETE folder
app.delete('/api/folders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = readFeeds();

        if (!data.folders) return res.status(404).json({ error: 'Folder not found' });

        const folderIndex = data.folders.findIndex(f => f.id === id);
        if (folderIndex === -1) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        data.folders.splice(folderIndex, 1);

        // Also remove folderId from feeds that were in this folder
        data.feeds = data.feeds.map(feed => {
            if (feed.folderId === id) {
                const { folderId, ...rest } = feed;
                return rest;
            }
            return feed;
        });

        if (writeMainConfig(data)) {
            res.status(204).send();
        } else {
            res.status(500).json({ error: 'Failed to delete folder' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});


// POST new feed
app.post('/api/feeds', (req, res) => {
    try {
        const newFeed = req.body;
        const data = readFeeds();
        data.feeds.push(newFeed);

        const configSaved = writeMainConfig(data);
        const itemsSaved = updateFeedItems(newFeed.id, newFeed.items || []);

        if (configSaved && itemsSaved) {
            res.status(201).json(newFeed);
        } else {
            res.status(500).json({ error: 'Failed to save feed' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add feed' });
    }
});

// PUT update feed
app.put('/api/feeds/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const data = readFeeds();

        const feedIndex = data.feeds.findIndex(f => f.id === id);
        if (feedIndex === -1) {
            return res.status(404).json({ error: 'Feed not found' });
        }

        data.feeds[feedIndex] = { ...data.feeds[feedIndex], ...updates };

        const configSaved = writeMainConfig(data);
        const itemsSaved = updateFeedItems(id, data.feeds[feedIndex].items || []);

        if (configSaved && itemsSaved) {
            res.json(data.feeds[feedIndex]);
        } else {
            res.status(500).json({ error: 'Failed to update feed' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update feed' });
    }
});

// DELETE feed
app.delete('/api/feeds/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = readFeeds();

        const feedIndex = data.feeds.findIndex(f => f.id === id);
        if (feedIndex === -1) {
            return res.status(404).json({ error: 'Feed not found' });
        }

        data.feeds.splice(feedIndex, 1);

        // Delete the storage file for this feed
        deleteFeedStorage(id);

        if (writeMainConfig(data)) {
            res.status(204).send();
        } else {
            res.status(500).json({ error: 'Failed to delete feed' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete feed' });
    }
});

// POST update all feeds (used for batch updates like mark all as read)
app.post('/api/feeds/update-all', (req, res) => {
    try {
        const { feeds } = req.body;
        const data = readFeeds();
        data.feeds = feeds;

        if (writeFeeds(data)) {
            res.json(feeds);
        } else {
            res.status(500).json({ error: 'Failed to update feeds' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update feeds' });
    }
});

// Proxy endpoint to bypass CORS
app.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type');
        const text = await response.text();

        res.set('Content-Type', contentType || 'application/xml');
        res.send(text);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch URL' });
    }
});

// GET article content
app.get('/api/article', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
        }

        const html = await response.text();
        const doc = new JSDOM(html, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (article) {
            res.json(article);
        } else {
            res.status(500).json({ error: 'Failed to parse article' });
        }
    } catch (error) {
        console.error('Article fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

// PUT update folder
app.put('/api/folders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const data = readFeeds();

        if (!data.folders) return res.status(404).json({ error: 'Folder not found' });

        const folderIndex = data.folders.findIndex(f => f.id === id);
        if (folderIndex === -1) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        data.folders[folderIndex] = { ...data.folders[folderIndex], ...updates };

        if (writeMainConfig(data)) {
            res.json(data.folders[folderIndex]);
        } else {
            res.status(500).json({ error: 'Failed to update folder' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing - return index.html for all non-API routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

app.listen(PORT, () => {
    console.log(`🚀 RSS Reader Backend running on http://localhost:${PORT}`);

    // Initial refresh on startup
    refreshAllFeeds();

    // Schedule periodic refresh
    setInterval(refreshAllFeeds, REFRESH_INTERVAL);
});
