
const { v4: uuidv4, v5: uuidv5 } = require('uuid');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

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

// Test cases
const testCases = [
    {
        name: 'String GUID',
        item: { guid: 'unique-string-1', link: 'http://example.com/1' },
        feedUrl: 'http://example.com/feed'
    },
    {
        name: 'Object GUID',
        item: { guid: { _: 'unique-string-2', $: { isPermaLink: 'false' } }, link: 'http://example.com/2' },
        feedUrl: 'http://example.com/feed'
    },
    {
        name: 'No GUID, Unique Link',
        item: { link: 'http://example.com/3' },
        feedUrl: 'http://example.com/feed'
    },
    {
        name: 'No GUID, Duplicate Link (Different Title)',
        item: { link: 'http://example.com/home', title: 'Article 1' },
        feedUrl: 'http://example.com/feed'
    },
    {
        name: 'No GUID, Duplicate Link (Different Title 2)',
        item: { link: 'http://example.com/home', title: 'Article 2' },
        feedUrl: 'http://example.com/feed'
    }
];

testCases.forEach(test => {
    const id = generateItemId(test.item, test.feedUrl);
    console.log(`Test: ${test.name}`);
    console.log(`ID: ${id}`);
    console.log(`Type: ${typeof id}`);
    if (typeof id === 'object') {
        console.log('WARNING: ID is an object!');
        console.log(JSON.stringify(id));
    }
    console.log('---');
});
