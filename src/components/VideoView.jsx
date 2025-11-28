import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MoreHorizontal, Copy, Check, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { FeedDetailModal } from './FeedDetailModal';
import { useFeedStore } from '../store/useFeedStore';
import { useAIStore } from '../store/useAIStore';

export function VideoView({ feeds }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [originRect, setOriginRect] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isKeyboardMode, setIsKeyboardMode] = useState(false);
    const [tempReadIds, setTempReadIds] = useState(new Set());
    const { markItemAsRead, showUnreadOnly } = useFeedStore();

    // Handle browser back button
    useEffect(() => {
        const handlePopState = (event) => {
            if (selectedItem) {
                setSelectedItem(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [selectedItem]);

    // Reset tempReadIds when showUnreadOnly changes
    useEffect(() => {
        setTempReadIds(new Set());
    }, [showUnreadOnly]);

    useEffect(() => {
        const handleMouseMove = () => {
            setIsKeyboardMode(false);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const allItems = useMemo(() => feeds.flatMap(feed =>
        feed.items.map(item => ({ ...item, feedTitle: feed.title, feedUrl: feed.url, feedId: feed.id }))
    ).filter(item => {
        if (showUnreadOnly && item.read && !tempReadIds.has(item.id)) return false;
        // Filter out future items
        const date = new Date(item.isoDate || item.pubDate);
        if (isNaN(date.getTime())) return true;
        return date <= new Date();
    }).sort((a, b) => {
        const dateA = new Date(a.isoDate || a.pubDate);
        const dateB = new Date(b.isoDate || b.pubDate);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB - dateA;
    }), [feeds, showUnreadOnly, tempReadIds]);

    useEffect(() => {
        if (focusedIndex >= 0 && focusedIndex < allItems.length) {
            const item = allItems[focusedIndex];
            if (!item.read) {
                const timer = setTimeout(() => {
                    if (showUnreadOnly) {
                        setTempReadIds(prev => {
                            const next = new Set(prev);
                            next.add(item.id);
                            return next;
                        });
                    }
                    markItemAsRead(item.feedId, item.id);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [focusedIndex, allItems, markItemAsRead, showUnreadOnly]);

    const getNumColumns = () => {
        if (typeof window === 'undefined') return 1;
        const width = window.innerWidth;
        if (width >= 2560) return 6;
        if (width >= 1920) return 6;
        if (width >= 1536) return 5;
        if (width >= 1280) return 4;
        if (width >= 1024) return 3;
        if (width >= 640) return 2;
        return 2;
    };

    const [numColumns, setNumColumns] = useState(getNumColumns);

    useEffect(() => {
        const handleResize = () => {
            setNumColumns(getNumColumns());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const columns = Array.from({ length: numColumns }, () => []);
    allItems.forEach((item, index) => {
        columns[index % numColumns].push({ ...item, globalIndex: index });
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedItem) return;

            if (focusedIndex === -1) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    setIsKeyboardMode(true);
                    setFocusedIndex(0);
                }
                return;
            }

            let nextIndex = focusedIndex;
            const currentEl = document.getElementById(`card-${focusedIndex}`);
            const currentRect = currentEl?.getBoundingClientRect();
            const currentCol = focusedIndex % numColumns;

            switch (e.key) {
                case 'ArrowRight':
                    if (currentRect && currentCol < numColumns - 1) {
                        const targetCol = currentCol + 1;
                        let closestIdx = -1;
                        let minDiff = Infinity;
                        const currentCenterY = currentRect.top + currentRect.height / 2;

                        const searchRadius = 10;
                        const currentRow = Math.floor(focusedIndex / numColumns);
                        const minRow = Math.max(0, currentRow - searchRadius);
                        const maxRow = currentRow + searchRadius;

                        for (let r = minRow; r <= maxRow; r++) {
                            const i = r * numColumns + targetCol;
                            if (i >= 0 && i < allItems.length) {
                                const el = document.getElementById(`card-${i}`);
                                if (el) {
                                    const rect = el.getBoundingClientRect();
                                    const centerY = rect.top + rect.height / 2;
                                    const diff = Math.abs(centerY - currentCenterY);
                                    if (diff < minDiff) {
                                        minDiff = diff;
                                        closestIdx = i;
                                    }
                                }
                            }
                        }
                        if (closestIdx !== -1) nextIndex = closestIdx;
                    }
                    break;
                case 'ArrowLeft':
                    if (currentRect && currentCol > 0) {
                        const targetCol = currentCol - 1;
                        let closestIdx = -1;
                        let minDiff = Infinity;
                        const currentCenterY = currentRect.top + currentRect.height / 2;

                        const searchRadius = 10;
                        const currentRow = Math.floor(focusedIndex / numColumns);
                        const minRow = Math.max(0, currentRow - searchRadius);
                        const maxRow = currentRow + searchRadius;

                        for (let r = minRow; r <= maxRow; r++) {
                            const i = r * numColumns + targetCol;
                            if (i >= 0 && i < allItems.length) {
                                const el = document.getElementById(`card-${i}`);
                                if (el) {
                                    const rect = el.getBoundingClientRect();
                                    const centerY = rect.top + rect.height / 2;
                                    const diff = Math.abs(centerY - currentCenterY);
                                    if (diff < minDiff) {
                                        minDiff = diff;
                                        closestIdx = i;
                                    }
                                }
                            }
                        }
                        if (closestIdx !== -1) nextIndex = closestIdx;
                    }
                    break;
                case 'ArrowDown':
                    nextIndex = focusedIndex + numColumns;
                    break;
                case 'ArrowUp':
                    nextIndex = focusedIndex - numColumns;
                    break;
                case 'Enter':
                    e.preventDefault();
                    const item = allItems[focusedIndex];
                    if (item) {
                        if (!item.read) {
                            if (showUnreadOnly) {
                                setTempReadIds(prev => {
                                    const next = new Set(prev);
                                    next.add(item.id);
                                    return next;
                                });
                            }
                            markItemAsRead(item.feedId, item.id);
                        }
                        const el = document.getElementById(`card-${focusedIndex}`);
                        if (el) {
                            const rect = el.getBoundingClientRect();
                            setOriginRect(rect);
                            setSelectedItem(item);
                            window.history.pushState({ type: 'video', id: item.id }, '', '');
                        }
                    }
                    return;
                default:
                    return;
            }

            if (nextIndex !== focusedIndex && nextIndex >= 0 && nextIndex < allItems.length) {
                e.preventDefault();
                setIsKeyboardMode(true);
                setFocusedIndex(nextIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusedIndex, numColumns, allItems, selectedItem]);

    useEffect(() => {
        if (focusedIndex >= 0 && isKeyboardMode) {
            const el = document.getElementById(`card-${focusedIndex}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    }, [focusedIndex, isKeyboardMode]);

    if (allItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>No videos found. Add some video feeds to get started!</p>
            </div>
        );
    }

    const decodeHtmlEntities = (text) => {
        if (!text) return text;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    const getImage = (item) => {
        if (item.enclosure?.url) {
            const type = item.enclosure.type;
            const url = item.enclosure.url;
            if (type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
                return url;
            }
        }

        const content = decodeHtmlEntities(item.content);
        const description = decodeHtmlEntities(item.description);

        let videoPosterMatch = content?.match(/<video[^>]+poster=["']([^"']+)["']/);
        if (!videoPosterMatch) {
            videoPosterMatch = description?.match(/<video[^>]+poster=["']([^"']+)["']/);
        }
        if (videoPosterMatch) return videoPosterMatch[1];

        let imgMatch = content?.match(/<img[^>]+src=["']([^"']+)["']/);
        if (!imgMatch) {
            imgMatch = description?.match(/<img[^>]+src=["']([^"']+)["']/);
        }
        if (imgMatch) return imgMatch[1];

        if (item.link && (item.link.includes('youtube.com') || item.link.includes('youtu.be'))) {
            const videoIdMatch = item.link.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/);
            if (videoIdMatch) {
                return `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
            }
        }

        return null;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex gap-4 items-start">
                {columns.map((colItems, colIndex) => (
                    <div key={colIndex} className="flex-1 space-y-4 min-w-0">
                        {colItems.map(item => {
                            const image = getImage(item);
                            const isFocused = item.globalIndex === focusedIndex;

                            return (
                                <div
                                    key={item.id || item.link}
                                    id={`card-${item.globalIndex}`}
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setOriginRect(rect);
                                        setSelectedItem(item);
                                        setFocusedIndex(item.globalIndex);
                                        window.history.pushState({ type: 'video', id: item.id }, '', '');
                                        if (!item.read) {
                                            if (showUnreadOnly) {
                                                setTempReadIds(prev => {
                                                    const next = new Set(prev);
                                                    next.add(item.id);
                                                    return next;
                                                });
                                            }
                                            markItemAsRead(item.feedId, item.id);
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        if (!isKeyboardMode) {
                                            setFocusedIndex(item.globalIndex);
                                        }
                                    }}
                                    className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 group cursor-pointer ${item.globalIndex === 0 ? 'scroll-mb-24' : item.globalIndex === allItems.length - 1 ? 'scroll-mt-24' : 'scroll-my-24'
                                        } ${isFocused && isKeyboardMode ? 'ring-2 ring-primary-500' : ''}`}
                                >
                                    {image && (
                                        <div className="relative aspect-video overflow-hidden bg-black">
                                            <img
                                                src={image}
                                                alt={item.title}
                                                className={`w-full h-full object-cover transition-transform duration-700 ${isFocused ? 'scale-105' : ''
                                                    }`}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                    <Play className="w-6 h-6 text-white fill-current" />
                                                </div>
                                            </div>
                                            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'
                                                }`} />
                                        </div>
                                    )}

                                    <div className="p-3">
                                        <h3 className={`font-bold text-gray-900 mb-1.5 leading-snug text-sm line-clamp-2 transition-colors ${isFocused ? 'text-primary-600' : ''
                                            }`}>
                                            {item.title}
                                        </h3>

                                        <div className="flex items-center justify-between mt-2 h-6">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-5 h-5 rounded-full bg-primary-50 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-primary-600">
                                                    {item.feedTitle.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[11px] font-medium text-gray-600 truncate max-w-[100px]">
                                                    {item.feedTitle}
                                                </span>
                                            </div>

                                            <div className="relative flex items-center justify-end min-w-[60px] gap-2">
                                                <span className="text-[10px] text-gray-400 text-right w-full">
                                                    {item.isoDate || item.pubDate ? formatDistanceToNow(new Date(item.isoDate || item.pubDate), { addSuffix: true }).replace('about ', '') : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {selectedItem && (
                    <FeedDetailModal
                        item={selectedItem}
                        originRect={originRect}
                        onClose={() => window.history.back()}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
