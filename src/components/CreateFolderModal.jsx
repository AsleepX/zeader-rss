import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFeedStore } from '../store/useFeedStore';

export function CreateFolderModal({ isOpen, onClose, type }) {
    const [name, setName] = useState('');
    const [selectedFeeds, setSelectedFeeds] = useState([]);
    const { feeds, addFolder, isLoading, error, clearError } = useFeedStore();

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                clearError();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name) return;
        await addFolder(name, selectedFeeds, type);
        if (!useFeedStore.getState().error) {
            setName('');
            setSelectedFeeds([]);
            onClose();
        }
    };

    const toggleFeed = (feedId) => {
        setSelectedFeeds(prev => 
            prev.includes(feedId) 
                ? prev.filter(id => id !== feedId)
                : [...prev, feedId]
        );
    };

    // Filter out feeds that are already in a folder? 
    // The requirement says "support multi-select feeds to add all to folder".
    // It doesn't explicitly say only ungrouped feeds. But usually you move them.
    // I'll list all feeds for now, or maybe just ungrouped ones?
    // Let's list all feeds, but maybe indicate if they are already in a folder.
    // For simplicity, let's just list all feeds.
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Folder</h2>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col overflow-hidden">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Favorites"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Feeds to Folder</label>
                        <div className="border border-gray-200 rounded-lg overflow-y-auto flex-1 p-2 space-y-1">
                            {feeds.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No feeds available</p>
                            ) : (
                                feeds.map(feed => (
                                    <label key={feed.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFeeds.includes(feed.id)}
                                            onChange={() => toggleFeed(feed.id)}
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{feed.title}</div>
                                            <div className="text-xs text-gray-500 truncate">{feed.url}</div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Folder'}
                    </button>
                </form>
            </div>
        </div>
    );
}
