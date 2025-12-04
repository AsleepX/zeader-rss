import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Clock, ChevronLeft, Play, Share2, Globe, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore } from '../store/useFeedStore';
import { useAIStore } from '../store/useAIStore';
import { api } from '../utils/api';
import { AISummaryPanel } from './AISummaryPanel';

// Helper to extract the first image from HTML content
const extractImage = (html) => {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
};

// Helper to strip HTML tags for snippet
const stripHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Helper to estimate read time
const estimateReadTime = (text) => {
  const wordsPerMinute = 200;
  const charsPerMinute = 500; // Average reading speed for Chinese characters

  const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const nonChineseText = text.replace(/[\u4e00-\u9fa5]/g, ' ');
  const wordCount = nonChineseText.trim().split(/\s+/).filter(w => w.length > 0).length;

  const minutes = Math.ceil(chineseCount / charsPerMinute + wordCount / wordsPerMinute);
  return `${minutes || 1} min`;
};

function ArticleList({ articles, onSelectArticle, initialSelectedId, onMarkAsRead }) {
  const initialIndex = initialSelectedId ? articles.findIndex(a => a.id === initialSelectedId) : -1;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const itemRefs = useRef([]);
  const [highlightStyle, setHighlightStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const isKeyboardNav = useRef(initialIndex >= 0);

  useEffect(() => {
    const handleMouseMove = () => {
      isKeyboardNav.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useLayoutEffect(() => {
    const updateHighlight = () => {
      if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
        const el = itemRefs.current[selectedIndex];
        setHighlightStyle({
          top: el.offsetTop,
          height: el.offsetHeight,
          opacity: 1
        });
      } else {
        setHighlightStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [selectedIndex, articles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        isKeyboardNav.current = true;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev + 1;
          return next < articles.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev - 1;
          return next >= 0 ? next : prev;
        });
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        onSelectArticle(articles[selectedIndex]);
      } else if (e.code === 'Space' && selectedIndex >= 0) {
        e.preventDefault();
        if (onMarkAsRead) {
          onMarkAsRead(articles[selectedIndex]);
        }
        setSelectedIndex(prev => {
          const next = prev + 1;
          return next < articles.length ? next : prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [articles, selectedIndex, onSelectArticle, onMarkAsRead]);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="max-w-5xl mx-auto relative pt-6 pb-6">
      {/* Highlight Background */}
      <div
        className="absolute left-0 w-full bg-gray-50 rounded-lg transition-all duration-200 ease-out pointer-events-none overflow-hidden"
        style={{
          top: highlightStyle.top,
          height: highlightStyle.height,
          opacity: highlightStyle.opacity,
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#76B2ED]" />
      </div>

      {articles.map((article, index) => {
        const image = extractImage(article.content) || extractImage(article.contentSnippet);
        const snippet = stripHtml(article.contentSnippet || article.content).slice(0, 150) + '...';
        const date = article.isoDate || article.pubDate ? new Date(article.isoDate || article.pubDate) : new Date();

        return (
          <div
            key={article.id}
            ref={el => itemRefs.current[index] = el}
            onClick={() => onSelectArticle(article)}
            onMouseEnter={() => {
              if (!isKeyboardNav.current) {
                setSelectedIndex(index);
              }
            }}
            className={`group flex gap-2 md:gap-3 px-3 md:px-6 py-3 cursor-pointer relative z-10 mb-2 rounded-lg transition-colors duration-200 ${index === selectedIndex ? '' : 'hover:bg-gray-50'
              }`}
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-16 h-16">
              <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                {image ? (
                  <img src={image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Globe className="w-6 h-6" />
                  </div>
                )}
              </div>
              {!article.read && (
                <div className="absolute -top-[4px] -left-[4px] w-2.5 h-2.5 rounded-full bg-[#12C0D1] border-[2px] border-white z-20 shadow-sm"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <h3 className={`font-bold text-base leading-tight mb-1 truncate pr-4 ${!article.read ? 'text-black' : 'text-gray-500'}`}>
                  {article.title}
                </h3>
                <p className="text-gray-500 text-sm truncate leading-relaxed">
                  {snippet}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                {/* Feed Icon/Name */}
                <div className="flex items-center gap-1.5 font-medium text-gray-600">
                  {/* Placeholder for feed icon */}
                  <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                    {article.feedTitle ? article.feedTitle[0].toUpperCase() : 'R'}
                  </div>
                  <span>{article.feedTitle}</span>
                </div>

                <span>•</span>

                {article.author && (
                  <>
                    <span className="truncate max-w-[150px]">{article.author}</span>
                    <span>•</span>
                  </>
                )}

                <span className="flex items-center gap-1">
                  {formatDistanceToNow(date, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MemoizedContentBlock = React.memo(({ html }) => (
  <div dangerouslySetInnerHTML={{ __html: html }} />
));

function ArticleDetail({ article, onBack }) {
  const { feeds } = useFeedStore();
  const [fullContent, setFullContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [contentBlocks, setContentBlocks] = useState([]);
  const [highlightStyle, setHighlightStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const blockRefs = useRef([]);
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    const updateHighlight = () => {
      if (selectedBlockIndex >= 0 && blockRefs.current[selectedBlockIndex]) {
        const el = blockRefs.current[selectedBlockIndex];
        // Calculate relative position within the article container
        const container = contentRef.current;
        if (container) {
          setHighlightStyle({
            top: el.offsetTop,
            height: el.offsetHeight,
            opacity: 1
          });
        }
      } else {
        setHighlightStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [selectedBlockIndex, contentBlocks]);
  const scrollContainerRef = useRef(null); // 添加滚动容器的引用
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef(null);
  const shouldAutoScroll = useRef(false);

  const feed = feeds.find(f => f.id === article.feedId);
  const shouldLoadFullContent = feed?.loadFullContent;

  // AI Summary State
  const { generateText, language, isAIEnabled } = useAIStore();
  const [zymalData, setZymalData] = useState(null);
  const [loadingZymal, setLoadingZymal] = useState(false);

  // Z Summary Generation
  useEffect(() => {
    const generateZymal = async () => {
      // Check if AI is enabled
      if (!isAIEnabled) return;

      // If feed requires full content loading, wait for it
      if (shouldLoadFullContent && !fullContent) {
        return;
      }

      const content = fullContent || article.content || article.contentSnippet || '';
      if (!content) return;

      setLoadingZymal(true);
      try {
        const prompt = `
你是文章摘要专家。请根据提供的文章内容，生成一个简洁的 YAML 格式信息栏。

# Inputs
- Title: ${article.title}
- Author: ${article.author || article.feedTitle}
- Content: ${stripHtml(content).slice(0, 8000)}
- Date: ${article.isoDate || article.pubDate}
- Target Language: ${language}

# Instructions
1. **分析内容**：理解文章核心主旨。
2. **提取与总结**：
   - 提取关键标签 (Tags)。
   - 生成摘要 (Summary)：摘要应包含三句话。每句话都应简短易懂。请言简意赅，抓住核心思想。
3. **格式化**：输出为纯净的 YAML 格式（不要使用 Markdown 代码块包裹），键名使用英文。
   - Title: 翻译为 ${language}。
   - Summary: 语言必须为 ${language}。
   - Tags: 语言必须为 ${language}。

# Output Schema (YAML)
Title: 翻译后的标题
Tags: 标签1, 标签2, 标签3
Summary: 三句话摘要
`;
        const result = await generateText(prompt);

        // Parse YAML-like output manually
        const parsedData = {};
        const lines = result.split('\n');
        lines.forEach(line => {
          const match = line.match(/^([a-zA-Z]+):\s*(.+)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            // Handle Tags as array, remove brackets if present
            if (key === 'Tags') {
              const cleanValue = value.replace(/^\[|\]$/g, '');
              parsedData[key] = cleanValue.split(',').map(t => t.trim().replace(/^\[|\]$/g, ''));
            } else {
              parsedData[key] = value;
            }
          }
        });

        if (Object.keys(parsedData).length > 0) {
          setZymalData(parsedData);
        }

      } catch (error) {
        console.error("Z Summary Generation Error:", error);
      } finally {
        setLoadingZymal(false);
      }
    };

    generateZymal();
  }, [article, fullContent, shouldLoadFullContent, language, generateText, isAIEnabled]);

  useEffect(() => {
    if (!shouldLoadFullContent) {
      setFullContent(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchFullContent = async () => {
      try {
        setIsLoading(true);
        const data = await api.getArticle(article.link);
        if (isMounted && data.content) {
          setFullContent(data.content);
        }
      } catch (error) {
        console.error('Failed to fetch full content:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFullContent();
    return () => { isMounted = false; };
  }, [article.link, shouldLoadFullContent]);

  // Parse content into blocks
  useEffect(() => {
    // If feed requires full content loading, wait for it
    if (shouldLoadFullContent && !fullContent && isLoading) {
      setContentBlocks([]);
      return;
    }

    const contentToDisplay = fullContent || article.content || article.contentSnippet || '';
    if (!contentToDisplay) {
      setContentBlocks([]);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(contentToDisplay, 'text/html');
    const blocks = [];

    // Recursively extract meaningful content blocks
    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        // These are actual content blocks - don't recurse into them
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'figure', 'iframe'].includes(tagName)) {
          // Skip empty paragraphs
          if (tagName === 'p' && !node.textContent.trim() && !node.querySelector('img')) {
            return;
          }
          blocks.push({
            type: tagName,
            html: node.outerHTML,
            text: node.textContent
          });
        }
        // Handle images separately as individual blocks
        else if (tagName === 'img') {
          blocks.push({
            type: 'img',
            html: node.outerHTML,
            text: node.alt || ''
          });
        }
        // For wrapper/container elements, recurse into children
        else {
          Array.from(node.childNodes).forEach(processNode);
        }
      }
    };

    Array.from(doc.body.childNodes).forEach(processNode);
    setContentBlocks(blocks);
    setSelectedBlockIndex(0);
    blockRefs.current = [];
  }, [fullContent, article.content, article.contentSnippet, shouldLoadFullContent, isLoading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        onBack();
        return;
      }

      // Open original article on 'o' key press
      if (e.key === 'o' || e.key === 'O') {
        if (article.link) {
          window.open(article.link, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        shouldAutoScroll.current = true;
        setSelectedBlockIndex(prev => {
          const next = Math.min(prev + 1, contentBlocks.length - 1);
          return next;
        });
        isUserScrolling.current = false;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        shouldAutoScroll.current = true;
        setSelectedBlockIndex(prev => {
          const next = Math.max(prev - 1, 0);
          return next;
        });
        isUserScrolling.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, contentBlocks.length, article.link]);

  // Auto-scroll selected block to center
  useEffect(() => {
    if (!isUserScrolling.current && shouldAutoScroll.current && selectedBlockIndex >= 0 && blockRefs.current[selectedBlockIndex]) {
      blockRefs.current[selectedBlockIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      shouldAutoScroll.current = false;
    }
  }, [selectedBlockIndex]);

  // Track user scrolling and update selection on stop
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      isUserScrolling.current = true;
      shouldAutoScroll.current = false;

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        isUserScrolling.current = false;

        // Find the block closest to the center of the viewport
        const containerRect = scrollContainer.getBoundingClientRect();
        const viewportCenter = containerRect.top + containerRect.height / 2;
        let minDistance = Infinity;
        let closestIndex = -1;

        blockRefs.current.forEach((block, index) => {
          if (block) {
            const rect = block.getBoundingClientRect();
            const blockCenter = rect.top + rect.height / 2;
            const distance = Math.abs(viewportCenter - blockCenter);

            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = index;
            }
          }
        });

        if (closestIndex !== -1) {
          setSelectedBlockIndex(current => {
            if (current !== closestIndex) return closestIndex;
            return current;
          });
        }
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const date = article.isoDate || article.pubDate ? new Date(article.isoDate || article.pubDate) : new Date();
  const contentToDisplay = fullContent || article.content || article.contentSnippet || '';
  const readTime = estimateReadTime(stripHtml(contentToDisplay));

  // Remove the first image from content if it's the same as the featured image to avoid duplication
  // This is a simple heuristic; might need refinement
  let contentHtml = contentToDisplay;

  return (
    <div ref={scrollContainerRef} className="relative min-h-full overflow-y-auto h-full">
      {/* Back Button - Sticky positioned */}
      <div className="sticky top-4 z-10 h-0 overflow-visible">
        <button
          onClick={onBack}
          className="ml-16 p-2 text-gray-500 hover:bg-gray-100 bg-white/80 backdrop-blur-sm rounded-lg transition-all duration-300 border border-gray-200 opacity-0 hover:opacity-100"
          aria-label="Go back"
          title="Go back (Esc)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-[676px] mx-auto px-6 py-8 animate-in fade-in duration-300">
        {/* Article Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-6 text-sm font-medium text-gray-600">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              {article.feedTitle ? article.feedTitle[0].toUpperCase() : 'R'}
            </div>
            <span>{article.feedTitle}</span>
          </div>

          <h1 className="article-title text-4xl md:text-5xl font-medium text-gray-900 mb-6 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center justify-between text-sm text-gray-500 border-t border-b border-gray-100 py-4">
            <div className="flex items-center gap-3">
              {article.author && (
                <>
                  <span className="font-medium text-gray-900">{article.author}</span>
                  <span>•</span>
                </>
              )}
              <span>{readTime} read</span>
              <span>•</span>
              <span>{format(date, 'MMM d, yyyy h:mm a')}</span>
            </div>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary-600 transition-colors"
              title="View original (o)"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Z Summary Info Bar */}
        {(loadingZymal || zymalData) && (
          <div className="mb-10 p-6 bg-primary-50/30 rounded-xl border-2 border-primary-100">
            <div className="flex items-center gap-2 mb-4 text-primary-600 font-semibold text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Z Summary</span>
              {loadingZymal && <Loader2 className="w-4 h-4 animate-spin ml-auto text-primary-400" />}
            </div>

            {zymalData && (
              <div className="grid grid-cols-1 gap-y-3 text-sm">
                {zymalData.Title && (
                  <div className="font-medium text-gray-900 text-lg">
                    {zymalData.Title}
                  </div>
                )}

                {zymalData.Tags && Array.isArray(zymalData.Tags) && (
                  <div className="flex gap-2 items-start mt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {zymalData.Tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-primary-100 text-primary-700 rounded-md text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {zymalData.Summary && (
                  <div className="mt-2 pt-3 border-t border-primary-100 text-gray-700 leading-relaxed italic">
                    {zymalData.Summary}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Article Content */}
        <article ref={contentRef} className="prose prose-lg prose-slate max-w-none font-serif prose-headings:font-serif prose-a:text-primary-600 prose-img:rounded-xl [&_iframe]:w-full [&_iframe]:!h-auto [&_iframe]:!aspect-[3/2] relative">
          {/* Highlight Line - Hidden on mobile */}
          <div
            className="absolute -left-6 w-[3.5px] bg-[#76B2ED] transition-all duration-200 ease-out pointer-events-none hidden md:block"
            style={{
              top: highlightStyle.top,
              height: highlightStyle.height,
              opacity: highlightStyle.opacity,
            }}
          />

          {isLoading && !fullContent && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 animate-pulse">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
              <span>Loading full content...</span>
            </div>
          )}
          {contentBlocks.length > 0 ? (
            contentBlocks.map((block, index) => (
              <div
                key={index}
                ref={el => blockRefs.current[index] = el}
                className="transition-all duration-200 mb-6 pl-6 -ml-6 border-l-4 border-transparent"
              >
                <MemoizedContentBlock html={block.html} />
              </div>
            ))
          ) : (
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          )}
        </article>
      </div>
    </div>
  );
}

export function ArticleView({ feeds }) {
  const { markItemAsRead, showUnreadOnly } = useFeedStore();
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const scrollPositionRef = useRef(0);
  const listContainerRef = useRef(null);

  // AI Summary Panel State
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event) => {
      if (selectedArticle) {
        setSelectedArticle(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedArticle]);

  // Handle 'z' key for AI Summary Panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Toggle AI Summary Panel on 'z' key press
      if (e.key === 'z' || e.key === 'Z') {
        setIsAISummaryOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAISummaryOpen]);

  const allItems = feeds.flatMap(feed =>
    feed.items.map(item => ({ ...item, feedTitle: feed.title, feedId: feed.id }))
  ).filter(item => !showUnreadOnly || !item.read)
    .sort((a, b) => {
      const dateA = new Date(a.isoDate || a.pubDate);
      const dateB = new Date(b.isoDate || b.pubDate);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB - dateA;
    });

  // Restore scroll position when returning to list view
  const setListContainerRef = useCallback((node) => {
    listContainerRef.current = node;
    if (node && scrollPositionRef.current > 0) {
      node.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Handle article selection from AI Summary Panel
  const handleSelectArticleFromSummary = useCallback((articleRef) => {
    // Find the full article from allItems using the reference
    const fullArticle = allItems.find(item =>
      item.id === articleRef.id ||
      (item.feedId === articleRef.feedId && item.title === articleRef.title)
    );

    if (fullArticle) {
      // Save current scroll position
      if (listContainerRef.current) {
        scrollPositionRef.current = listContainerRef.current.scrollTop;
      }
      setHasNavigated(true);
      setSelectedArticle(fullArticle);
      setLastSelectedId(fullArticle.id);

      // Push history state
      window.history.pushState({ type: 'article', id: fullArticle.id }, '', '');

      if (!fullArticle.read) {
        markItemAsRead(fullArticle.feedId, fullArticle.id);
      }
    }
  }, [allItems, markItemAsRead]);

  if (allItems.length === 0) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-4 text-center">
          <p>No articles found. Add some feeds to get started!</p>
        </div>
        {/* AI Summary Panel */}
        <AISummaryPanel
          isOpen={isAISummaryOpen}
          onClose={() => setIsAISummaryOpen(false)}
          onSelectArticle={handleSelectArticleFromSummary}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 h-full">
        <AnimatePresence mode="wait">
          {selectedArticle ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="h-full"
            >
              <ArticleDetail
                article={selectedArticle}
                onBack={() => window.history.back()}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              ref={setListContainerRef}
              initial={hasNavigated ? { opacity: 0, x: -50 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="h-full overflow-y-auto"
            >
              <ArticleList
                articles={allItems}
                initialSelectedId={lastSelectedId}
                onMarkAsRead={(article) => {
                  if (!article.read) {
                    markItemAsRead(article.feedId, article.id);
                  }
                }}
                onSelectArticle={(article) => {
                  // Save current scroll position before navigating
                  if (listContainerRef.current) {
                    scrollPositionRef.current = listContainerRef.current.scrollTop;
                  }
                  setHasNavigated(true);
                  setSelectedArticle(article);
                  setLastSelectedId(article.id);

                  // Push history state
                  window.history.pushState({ type: 'article', id: article.id }, '', '');

                  if (!article.read) {
                    markItemAsRead(article.feedId, article.id);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Summary Panel - Side Panel (inline, not overlay) */}
      <AISummaryPanel
        isOpen={isAISummaryOpen}
        onClose={() => setIsAISummaryOpen(false)}
        onSelectArticle={handleSelectArticleFromSummary}
      />
    </div>
  );
}
