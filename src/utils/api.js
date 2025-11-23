const API_BASE_URL = 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw new Error(`API request failed: ${error.message}`);
    }
}

export const api = {
    // Get all feeds
    getFeeds: () => request('/feeds'),

    // Add new feed
    addFeed: (feed) => request('/feeds', {
        method: 'POST',
        body: JSON.stringify(feed),
    }),

    // Update feed
    updateFeed: (id, updates) => request(`/feeds/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    }),

    // Delete feed
    deleteFeed: (id) => request(`/feeds/${id}`, {
        method: 'DELETE',
    }),

    // Update all feeds
    updateAllFeeds: (feeds) => request('/feeds/update-all', {
        method: 'POST',
        body: JSON.stringify({ feeds }),
    }),

    // Get all folders
    getFolders: () => request('/folders'),

    // Add new folder
    addFolder: (folder) => request('/folders', {
        method: 'POST',
        body: JSON.stringify(folder),
    }),

    // Delete folder
    deleteFolder: (id) => request(`/folders/${id}`, {
        method: 'DELETE',
    }),
};
