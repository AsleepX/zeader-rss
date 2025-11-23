import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FeedDetailModal } from './FeedDetailModal';

export function WaterfallView({ feeds }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const allItems = feeds.flatMap(feed =>
    feed.items.map(item => ({ ...item, feedTitle: feed.title, feedUrl: feed.url }))
  ).filter(item => {
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
  });

  const [numColumns, setNumColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      // Subtract sidebar width (280px) + padding (48px) roughly to get container width
      // Or just use window width breakpoints similar to Tailwind
      const width = window.innerWidth;
      if (width >= 2560) setNumColumns(7);
      else if (width >= 1920) setNumColumns(6);
      else if (width >= 1536) setNumColumns(5);
      else if (width >= 1280) setNumColumns(4);
      else if (width >= 1024) setNumColumns(3);
      else if (width >= 640) setNumColumns(2);
      else setNumColumns(1);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const columns = Array.from({ length: numColumns }, () => []);
  allItems.forEach((item, index) => {
    columns[index % numColumns].push(item);
  });

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
    return imgMatch ? imgMatch[1] : null;
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

              return (
                <div
                  key={item.id || item.link}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                >
                  {image && (
                    <div className="relative aspect-auto overflow-hidden">
                      <img
                        src={image}
                        alt={item.title}
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}

                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 mb-1.5 leading-snug text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
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

      {selectedItem && (
        <FeedDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
