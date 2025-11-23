import { getCategoryFromUrl } from './rss';

export const parseOpml = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                
                const outlines = xmlDoc.getElementsByTagName('outline');
                const feeds = [];

                for (let i = 0; i < outlines.length; i++) {
                    const outline = outlines[i];
                    const xmlUrl = outline.getAttribute('xmlUrl');
                    if (xmlUrl) {
                        feeds.push({
                            title: outline.getAttribute('title') || outline.getAttribute('text') || xmlUrl,
                            url: xmlUrl,
                            type: outline.getAttribute('type')
                        });
                    }
                }
                resolve(feeds);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

export const groupFeedsByCategory = (feeds) => {
    const groups = {};
    const ungrouped = [];

    feeds.forEach(feed => {
        const category = getCategoryFromUrl(feed.url);
        if (category) {
            const key = category.charAt(0).toUpperCase() + category.slice(1);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(feed);
        } else {
            ungrouped.push(feed);
        }
    });

    return { groups, ungrouped };
};
