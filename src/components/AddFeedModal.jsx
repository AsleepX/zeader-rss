import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFeedStore } from '../store/useFeedStore';
import { motion, AnimatePresence } from 'framer-motion';

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

    // Removed: if (!isOpen) return null;

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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative z-10"
                    >
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
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
                                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        Article
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewType('photo')}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${viewType === 'photo'
                                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        Photo
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
