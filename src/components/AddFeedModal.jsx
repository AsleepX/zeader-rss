import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFeedStore } from '../store/useFeedStore';

export function AddFeedModal({ isOpen, onClose }) {
    const [url, setUrl] = useState('');
    const [viewType, setViewType] = useState('article');
    const { addFeed, isLoading, error, clearError } = useFeedStore();

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
        if (!url) return;
        await addFeed(url, viewType);
        if (!useFeedStore.getState().error) {
            setUrl('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Feed</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RSS URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/feed.xml"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred View</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setViewType('article')}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${viewType === 'article'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                            >
                                Article
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewType('waterfall')}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${viewType === 'waterfall'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                            >
                                Gallery
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
                    </button>
                </form>
            </div>
        </div>
    );
}
