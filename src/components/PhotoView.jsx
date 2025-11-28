import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MoreHorizontal, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { FeedDetailModal } from './FeedDetailModal';
import { useFeedStore } from '../store/useFeedStore';
import { useAIStore } from '../store/useAIStore';

export function PhotoView({ feeds }) {
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
    if (width >= 2560) return 7;
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

            // Optimize: Only search nearby items instead of full column scan
            const searchRadius = 10; // Check 10 rows above and below
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

            // Optimize: Only search nearby items instead of full column scan
            const searchRadius = 10; // Check 10 rows above and below
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
              window.history.pushState({ type: 'photo', id: item.id }, '', '');
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
        <p>No articles found. Add some feeds to get started!</p>
      </div>
    );
  }

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Helper to extract first image from content if not present in enclosure
  const getImage = (item) => {
    // Check if enclosure is an image
    if (item.enclosure?.url) {
      const type = item.enclosure.type;
      const url = item.enclosure.url;
      // If type explicitly says image, or URL ends with image extension
      if (type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
        return url;
      }
    }

    // Decode HTML entities in content and description
    const content = decodeHtmlEntities(item.content);
    const description = decodeHtmlEntities(item.description);

    // Try to extract poster from video tag first (check both content and description)
    let videoPosterMatch = content?.match(/<video[^>]+poster=["']([^"']+)["']/);
    if (!videoPosterMatch) {
      videoPosterMatch = description?.match(/<video[^>]+poster=["']([^"']+)["']/);
    }
    if (videoPosterMatch) return videoPosterMatch[1];

    // Fallback to img tag (check both content and description)
    let imgMatch = content?.match(/<img[^>]+src=["']([^"']+)["']/);
    if (!imgMatch) {
      imgMatch = description?.match(/<img[^>]+src=["']([^"']+)["']/);
    }
    if (imgMatch) return imgMatch[1];

    // YouTube thumbnail fallback
    if (item.link && (item.link.includes('youtube.com') || item.link.includes('youtu.be'))) {
      const videoIdMatch = item.link.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/);
      if (videoIdMatch) {
        return `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
      }
    }

    return null;
  };

  const extractJavId = (item) => {
    // 1. Try to extract from content/description by stripping HTML first
    const htmlContent = item.content || item.description || '';
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    const textContent = div.textContent || div.innerText || '';

    // Look for "ID: XXXXX" pattern in text content
    // The text content usually looks like "ID: GQN-007 Released Date: ..."
    // Using a more flexible regex to catch ID followed by whitespace or end of line
    const idMatch = textContent.match(/ID:\s*([A-Za-z0-9-]+)/i);
    if (idMatch) return idMatch[1];

    // 2. Fallback: Try to extract from title (e.g. "GQN-007 Title...")
    // Matches patterns like "ABC-123" at the start of the title
    const titleMatch = item.title?.match(/^([A-Za-z0-9]+-[0-9]+)/);
    if (titleMatch) return titleMatch[1];

    return null;
  };

  const handleCopy = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };



  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="flex gap-4 items-start">
        {columns.map((colItems, colIndex) => (
          <div key={colIndex} className="flex-1 space-y-4 min-w-0">
            {colItems.map(item => {
              const image = getImage(item);
              const isJavDb = item.feedUrl?.includes('javdb');
              const javId = isJavDb ? extractJavId(item) : null;
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
                    window.history.pushState({ type: 'photo', id: item.id }, '', '');
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
                    <div className="relative aspect-auto overflow-hidden">
                      <img
                        src={image}
                        alt={item.title}
                        className={`w-full h-auto object-cover transition-transform duration-700 ${isFocused ? 'scale-105' : ''
                          }`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'
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
                        {isJavDb && javId && (
                          <button
                            onClick={(e) => handleCopy(e, javId)}
                            className="p-1.5 hover:bg-primary-50 rounded-full transition-colors text-gray-400 hover:text-primary-600 flex-shrink-0"
                            title={`Copy ID: ${javId}`}
                          >
                            {copiedId === javId ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        )}
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
