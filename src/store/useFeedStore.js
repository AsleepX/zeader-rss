import { create } from 'zustand';
import { fetchFeed } from '../utils/rss';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../utils/api';

export const useFeedStore = create((set, get) => ({
    feeds: [],
    folders: [],
    isLoading: false,
    error: null,
    selectedSource: { type: 'all', id: null }, // 'all', 'folder', 'feed'
    showUnreadOnly: false,

    toggleShowUnreadOnly: () => set(state => ({ showUnreadOnly: !state.showUnreadOnly })),

    selectSource: (type, id = null) => {
        set({ selectedSource: { type, id } });
    },

    clearError: () => set({ error: null }),

    // Load feeds and folders from backend on startup
    loadFeeds: async () => {
        set({ isLoading: true, error: null });
        try {
            const [feeds, folders] = await Promise.all([
                api.getFeeds(),
                api.getFolders()
            ]);
            set({ feeds, folders, isLoading: false });
        } catch (error) {
            console.error('Failed to load data:', error);
            set({ error: 'Failed to load data', isLoading: false });
        }
    },

    addFolder: async (name, feedIds = [], viewType = null) => {
        set({ isLoading: true, error: null });
        try {
            const newFolder = {
                id: uuidv4(),
                name,
                viewType, // 'waterfall' or 'article' or null
                createdAt: new Date().toISOString()
            };
            
            await api.addFolder(newFolder);

            // If feeds were selected, update them with the folderId
            if (feedIds.length > 0) {
                const { feeds } = get();
                const updatedFeeds = feeds.map(feed => 
                    feedIds.includes(feed.id) 
                        ? { ...feed, folderId: newFolder.id }
                        : feed
                );
                
                await api.updateAllFeeds(updatedFeeds);
                set(state => ({
                    folders: [...state.folders, newFolder],
                    feeds: updatedFeeds,
                    isLoading: false
                }));
            } else {
                set(state => ({
                    folders: [...state.folders, newFolder],
                    isLoading: false
                }));
            }
        } catch (error) {
            console.error("Add folder error:", error);
            set({ error: "Failed to add folder", isLoading: false });
        }
    },

    deleteFolder: async (id) => {
        try {
            await api.deleteFolder(id);
            set(state => ({
                folders: state.folders.filter(f => f.id !== id),
                // Also update local feeds to remove folderId
                feeds: state.feeds.map(feed => 
                    feed.folderId === id 
                        ? { ...feed, folderId: undefined } // or null, depending on preference
                        : feed
                )
            }));
        } catch (error) {
            console.error('Failed to delete folder:', error);
            set({ error: 'Failed to delete folder' });
        }
    },

    renameFolder: async (id, newName) => {
        const previousFolders = get().folders;
        set(state => ({
            folders: state.folders.map(f => 
                f.id === id ? { ...f, name: newName } : f
            )
        }));

        try {
            await api.updateFolder(id, { name: newName });
        } catch (error) {
            console.error('Failed to rename folder:', error);
            set({ folders: previousFolders, error: 'Failed to rename folder' });
        }
    },

    renameFeed: async (id, newTitle) => {
        const previousFeeds = get().feeds;
        set(state => ({
            feeds: state.feeds.map(f => 
                f.id === id ? { ...f, title: newTitle } : f
            )
        }));

        try {
            await api.updateFeed(id, { title: newTitle });
        } catch (error) {
            console.error('Failed to rename feed:', error);
            set({ feeds: previousFeeds, error: 'Failed to rename feed' });
        }
    },

    moveFeed: async (feedId, folderId) => {
        const previousFeeds = get().feeds;
        
        // Optimistic update
        set(state => ({
            feeds: state.feeds.map(f => 
                f.id === feedId ? { ...f, folderId: folderId } : f
            )
        }));

        try {
            await api.updateFeed(feedId, { folderId });
        } catch (error) {
            console.error('Failed to move feed:', error);
            set({ feeds: previousFeeds, error: 'Failed to move feed' });
        }
    },

    addFeed: async (url, viewType) => {
        set({ isLoading: true, error: null });
        try {
            // Check for duplicates
            const { feeds } = get();
            if (feeds.some(feed => feed.url === url)) {
                throw new Error('This feed is already subscribed.');
            }

            const feedData = await fetchFeed(url);
            
            // Auto-grouping logic
            let targetFolderId = undefined;
            let newFolder = null;
            let feedsToUpdate = [];

            try {
                const getCategoryFromUrl = (urlStr) => {
                    try {
                        const urlObj = new URL(urlStr);
                        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                        return pathSegments.length > 0 ? pathSegments[0] : null;
                    } catch { return null; }
                };

                const category = getCategoryFromUrl(url);
                if (category) {
                    const { feeds } = get();
                    const sameCategoryFeeds = feeds.filter(f => getCategoryFromUrl(f.url) === category);

                    if (sameCategoryFeeds.length > 0) {
                        const existingFolderId = sameCategoryFeeds.find(f => f.folderId)?.folderId;

                        if (existingFolderId) {
                            targetFolderId = existingFolderId;
                        } else {
                            // Create new folder
                            newFolder = {
                                id: uuidv4(),
                                name: category.charAt(0).toUpperCase() + category.slice(1),
                                createdAt: new Date().toISOString()
                            };
                            targetFolderId = newFolder.id;
                            feedsToUpdate = sameCategoryFeeds;
                        }
                    }
                }
            } catch (groupingError) {
                console.warn('Auto-grouping failed:', groupingError);
            }

            const newFeed = {
                id: uuidv4(),
                url,
                title: feedData.title || url,
                description: feedData.description,
                viewType, // 'article' or 'waterfall'
                folderId: targetFolderId,
                items: feedData.items.map(item => ({
                    ...item,
                    id: item.guid || item.link || uuidv4(),
                    read: false,
                    feedId: url // temporary ID linking
                })),
                lastUpdated: new Date().toISOString(),
            };

            // Execute API calls
            if (newFolder) {
                await api.addFolder(newFolder);
            }

            let currentFeeds = get().feeds;
            if (feedsToUpdate.length > 0) {
                currentFeeds = currentFeeds.map(f => 
                    feedsToUpdate.some(ftu => ftu.id === f.id)
                        ? { ...f, folderId: newFolder.id }
                        : f
                );
                await api.updateAllFeeds(currentFeeds);
            }

            // Save to backend
            await api.addFeed(newFeed);

            set((state) => ({
                folders: newFolder ? [...state.folders, newFolder] : state.folders,
                feeds: [...currentFeeds, newFeed],
                isLoading: false,
            }));
        } catch (error) {
            console.error("Add feed error:", error);
            set({ error: `Failed to add feed: ${error.message || "Please check the URL."}`, isLoading: false });
        }
    },

    importOpml: async (selectedGroups, selectedUngrouped) => {
        set({ isLoading: true, error: null });
        try {
            const newFolders = [];
            const newFeeds = [];
            const { folders: currentFolders, feeds: currentFeeds } = get();

            // 1. Handle Groups (Folders)
            for (const [categoryName, feeds] of Object.entries(selectedGroups)) {
                let folderId;
                const existingFolder = currentFolders.find(f => f.name === categoryName) || newFolders.find(f => f.name === categoryName);

                if (existingFolder) {
                    folderId = existingFolder.id;
                } else {
                    const newFolder = {
                        id: uuidv4(),
                        name: categoryName,
                        createdAt: new Date().toISOString()
                    };
                    newFolders.push(newFolder);
                    folderId = newFolder.id;
                }

                feeds.forEach(feed => {
                    // Check if feed already exists to avoid duplicates
                    if (!currentFeeds.some(f => f.url === feed.url) && !newFeeds.some(f => f.url === feed.url)) {
                        newFeeds.push({
                            id: uuidv4(),
                            url: feed.url,
                            title: feed.title || feed.url,
                            description: '',
                            viewType: 'waterfall',
                            folderId: folderId,
                            items: [],
                            lastUpdated: new Date().toISOString()
                        });
                    }
                });
            }

            // 2. Handle Ungrouped
            selectedUngrouped.forEach(feed => {
                if (!currentFeeds.some(f => f.url === feed.url) && !newFeeds.some(f => f.url === feed.url)) {
                    newFeeds.push({
                        id: uuidv4(),
                        url: feed.url,
                        title: feed.title || feed.url,
                        description: '',
                        viewType: 'waterfall',
                        folderId: undefined,
                        items: [],
                        lastUpdated: new Date().toISOString()
                    });
                }
            });

            // 3. Execute API calls
            for (const folder of newFolders) {
                await api.addFolder(folder);
            }

            for (const feed of newFeeds) {
                await api.addFeed(feed);
            }

            set(state => ({
                folders: [...state.folders, ...newFolders],
                feeds: [...state.feeds, ...newFeeds],
                isLoading: false
            }));

        } catch (error) {
            console.error("Import OPML error:", error);
            set({ error: "Failed to import OPML", isLoading: false });
        }
    },

    removeFeed: async (id) => {
        try {
            await api.deleteFeed(id);
            set((state) => ({
                feeds: state.feeds.filter((f) => f.id !== id),
            }));
        } catch (error) {
            console.error('Failed to remove feed:', error);
            set({ error: 'Failed to remove feed' });
        }
    },

    refreshAllFeeds: async () => {
        set({ isLoading: true });
        const { feeds } = get();
        const updatedFeeds = await Promise.all(
            feeds.map(async (feed) => {
                try {
                    const feedData = await fetchFeed(feed.url);
                    
                    // Create a map of existing items for quick lookup
                    const existingItemsMap = new Map(
                        feed.items?.map(item => [item.id, item]) || []
                    );

                    return {
                        ...feed,
                        items: feedData.items.map(item => {
                            const id = item.guid || item.link || uuidv4();
                            const existingItem = existingItemsMap.get(id);
                            
                            return {
                                ...item,
                                id,
                                read: existingItem ? existingItem.read : false,
                                feedId: feed.id
                            };
                        }),
                        lastUpdated: new Date().toISOString(),
                    };
                } catch (e) {
                    console.error(`Failed to refresh ${feed.url}`, e);
                    return feed;
                }
            })
        );

        // Save updated feeds to backend
        try {
            await api.updateAllFeeds(updatedFeeds);
            set({ feeds: updatedFeeds, isLoading: false });
        } catch (error) {
            console.error('Failed to save refreshed feeds:', error);
            set({ feeds: updatedFeeds, isLoading: false });
        }
    },

    markItemAsRead: async (feedId, itemId) => {
        const { feeds } = get();
        const updatedFeeds = feeds.map(feed => {
            if (feed.id === feedId) {
                return {
                    ...feed,
                    items: feed.items.map(item => 
                        item.id === itemId ? { ...item, read: true } : item
                    )
                };
            }
            return feed;
        });

        set({ feeds: updatedFeeds });
        
        // Optimistically update backend
        try {
            const feedToUpdate = updatedFeeds.find(f => f.id === feedId);
            if (feedToUpdate) {
                await api.updateFeed(feedId, feedToUpdate);
            }
        } catch (error) {
            console.error('Failed to mark item as read:', error);
            // Revert on error? For now, just log it.
        }
    },

    markItemAsUnread: async (feedId, itemId) => {
        const { feeds } = get();
        const updatedFeeds = feeds.map(feed => {
            if (feed.id === feedId) {
                return {
                    ...feed,
                    items: feed.items.map(item => 
                        item.id === itemId ? { ...item, read: false } : item
                    )
                };
            }
            return feed;
        });

        set({ feeds: updatedFeeds });
        
        try {
            const feedToUpdate = updatedFeeds.find(f => f.id === feedId);
            if (feedToUpdate) {
                await api.updateFeed(feedId, feedToUpdate);
            }
        } catch (error) {
            console.error('Failed to mark item as unread:', error);
        }
    },

    updateFeedViewType: async (feedId, viewType) => {
        const previousFeeds = get().feeds;
        set(state => ({
            feeds: state.feeds.map(f => 
                f.id === feedId ? { ...f, viewType } : f
            )
        }));

        try {
            await api.updateFeed(feedId, { viewType });
        } catch (error) {
            console.error('Failed to update feed view type:', error);
            set({ feeds: previousFeeds, error: 'Failed to update feed view type' });
        }
    },

    updateFolderViewType: async (folderId, viewType) => {
        const previousFeeds = get().feeds;
        const previousFolders = get().folders;
        
        const updatedFeeds = previousFeeds.map(f => 
            f.folderId === folderId ? { ...f, viewType } : f
        );

        const updatedFolders = previousFolders.map(f =>
            f.id === folderId ? { ...f, viewType } : f
        );

        set({ feeds: updatedFeeds, folders: updatedFolders });

        try {
            await api.updateAllFeeds(updatedFeeds);
            await api.updateFolder(folderId, { viewType });
        } catch (error) {
            console.error('Failed to update folder view type:', error);
            set({ 
                feeds: previousFeeds, 
                folders: previousFolders,
                error: 'Failed to update folder view type' 
            });
        }
    },

    markCurrentViewAsRead: async () => {
        const { selectedSource, feeds } = get();
        let updatedFeeds = [...feeds];
        let hasChanges = false;

        if (selectedSource.type === 'all') {
            updatedFeeds = updatedFeeds.map(feed => {
                const hasUnread = feed.items.some(item => !item.read);
                if (hasUnread) {
                    hasChanges = true;
                    return {
                        ...feed,
                        items: feed.items.map(item => ({ ...item, read: true }))
                    };
                }
                return feed;
            });
        } else if (selectedSource.type === 'folder') {
            updatedFeeds = updatedFeeds.map(feed => {
                if (feed.folderId === selectedSource.id) {
                    const hasUnread = feed.items.some(item => !item.read);
                    if (hasUnread) {
                        hasChanges = true;
                        return {
                            ...feed,
                            items: feed.items.map(item => ({ ...item, read: true }))
                        };
                    }
                }
                return feed;
            });
        } else if (selectedSource.type === 'feed') {
            updatedFeeds = updatedFeeds.map(feed => {
                if (feed.id === selectedSource.id) {
                    const hasUnread = feed.items.some(item => !item.read);
                    if (hasUnread) {
                        hasChanges = true;
                        return {
                            ...feed,
                            items: feed.items.map(item => ({ ...item, read: true }))
                        };
                    }
                }
                return feed;
            });
        }

        if (!hasChanges) return;

        try {
            set({ feeds: updatedFeeds });
            await api.updateAllFeeds(updatedFeeds);
        } catch (error) {
            console.error('Failed to mark view as read:', error);
            // Revert logic could be added here
        }
    },

    markAllAsRead: async () => {
        const updatedFeeds = get().feeds.map(feed => ({
            ...feed,
            items: feed.items.map(item => ({ ...item, read: true }))
        }));

        try {
            await api.updateAllFeeds(updatedFeeds);
            set({ feeds: updatedFeeds });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }
}));

