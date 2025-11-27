

export const parseOpml = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");

                const body = xmlDoc.getElementsByTagName('body')[0];
                if (!body) throw new Error("Invalid OPML: No body tag found");

                const parseOutline = (outline) => {
                    const type = outline.getAttribute('type');
                    const text = outline.getAttribute('text');
                    const title = outline.getAttribute('title');
                    const xmlUrl = outline.getAttribute('xmlUrl');

                    // Custom Zeader attributes
                    const viewType = outline.getAttribute('zeader:viewType') || outline.getAttribute('viewType');
                    const loadFullContent = outline.getAttribute('zeader:loadFullContent') || outline.getAttribute('loadFullContent');

                    if (type === 'rss' || xmlUrl) {
                        // It's a feed
                        return {
                            type: 'feed',
                            title: title || text || xmlUrl,
                            url: xmlUrl,
                            viewType: viewType || 'waterfall', // Default to waterfall if not specified
                            loadFullContent: loadFullContent === 'true',
                        };
                    } else {
                        // It's likely a folder/group
                        const children = Array.from(outline.children)
                            .filter(child => child.tagName === 'outline')
                            .map(parseOutline);

                        return {
                            type: 'folder',
                            name: text || title || 'Untitled Folder',
                            viewType: viewType || null, // Folders might have a view type preference
                            children: children
                        };
                    }
                };

                const rootOutlines = Array.from(body.children)
                    .filter(node => node.tagName === 'outline')
                    .map(parseOutline);

                resolve(rootOutlines);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

// Helper to flatten the tree if needed, or we can use the tree directly in the UI
export const flattenFeeds = (nodes) => {
    let feeds = [];
    nodes.forEach(node => {
        if (node.type === 'feed') {
            feeds.push(node);
        } else if (node.type === 'folder') {
            feeds = feeds.concat(flattenFeeds(node.children));
        }
    });
    return feeds;
};
