import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Clock, ChevronLeft, Play, Share2, Globe, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore } from '../store/useFeedStore';
import { useAIStore } from '../store/useAIStore';
import { api } from '../utils/api';
import { AISummaryPanel } from './AISummaryPanel';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { AnnotationPopover } from './AnnotationPopover';
import { AnnotationSideNote } from './AnnotationSideNote';
import { generateFootnotesSection } from '../utils/textUtils';
import { useTTSStore } from '../store/useTTSStore';
import { AudioPlayer } from './AudioPlayer';
import { Headphones } from 'lucide-react';

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
  const [isKeyboardNavState, setIsKeyboardNavState] = useState(initialIndex >= 0);
  const navDirection = useRef(null); // 'up' or 'down'

  useEffect(() => {
    const handleMouseMove = () => {
      isKeyboardNav.current = false;
      setIsKeyboardNavState(false);
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
        setIsKeyboardNavState(true);
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navDirection.current = 'down';
        setSelectedIndex(prev => {
          const next = prev + 1;
          return next < articles.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navDirection.current = 'up';
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
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex] && navDirection.current) {
      const currentEl = itemRefs.current[selectedIndex];
      const container = currentEl.closest('.overflow-y-auto') || window;
      const isWindow = container === window;
      
      const containerRect = isWindow 
        ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
        : container.getBoundingClientRect();
      const elRect = currentEl.getBoundingClientRect();
      
      // Calculate buffer - roughly one item height
      const buffer = elRect.height + 16;
      
      if (navDirection.current === 'down') {
        // When going down, keep item away from bottom edge
        const bottomThreshold = containerRect.bottom - buffer;
        if (elRect.bottom > bottomThreshold) {
          const scrollAmount = elRect.bottom - bottomThreshold;
          if (isWindow) {
            window.scrollBy({ top: scrollAmount, behavior: 'instant' });
          } else {
            container.scrollBy({ top: scrollAmount, behavior: 'instant' });
          }
        }
      } else if (navDirection.current === 'up') {
        // When going up, keep item away from top edge
        const topThreshold = containerRect.top + buffer;
        if (elRect.top < topThreshold) {
          const scrollAmount = elRect.top - topThreshold;
          if (isWindow) {
            window.scrollBy({ top: scrollAmount, behavior: 'instant' });
          } else {
            container.scrollBy({ top: scrollAmount, behavior: 'instant' });
          }
        }
      }
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
            className={`group flex gap-2 md:gap-3 px-3 md:px-6 py-3 cursor-pointer relative z-10 mb-2 rounded-lg transition-colors duration-200 ${index === selectedIndex ? '' : (isKeyboardNavState ? '' : 'hover:bg-gray-50')
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

// Helper function to wrap text content with <mark> tags for Obsidian Clipper compatibility
const wrapTextWithMark = (html) => {
  // Parse HTML and wrap text nodes with <mark> tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const wrapTextNodes = (node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const mark = doc.createElement('mark');
      mark.className = 'zeader-highlight';
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip certain elements
      const tagName = node.tagName.toLowerCase();
      if (tagName === 'mark' || tagName === 'img' || tagName === 'br' || tagName === 'hr' || (tagName === 'span' && node.className === 'zeader-annotation-marker')) {
        return;
      }
      // Process children (make a copy of childNodes since we're modifying the DOM)
      Array.from(node.childNodes).forEach(child => wrapTextNodes(child));
    }
  };

  wrapTextNodes(doc.body);
  return doc.body.innerHTML;
};

const MemoizedContentBlock = React.memo(({ html, translation, isTranslating, isHighlighted, isReading }) => {
  // Wrap text content with <mark> tags when highlighted for Obsidian Clipper compatibility
  const wrappedHtml = isHighlighted ? wrapTextWithMark(html) : html;

  return (
    <div>
      <div className="relative">
        <div
          data-content-container="true"
          className={`${isHighlighted ? 'zeader-block-highlight' : ''} ${isReading ? 'bg-blue-50/50 rounded-lg -mx-2 px-2 transition-colors duration-300' : ''}`}
          dangerouslySetInnerHTML={{ __html: wrappedHtml }}
        />
        {isTranslating && (
          <span className="inline-flex items-center ml-2 text-primary-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        )}
      </div>
      {translation && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-gray-700 leading-relaxed">
          {translation}
        </div>
      )}
    </div>
  );
});

function ArticleDetail({ article, onBack }) {
  const { feeds } = useFeedStore();
  const [fullContent, setFullContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [contentBlocks, setContentBlocks] = useState([]);
  const [highlightStyle, setHighlightStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const blockRefs = useRef([]);
  const contentRef = useRef(null);

  // Translation state
  const [translations, setTranslations] = useState({}); // { blockIndex: translatedText }
  const [fullTranslationCache, setFullTranslationCache] = useState({}); // Cache for full article translation
  const [isFullTranslationMode, setIsFullTranslationMode] = useState(false);
  const shouldShowTranslationsRef = useRef(false); // Ref to track visibility for async updates
  const [translatingIndices, setTranslatingIndices] = useState(new Set()); // Currently translating block indices

  // Reset states when article changes
  useEffect(() => {
    setTranslations({});
    setFullTranslationCache({});
    setIsFullTranslationMode(false);
    shouldShowTranslationsRef.current = false;
    setTranslatingIndices(new Set());
  }, [article.id]);

  // Highlight state (temporary, not persisted)
  const [highlightedBlocks, setHighlightedBlocks] = useState(new Set()); // Set of highlighted block indices
  const [selectedHighlightMark, setSelectedHighlightMark] = useState(null); // Currently selected highlight mark element for unhighlighting

  // Annotation State
  const [annotations, setAnnotations] = useState([]);
  const [popoverState, setPopoverState] = useState({
    isOpen: false,
    position: { top: 0, left: 0 },
    blockIndex: -1,
    type: 'selection',
    editingAnnotationId: null,  // ID of annotation being edited
    initialText: ''  // Initial text for editing
  });
  const pendingMarkRef = useRef(null); // Ref to the newly created mark before saving annotation

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

    const rafId = requestAnimationFrame(updateHighlight);
    window.addEventListener('resize', updateHighlight);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [selectedBlockIndex, contentBlocks, translations]);

  // AI Annotation State
  const [isGeneratingAnnotation, setIsGeneratingAnnotation] = useState(false);
  const [pendingSelectionAnnotationId, setPendingSelectionAnnotationId] = useState(null); // Auto-select new annotation
  const scrollContainerRef = useRef(null); // 添加滚动容器的引用
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef(null);
  const shouldAutoScroll = useRef(false);
  const isKeyboardNavigating = useRef(false); // Track keyboard navigation to prevent scroll handler interference

  const feed = feeds.find(f => f.id === article.feedId);
  const shouldLoadFullContent = feed?.loadFullContent;

  // AI Summary State
  const { generateText, language, isAIEnabled } = useAIStore();
  const [zymalData, setZymalData] = useState(null);
  const [loadingZymal, setLoadingZymal] = useState(false);

  // Update document meta tags for Obsidian Clipper and other web clippers
  useDocumentMeta(article, zymalData, annotations);

  // TTS Integration
  const { playArticle, stop, currentBlockIndex: ttsBlockIndex, isPlaying: isTTSPlaying } = useTTSStore();

  // Sync TTS progress with selected block
  useEffect(() => {
    if (isTTSPlaying && ttsBlockIndex >= 0) {
      setSelectedBlockIndex(ttsBlockIndex);
      shouldAutoScroll.current = true;
    }
  }, [ttsBlockIndex, isTTSPlaying]);

  // Clean up TTS when unmounting article
  useEffect(() => {
    return () => {
      stop(); // Stop playback when leaving the article
    };
  }, [stop]);

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

  // Helper to check if URL is from Twitter/X
  const isTwitterUrl = (url) => {
    if (!url) return false;
    return url.includes('twitter.com') || url.includes('x.com') || url.includes('twimg.com');
  };

  useEffect(() => {
    // Skip full content fetch for Twitter - RSS content is already complete
    // and Readability cannot properly parse Twitter pages
    if (!shouldLoadFullContent || isTwitterUrl(article.link)) {
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

    // Pre-process: wrap loose text nodes and <br> tags into <p> elements
    // This handles Twitter-style content where text is not wrapped in paragraphs
    // Split into multiple paragraphs when encountering double <br> (empty lines)
    // Maintains original order for complex structures like: text + image + text + image
    const wrapLooseTextNodes = (parentNode) => {
      const childNodes = Array.from(parentNode.childNodes);
      let currentParagraph = [];
      let consecutiveBrCount = 0;
      const newChildren = []; // Rebuild children in correct order
      
      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          // Check if there's actual text content (not just br tags)
          const hasText = currentParagraph.some(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              return node.textContent.trim().length > 0;
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toLowerCase();
              if (tag !== 'br') {
                return node.textContent.trim().length > 0;
              }
            }
            return false;
          });
          
          if (hasText) {
            const p = doc.createElement('p');
            // Remove trailing br tags
            while (currentParagraph.length > 0) {
              const lastNode = currentParagraph[currentParagraph.length - 1];
              if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.tagName.toLowerCase() === 'br') {
                currentParagraph.pop();
              } else {
                break;
              }
            }
            // Remove leading br tags
            while (currentParagraph.length > 0) {
              const firstNode = currentParagraph[0];
              if (firstNode.nodeType === Node.ELEMENT_NODE && firstNode.tagName.toLowerCase() === 'br') {
                currentParagraph.shift();
              } else {
                break;
              }
            }
            
            if (currentParagraph.length > 0) {
              currentParagraph.forEach(node => {
                p.appendChild(node.cloneNode(true));
              });
              newChildren.push(p);
            }
          }
          currentParagraph = [];
        }
        consecutiveBrCount = 0;
      };
      
      childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Check if text is just whitespace between elements
          if (node.textContent.trim().length > 0) {
            consecutiveBrCount = 0;
            currentParagraph.push(node);
          } else if (currentParagraph.length > 0) {
            // Keep whitespace within a paragraph for spacing
            currentParagraph.push(node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          
          if (tagName === 'br') {
            consecutiveBrCount++;
            // Two or more consecutive <br> = paragraph break
            if (consecutiveBrCount >= 2) {
              flushParagraph();
            } else {
              currentParagraph.push(node);
            }
          } else if (tagName === 'a' || tagName === 'span' || tagName === 'strong' || tagName === 'em' || tagName === 'b' || tagName === 'i' || tagName === 'code') {
            // Inline elements - add to current paragraph
            consecutiveBrCount = 0;
            currentParagraph.push(node);
          } else {
            // Block-level element (img, video, div, etc.) - flush paragraph first, then add the element
            flushParagraph();
            newChildren.push(node.cloneNode(true));
          }
        }
      });
      
      // Flush any remaining content
      flushParagraph();
      
      // Clear parent and rebuild with new children in correct order
      while (parentNode.firstChild) {
        parentNode.removeChild(parentNode.firstChild);
      }
      newChildren.forEach(child => {
        parentNode.appendChild(child);
      });
    };
    
    wrapLooseTextNodes(doc.body);

    // Recursively extract meaningful content blocks
    // Helper to remove placeholder images from a node
    const removePlaceholderImages = (node) => {
      const imgs = node.querySelectorAll('img');
      imgs.forEach(img => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        const ariaLabel = img.getAttribute('aria-label') || '';
        // Check for common placeholder patterns
        if (src.includes('placeholder') ||
          src.includes('spacer') ||
          src.includes('blank.gif') ||
          src.includes('1x1') ||
          alt.toLowerCase().includes('unavailable') ||
          ariaLabel.toLowerCase().includes('unavailable')) {
          img.remove();
        }
      });
    };

    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        // These are actual content blocks - don't recurse into them
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'figure', 'iframe'].includes(tagName)) {
          // Skip empty paragraphs
          if (tagName === 'p' && !node.textContent.trim() && !node.querySelector('img') && !node.querySelector('video')) {
            return;
          }
          // Clone the node and remove placeholder images before adding to blocks
          const clonedNode = node.cloneNode(true);
          removePlaceholderImages(clonedNode);
          // Skip if after removing placeholders the block is empty
          if (!clonedNode.textContent.trim() && !clonedNode.querySelector('img') && !clonedNode.querySelector('video')) {
            return;
          }
          blocks.push({
            type: tagName,
            html: clonedNode.outerHTML,
            text: clonedNode.textContent
          });
        }
        // Handle images separately as individual blocks
        else if (tagName === 'img') {
          // Skip placeholder images
          const imgSrc = node.getAttribute('src') || '';
          const imgAlt = node.getAttribute('alt') || '';
          const imgAriaLabel = node.getAttribute('aria-label') || '';
          if (imgSrc.includes('placeholder') ||
            imgSrc.includes('spacer') ||
            imgSrc.includes('blank.gif') ||
            imgSrc.includes('1x1') ||
            imgAlt.toLowerCase().includes('unavailable') ||
            imgAriaLabel.toLowerCase().includes('unavailable')) {
            return;
          }
          blocks.push({
            type: 'img',
            html: node.outerHTML,
            text: node.alt || ''
          });
        }
        // Handle video elements separately as individual blocks
        else if (tagName === 'video') {
          const videoSrc = node.getAttribute('src') || '';
          const sourceSrc = node.querySelector('source')?.getAttribute('src') || '';
          const src = videoSrc || sourceSrc;
          
          if (src) {
            // Create a proper video element with controls
            const clonedNode = node.cloneNode(true);
            
            // Check if this is a Twitter video that needs proxying
            const isTwitterVideo = src.includes('video.twimg.com') || src.includes('twitter.com');
            
            if (isTwitterVideo) {
              // Proxy Twitter videos to bypass CORS
              const proxiedSrc = `/api/media-proxy?url=${encodeURIComponent(src)}`;
              
              // Update the src attribute
              if (clonedNode.hasAttribute('src')) {
                clonedNode.setAttribute('src', proxiedSrc);
              }
              // Also update source elements if any
              const sourceElements = clonedNode.querySelectorAll('source');
              sourceElements.forEach(source => {
                const sourceSrcAttr = source.getAttribute('src');
                if (sourceSrcAttr && (sourceSrcAttr.includes('video.twimg.com') || sourceSrcAttr.includes('twitter.com'))) {
                  source.setAttribute('src', `/api/media-proxy?url=${encodeURIComponent(sourceSrcAttr)}`);
                }
              });
            }
            
            // Ensure controls are enabled
            clonedNode.setAttribute('controls', 'controls');
            // Remove autoplay to prevent unwanted playback
            clonedNode.removeAttribute('autoplay');
            // Remove loop and muted for better user control
            clonedNode.removeAttribute('loop');
            clonedNode.removeAttribute('muted');
            // Add playsinline for mobile
            clonedNode.setAttribute('playsinline', '');
            // Add preload metadata
            clonedNode.setAttribute('preload', 'metadata');
            // Set reasonable dimensions if not already set
            if (!clonedNode.getAttribute('style')?.includes('max-width')) {
              clonedNode.setAttribute('style', (clonedNode.getAttribute('style') || '') + '; max-width: 100%; height: auto;');
            }
            
            blocks.push({
              type: 'video',
              html: clonedNode.outerHTML,
              text: ''
            });
          }
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


  // Translate current block function
  const translateBlock = useCallback(async (blockIndex) => {
    const block = contentBlocks[blockIndex];
    if (!block || !block.text?.trim()) return;

    // If already translated, toggle visibility (remove translation)
    if (translations[blockIndex] !== undefined) {
      setTranslations(prev => {
        const newTranslations = { ...prev };
        delete newTranslations[blockIndex];
        return newTranslations;
      });
      return;
    }

    // Skip if already translating this block
    if (translatingIndices.has(blockIndex)) return;

    // Skip image blocks
    if (block.type === 'img') return;

    setTranslatingIndices(prev => {
      const next = new Set(prev);
      next.add(blockIndex);
      return next;
    });

    try {
      const prompt = `You are a professional translator. Translate the following text to ${language}. Only output the translated text, without any explanation or additional content.

Text to translate:
${block.text}`;

      const translatedText = await generateText(prompt, { temperature: 0 });

      setTranslations(prev => ({
        ...prev,
        [blockIndex]: translatedText.trim()
      }));
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslatingIndices(prev => {
        const next = new Set(prev);
        next.delete(blockIndex);
        return next;
      });
    }
  }, [contentBlocks, translations, translatingIndices, language, generateText]);

  // Translate full article function
  const translateFullArticle = useCallback(async () => {
    if (isFullTranslationMode) {
      // Toggle OFF: Cache current translations and clear visible logic
      setFullTranslationCache(prev => ({ ...prev, ...translations }));
      setTranslations({});
      setIsFullTranslationMode(false);
      shouldShowTranslationsRef.current = false;
      return;
    }

    // Toggle ON: Restore from cache and translate missing parts
    setIsFullTranslationMode(true);
    shouldShowTranslationsRef.current = true;
    setTranslations(prev => ({ ...prev, ...fullTranslationCache }));

    // Identify blocks that need translation
    const blocksToTranslate = contentBlocks
      .map((block, index) => ({ block, index }))
      .filter(({ block, index }) =>
        block &&
        block.text?.trim() &&
        block.type !== 'img' &&
        translations[index] === undefined &&
        fullTranslationCache[index] === undefined &&
        !translatingIndices.has(index)
      );

    if (blocksToTranslate.length === 0) return;

    // Set all to translating
    setTranslatingIndices(prev => {
      const next = new Set(prev);
      blocksToTranslate.forEach(({ index }) => next.add(index));
      return next;
    });

    // Process all translations
    // We launch all requests in parallel
    const promises = blocksToTranslate.map(async ({ block, index }) => {
      try {
        const prompt = `You are a professional translator. Translate the following text to ${language}. Only output the translated text, without any explanation or additional content.

Text to translate:
${block.text}`;

        const translatedText = await generateText(prompt, { temperature: 0 });

        // Update cache as well
        setFullTranslationCache(prev => ({
          ...prev,
          [index]: translatedText.trim()
        }));

        // Only update visible translations if still in full mode
        if (shouldShowTranslationsRef.current) {
          setTranslations(prev => ({
            ...prev,
            [index]: translatedText.trim()
          }));
        }
      } catch (error) {
        console.error(`Translation error for block ${index}:`, error);
      } finally {
        setTranslatingIndices(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    });

    await Promise.all(promises);
  }, [contentBlocks, translations, fullTranslationCache, translatingIndices, isFullTranslationMode, language, generateText]);

  // Handle Edit Annotation
  const handleEditAnnotation = useCallback((annotationId, e) => {
    const annotation = annotations.find(ann => ann.id === annotationId);
    if (!annotation) return;

    let cursorOffset = -1;
    if (e) {
      // Calculate cursor position from click
      try {
        // Use caretRangeFromPoint standard or caretPositionFromPoint (Firefox)
        // We assume standard caretRangeFromPoint or compatible polyfill behavior for this environment
        let range;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (document.caretPositionFromPoint) {
          // Firefox fallback if needed, but usually caretRangeFromPoint is available in modern chrome/edge
          const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.setEnd(pos.offsetNode, pos.offset);
          }
        }

        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          cursorOffset = range.startOffset;
        }
      } catch (err) {
        console.warn('Could not calculate caret position', err);
      }
    }

    // Open popover with existing annotation text
    setPopoverState({
      isOpen: true,
      position: { top: annotation.top, left: '100%' },
      blockIndex: annotation.blockIndex,
      type: annotation.type,
      editingAnnotationId: annotationId,
      initialText: annotation.text,
      cursorOffset: cursorOffset
    });
  }, [annotations]);

  // Handle click on highlighted text to select it for unhighlighting
  useEffect(() => {
    const handleClick = (e) => {
      const articleEl = contentRef.current;
      if (!articleEl) return;

      // Check if clicked on a highlight mark
      const clickedMark = e.target.closest('mark.zeader-highlight');

      if (clickedMark && articleEl.contains(clickedMark)) {
        // Check if this mark has an annotation
        const annotationId = clickedMark.dataset.annotationId;

        if (annotationId) {
          // If already selected, open edit popover
          if (selectedHighlightMark === clickedMark) {
            e.preventDefault();
            e.stopPropagation();
            handleEditAnnotation(parseInt(annotationId));
            return;
          }
          // Otherwise fall through to selection logic below
        }

        // No annotation - regular selection logic
        e.preventDefault();
        e.stopPropagation();

        // Remove selected class from previously selected mark
        if (selectedHighlightMark && selectedHighlightMark !== clickedMark) {
          selectedHighlightMark.classList.remove('zeader-highlight-selected');
        }

        // Toggle selection on clicked mark
        if (selectedHighlightMark === clickedMark) {
          clickedMark.classList.remove('zeader-highlight-selected');
          setSelectedHighlightMark(null);
        } else {
          clickedMark.classList.add('zeader-highlight-selected');
          setSelectedHighlightMark(clickedMark);
        }
      } else if (articleEl.contains(e.target)) {
        // Clicked inside article but not on a highlight mark - deselect
        if (selectedHighlightMark) {
          selectedHighlightMark.classList.remove('zeader-highlight-selected');
          setSelectedHighlightMark(null);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [selectedHighlightMark, handleEditAnnotation]);

  // Auto-select newly created annotation
  useEffect(() => {
    if (pendingSelectionAnnotationId !== null) {
      // Find the mark for this annotation
      const mark = document.querySelector(`mark[data-annotation-id="${pendingSelectionAnnotationId}"]`);
      if (mark) {
        // Apply visual selection
        mark.classList.add('zeader-highlight-selected');
        // Update state
        setSelectedHighlightMark(mark);
        // Clear pending
        setPendingSelectionAnnotationId(null);
      }
    }
  }); // Run on every render to catch when the new mark appears in the DOM

  // Handle Save Annotation
  const handleSaveAnnotation = (text, overrides = null) => {
    // defaults from popoverState, but allow overrides for async AI calls
    const blockIndex = overrides ? overrides.blockIndex : popoverState.blockIndex;
    const type = overrides ? overrides.type : popoverState.type;
    const editingAnnotationId = overrides ? overrides.editingAnnotationId : popoverState.editingAnnotationId;
    const top = overrides ? overrides.top : popoverState.position.top;

    if (blockIndex === -1) return;

    // Check if text is empty - if so, delete the annotation (or don't create it)
    if (!text || !text.trim()) {
      if (editingAnnotationId) {
        // Editing existing annotation -> Delete it
        handleDeleteAnnotation(editingAnnotationId);
      } else {
        // Creating new annotation -> Cancel creation (remove highlight)
        if (type === 'selection' && pendingMarkRef.current) {
          // Unwrap the mark (preserve nested HTML)
          const mark = pendingMarkRef.current;
          const parent = mark.parentNode;
          if (parent) {
            while (mark.firstChild) {
              parent.insertBefore(mark.firstChild, mark);
            }
            parent.removeChild(mark);
          }
        } else if (type === 'block') {
          // If we were creating a block annotation but saved empty, ensure we don't leave highlight
          // (Logic for block highlight toggle handles this usually, but "Save" implies we're done)
          // If we want to undo the highlight we just added:
          setHighlightedBlocks(prev => {
            const next = new Set(prev);
            next.delete(blockIndex);
            return next;
          });
        }
      }

      // Close popover and cleanup
      setPopoverState(prev => ({ ...prev, isOpen: false, editingAnnotationId: null, initialText: '' }));
      pendingMarkRef.current = null;
      return;
    }

    // Check if we're editing an existing annotation
    if (editingAnnotationId) {
      // Update existing annotation
      setAnnotations(prev => prev.map(ann =>
        ann.id === editingAnnotationId
          ? { ...ann, text }
          : ann
      ));

      // Update the data-annotation attribute on the mark element
      if (type === 'selection' && blockRefs.current[blockIndex]) {
        const blockEl = blockRefs.current[blockIndex];
        const mark = blockEl.querySelector(`mark[data-annotation-id="${editingAnnotationId}"]`);
        if (mark) {
          mark.dataset.annotation = text;
        }

        // Update contentBlocks state
        // Find content container to avoid capturing wrapper divs
        const contentContainer = blockEl.querySelector('[data-content-container="true"]');
        if (contentContainer) {
          const newHtml = contentContainer.innerHTML;
          setContentBlocks(prev => {
            const newBlocks = [...prev];
            newBlocks[blockIndex] = {
              ...newBlocks[blockIndex],
              html: newHtml
            };
            return newBlocks;
          });
        }
      }

      setPopoverState(prev => ({ ...prev, isOpen: false, editingAnnotationId: null, initialText: '' }));
      return;
    }

    // Creating new annotation
    const annotationId = annotations.length + 1;
    const annotation = {
      id: annotationId,
      text,
      blockIndex,
      top: top,  // Use the resolved top position
      type  // Store type for deletion handling
    };

    // 1. Inject Footnote Marker into DOM
    if (type === 'selection' && pendingMarkRef.current) {
      // Add data-annotation attribute for persistence
      pendingMarkRef.current.dataset.annotation = text;
      // Add annotation ID for deletion tracking
      pendingMarkRef.current.dataset.annotationId = annotationId;

      // Create and insert footnote marker
      const sup = document.createElement('span');
      // Make marker completely invisible and take up no space
      sup.style.position = 'absolute';
      sup.style.width = '0';
      sup.style.height = '0';
      sup.style.fontSize = '0';
      sup.style.lineHeight = '0';
      sup.style.color = 'transparent';
      sup.style.userSelect = 'none';
      sup.style.overflow = 'hidden';
      sup.className = 'zeader-annotation-marker';
      sup.dataset.annotationId = annotationId;
      sup.textContent = `[^${annotationId}]`;
      pendingMarkRef.current.insertAdjacentElement('afterend', sup);
    } else if (type === 'block') {
      // For block annotations, we append a hidden footnote marker at the END of the block content.
      // We modify the state directly to ensure we don't capture temporary DOM elements (like highlights).

      const markerHtml = `<span class="zeader-annotation-marker" style="position: absolute; width: 0px; height: 0px; font-size: 0px; line-height: 0; color: transparent; user-select: none; overflow: hidden;" data-annotation-id="${annotationId}">[^${annotationId}]</span>`;

      setContentBlocks(prev => {
        const newBlocks = [...prev];
        const currentBlock = newBlocks[blockIndex];

        if (currentBlock && !currentBlock.html.includes(`data-annotation-id="${annotationId}"`)) {
          newBlocks[blockIndex] = {
            ...currentBlock,
            html: currentBlock.html + markerHtml
          };
        }
        return newBlocks;
      });
    }

    // 2. Persist changes to contentBlocks state (Update HTML)
    // ONLY for selection type where we inserted DOM elements/logic is complex.
    // For block type, we handled it above.
    if (type === 'selection' && blockRefs.current[blockIndex]) {
      const blockEl = blockRefs.current[blockIndex];
      // Find content container to avoid capturing wrapper divs
      const contentContainer = blockEl.querySelector('[data-content-container="true"]');

      if (contentContainer) {
        const newHtml = contentContainer.innerHTML;

        setContentBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks[blockIndex] = {
            ...newBlocks[blockIndex],
            html: newHtml
          };
          return newBlocks;
        });
      }
    }

    // 4. Update Pending Selection (to auto-select after render)
    if (type === 'selection') {
      setPendingSelectionAnnotationId(annotationId);
    }

    // 5. Update Annotations State
    setAnnotations(prev => [...prev, annotation]);
    setPopoverState(prev => ({ ...prev, isOpen: false }));
    pendingMarkRef.current = null;
  };

  const handleCancelAnnotation = () => {
    setPopoverState(prev => ({ ...prev, isOpen: false }));
    // If we created a mark but cancelled, should we remove it? 
    // User requested "highlight... then pop up". 
    // Usually if I cancel note, I might want to keep highlight.
    // Let's keep the highlight.
    pendingMarkRef.current = null;
  };


  // Handle Delete Annotation
  const handleDeleteAnnotation = useCallback((annotationId) => {
    // Find the annotation
    const annotation = annotations.find(ann => ann.id === annotationId);
    if (!annotation) return;

    const { blockIndex, type } = annotation;

    // Remove from annotations state
    setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));

    // For selection annotations, remove mark and footnote marker from DOM
    if (type === 'selection' && blockRefs.current[blockIndex]) {
      const blockEl = blockRefs.current[blockIndex];

      // Find and remove the mark element
      const mark = blockEl.querySelector(`mark[data-annotation-id="${annotationId}"]`);
      if (mark) {
        // Unwrap the mark: move all its children to its parent, then remove the mark
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }

      // Find and remove the footnote marker
      const marker = blockEl.querySelector(`.zeader-annotation-marker[data-annotation-id="${annotationId}"]`);
      if (marker) {
        marker.remove();
      }

      // Update contentBlocks state with new HTML
      // Find content container to avoid capturing wrapper divs
      const contentContainer = blockEl.querySelector('[data-content-container="true"]');
      if (contentContainer) {
        const newHtml = contentContainer.innerHTML;
        setContentBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks[blockIndex] = {
            ...newBlocks[blockIndex],
            html: newHtml
          };
          return newBlocks;
        });
      }
    }

    // For block annotations, remove from highlighted blocks
    // For block annotations, remove from highlighted blocks
    if (type === 'block') {
      setHighlightedBlocks(prev => {
        const next = new Set(prev);
        next.delete(blockIndex);
        return next;
      });

      // Remove the footnote marker from the HTML state directly
      setContentBlocks(prev => {
        const newBlocks = [...prev];
        const currentBlock = newBlocks[blockIndex];

        if (currentBlock) {
          // Create a regex to remove the specific marker span
          // We need to escape the special characters in the ID if necessary, but integers are safe.
          // The marker HTML format matches what we added in handleSaveAnnotation
          const regex = new RegExp(`<span[^>]*data-annotation-id="${annotationId}"[^>]*>.*?<\\/span>`, 'g');

          newBlocks[blockIndex] = {
            ...currentBlock,
            html: currentBlock.html.replace(regex, '')
          };
        }
        return newBlocks;
      });
    }
  }, [annotations]);

  // Handle AI Annotation
  const handleAIAnnotation = useCallback(async () => {
    if (isGeneratingAnnotation) return;

    let targetText = '';
    let contextText = '';
    let targetType = 'block';
    let targetBlockIndex = -1;

    // 1. Check for Selection
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      targetText = selection.toString().trim();
      targetType = 'selection';

      // Verify we are in the article content
      const range = selection.getRangeAt(0);
      const articleEl = contentRef.current;
      if (!articleEl || !articleEl.contains(range.commonAncestorContainer)) return;

      // Create Highlight (Visually Select)
      try {
        const mark = document.createElement('mark');
        mark.className = 'zeader-highlight'; // Note: NO 'zeader-highlight-selected' here! We rely on auto-selection state.
        range.surroundContents(mark);
        selection.removeAllRanges();

        pendingMarkRef.current = mark;

        // Find block index for insertion tracking
        blockRefs.current.forEach((el, idx) => {
          if (el && el.contains(mark)) targetBlockIndex = idx;
        });

        if (targetBlockIndex !== -1 && contentBlocks[targetBlockIndex]) {
          const fullBlockText = contentBlocks[targetBlockIndex].text;
          if (fullBlockText && fullBlockText.trim() !== targetText) {
            contextText = fullBlockText.trim();
          }
        }

      } catch (e) {
        console.warn('Could not highlight for AI annotation', e);
        return;
      }
    } else {
      // 2. Fallback to Current Block
      if (selectedBlockIndex >= 0 && contentBlocks[selectedBlockIndex]) {
        targetText = contentBlocks[selectedBlockIndex].text;
        targetBlockIndex = selectedBlockIndex;
        targetType = 'block';

        // Highlight block
        setHighlightedBlocks(prev => {
          const next = new Set(prev);
          next.add(targetBlockIndex);
          return next;
        });
      }
    }

    if (!targetText || targetBlockIndex === -1) return;

    // 3. Prepare State for Saving
    // We set popoverState with Open=false so handleSaveAnnotation knows where to save
    // but the popover doesn't show up to interrupt the "Generation" UI.
    const articleEl = contentRef.current;
    let top = 0;
    if (targetType === 'selection' && pendingMarkRef.current) {
      const markRect = pendingMarkRef.current.getBoundingClientRect();
      const articleRect = articleEl.getBoundingClientRect();
      top = markRect.top - articleRect.top;
    } else if (targetType === 'block' && blockRefs.current[targetBlockIndex]) {
      const blockRect = blockRefs.current[targetBlockIndex].getBoundingClientRect();
      const articleRect = articleEl.getBoundingClientRect();
      top = blockRect.top - articleRect.top;
    }

    setPopoverState({
      isOpen: false,
      position: { top, left: '100%' },
      blockIndex: targetBlockIndex,
      type: targetType,
      initialText: ''
    });

    // 4. Generate Annotation
    setIsGeneratingAnnotation(true);

    try {
      const prompt = `Role: Advanced Language Assistant
Input: ${targetText}
${contextText ? `Context: ${contextText}\n` : ''}
Instruction: Analyze the input${contextText ? ' (using the provided Context for background information)' : ''} and strictly follow the rules below based on the input type:

Case 1: [Single English Word]
Output Format:
**Word**: [Word] [IPA Pronunciation]
**Definition**: [Definition in ${language}]

Case 2: [English Sentence/Paragraph]
Action: Translate into fluent, elegant ${language}.

Case 3: [${language} Text]
Action: Translate into authentic, high-quality English.
`;

      const result = await generateText(prompt);

      // Pass the calculated metadata directly to save function
      const metaOverrides = {
        blockIndex: targetBlockIndex,
        type: targetType,
        top: top,
        editingAnnotationId: null // always new for AI
      };

      if (result) {
        handleSaveAnnotation(result.trim(), metaOverrides);
      } else {
        // If no result, cancel the operation
        handleSaveAnnotation('', metaOverrides); // Sending empty text cancels/deletes
      }
    } catch (error) {
      console.error('AI Annotation Error:', error);

      const metaOverrides = {
        blockIndex: targetBlockIndex,
        type: targetType,
        top: top,
        editingAnnotationId: null
      };

      // Clean up on error
      handleSaveAnnotation('', metaOverrides);
    } finally {
      setIsGeneratingAnnotation(false);
    }

  }, [isGeneratingAnnotation, contentBlocks, selectedBlockIndex, language, generateText, handleSaveAnnotation, highlightedBlocks]);

  // Highlight selected text or current block
  const highlightContent = useCallback((targetBlockIndex = -1, openPopover = false) => {
    // Determine context from args or selection
    let isExplicitBlock = targetBlockIndex >= 0;

    // First, check if there's a selected highlight mark to unhighlight (existing logic)
    if (selectedHighlightMark) {
      // Check if this mark has an annotation
      const annotationId = selectedHighlightMark.dataset.annotationId;
      if (annotationId) {
        // This mark has an annotation - delete both annotation and highlight
        handleDeleteAnnotation(parseInt(annotationId));
      } else {
        // No annotation - just unhighlight the mark (preserve nested HTML)
        const parent = selectedHighlightMark.parentNode;
        while (selectedHighlightMark.firstChild) {
          parent.insertBefore(selectedHighlightMark.firstChild, selectedHighlightMark);
        }
        parent.removeChild(selectedHighlightMark);
      }
      setSelectedHighlightMark(null);
      return;
    }

    const selection = window.getSelection();

    if (selection && selection.toString().trim()) {
      // ... existing selection highlight logic ...
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();

      const articleEl = contentRef.current;
      if (articleEl && articleEl.contains(range.commonAncestorContainer)) {
        // Existing check for nested marks...
        const commonAncestor = range.commonAncestorContainer;
        const parentMark = commonAncestor.nodeType === Node.TEXT_NODE
          ? commonAncestor.parentElement?.closest('mark.zeader-highlight')
          : commonAncestor.closest?.('mark.zeader-highlight');

        if (parentMark && articleEl.contains(parentMark)) {
          // ... existing unhighlight logic match ...
          const markText = parentMark.textContent.trim();
          if (selectedText === markText) {
            // Unwrap the mark (preserve nested HTML)
            const parent = parentMark.parentNode;
            while (parentMark.firstChild) {
              parent.insertBefore(parentMark.firstChild, parentMark);
            }
            parent.removeChild(parentMark);
            selection.removeAllRanges();
            return;
          }
        }

        try {
          const mark = document.createElement('mark');
          mark.className = 'zeader-highlight';
          range.surroundContents(mark);
          selection.removeAllRanges();

          // Capture for annotation
          pendingMarkRef.current = mark;

          // Find block index
          let currentBlockEl = mark.closest('[data-block-index]'); // Note: We need to ensure blocks have this attr or find index another way.
          // Alternatively, find index by comparing containment in blockRefs
          let foundIndex = -1;
          blockRefs.current.forEach((el, idx) => {
            if (el && el.contains(mark)) foundIndex = idx;
          });

          if (foundIndex !== -1) {
            // Only open popover if requested (for 'n' key, not for 'h' key)
            if (openPopover) {
              // Calculate position relative to the article container
              const markRect = mark.getBoundingClientRect();
              const articleRect = articleEl.getBoundingClientRect();
              const topRelativeToArticle = markRect.top - articleRect.top;

              setPopoverState({
                isOpen: true,
                position: { top: topRelativeToArticle, left: '100%' },
                blockIndex: foundIndex,
                type: 'selection'
              });
            } else {
              // For 'h' key, clear pendingMarkRef since we're not creating an annotation
              pendingMarkRef.current = null;
            }
          }

        } catch (e) {
          console.warn('Could not highlight selection', e);
          // Fallback
        }
      }
    } else {
      // No selection
      // Identify block: either passed explicitly (from keydown) or current selectedBlockIndex
      const idx = isExplicitBlock ? targetBlockIndex : selectedBlockIndex;

      if (idx >= 0) {
        // Toggle highlight block
        setHighlightedBlocks(prev => {
          const next = new Set(prev);
          // Logic: If 'n' key pressed (isExplicitBlock), we want to ADD annotation, not just toggle.
          // If called via 'h' (implicit), we toggle.

          if (!isExplicitBlock) {
            // Classic toggle behavior for 'h' (no popover)
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
          } else {
            // 'n' behavior: Ensure highlighted and open popover
            next.add(idx);
          }
          return next;
        });

        if (isExplicitBlock) {
          // Open popover for this block only if requested
          if (openPopover) {
            const blockEl = blockRefs.current[idx];
            const articleEl = contentRef.current;
            if (blockEl && articleEl) {
              // Calculate position relative to the article container
              const blockRect = blockEl.getBoundingClientRect();
              const articleRect = articleEl.getBoundingClientRect();
              const topRelativeToArticle = blockRect.top - articleRect.top;

              setPopoverState({
                isOpen: true,
                position: { top: topRelativeToArticle, left: '100%' },
                blockIndex: idx,
                type: 'block'
              });
            }
          }
        }
      }
    }
  }, [selectedBlockIndex, selectedHighlightMark, highlightedBlocks, handleDeleteAnnotation]);

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

      // Highlight on 'h' or 'H' key press
      if (e.key === 'h' || e.key === 'H') {
        highlightContent(-1, false); // Don't open popover for 'h' key
        return;
      }

      // Annotation on 'n' or 'N' key press
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();

        // If a highlight is selected (via click), handle it (delete or add annotation)
        if (selectedHighlightMark) {
          highlightContent(-1, true);
          return;
        }

        // Check if there is selection
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          // Check if selecting an annotated mark
          const range = selection.getRangeAt(0);
          const commonAncestor = range.commonAncestorContainer;
          const parentMark = commonAncestor.nodeType === Node.TEXT_NODE
            ? commonAncestor.parentElement?.closest('mark.zeader-highlight[data-annotation-id]')
            : commonAncestor.closest?.('mark.zeader-highlight[data-annotation-id]');

          if (parentMark && contentRef.current?.contains(parentMark)) {
            // This is an annotated mark - delete the annotation
            const annotationId = parseInt(parentMark.dataset.annotationId);
            if (!isNaN(annotationId)) {
              handleDeleteAnnotation(annotationId);
              selection.removeAllRanges();
              return;
            }
          }


          // Not an annotated mark - create new annotation
          highlightContent(-1, true); // Open popover for annotation
        } else {
          // No selection - check if current block has annotation or highlight
          if (selectedBlockIndex >= 0) {
            const existingAnnotation = annotations.find(ann => ann.blockIndex === selectedBlockIndex);
            const isBlockHighlighted = highlightedBlocks.has(selectedBlockIndex);

            if (existingAnnotation) {
              // Block has annotation - delete it (this will also remove highlight)
              handleDeleteAnnotation(existingAnnotation.id);
            } else if (isBlockHighlighted) {
              // Block is highlighted but has no annotation - remove highlight
              setHighlightedBlocks(prev => {
                const next = new Set(prev);
                next.delete(selectedBlockIndex);
                return next;
              });
            } else {
              // No annotation and not highlighted - create new annotation
              highlightContent(selectedBlockIndex, true); // Open popover for annotation
            }
          }
        }
        return;
      }

      // Translate current block on 't' or 'T' key press
      if (e.key === 't' || e.key === 'T') {
        if (e.shiftKey) {
          // Shift+T: Translate full article
          if (isAIEnabled) {
            translateFullArticle();
          }
        } else {
          // T: Translate current block
          if (isAIEnabled && selectedBlockIndex >= 0 && contentBlocks[selectedBlockIndex]) {
            translateBlock(selectedBlockIndex);
          }
        }
        return;
      }

      // Open original article on 'o' key press
      if (e.key === 'o' || e.key === 'O') {
        if (article.link) {
          window.open(article.link, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      // AI Annotation on 'z' key press
      if (e.key === 'z' || e.key === 'Z') {
        if (isAIEnabled) {
          handleAIAnnotation();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        shouldAutoScroll.current = true;
        isKeyboardNavigating.current = true;
        setSelectedBlockIndex(prev => {
          const next = Math.min(prev + 1, contentBlocks.length - 1);
          return next;
        });
        isUserScrolling.current = false;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        shouldAutoScroll.current = true;
        isKeyboardNavigating.current = true;
        setSelectedBlockIndex(prev => {
          const next = Math.max(prev - 1, 0);
          return next;
        });
        isUserScrolling.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, contentBlocks.length, article.link, translateBlock, translateFullArticle, highlightContent, isAIEnabled, selectedBlockIndex, contentBlocks, handleDeleteAnnotation, annotations, selectedHighlightMark, isGeneratingAnnotation]); // Added translateFullArticle

  // Auto-scroll selected block to center
  useEffect(() => {
    if (!isUserScrolling.current && shouldAutoScroll.current && selectedBlockIndex >= 0 && blockRefs.current[selectedBlockIndex]) {
      blockRefs.current[selectedBlockIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      shouldAutoScroll.current = false;
      
      // Reset keyboard navigating flag after scroll animation completes
      setTimeout(() => {
        isKeyboardNavigating.current = false;
      }, 300);
    }
  }, [selectedBlockIndex]);

  // Track user scrolling and update selection on stop
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Don't interfere with keyboard navigation
      if (isKeyboardNavigating.current) {
        return;
      }
      
      isUserScrolling.current = true;
      shouldAutoScroll.current = false;

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        // Double-check keyboard navigation hasn't started
        if (isKeyboardNavigating.current) {
          return;
        }
        
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                {article.feedTitle ? article.feedTitle[0].toUpperCase() : 'R'}
              </div>
              <span>{article.feedTitle}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const image = extractImage(article.content) || extractImage(article.contentSnippet);
                  playArticle(contentBlocks, 0, {
                    title: article.title,
                    author: article.author || article.feedTitle,
                    image: image
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-full text-xs font-medium transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Listen</span>
              </button>
            </div>
          </div>

          <h1 className="article-title text-3xl md:text-4xl font-medium text-gray-900 mb-6 leading-tight">
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
        <article ref={contentRef} className="article-detail-content prose prose-lg prose-slate max-w-none font-serif prose-headings:font-serif prose-a:text-primary-600 prose-img:rounded-xl [&_iframe]:w-full [&_iframe]:!h-auto [&_iframe]:!aspect-[3/2] [&_video]:w-full [&_video]:rounded-xl [&_video]:my-4 relative">
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
                <MemoizedContentBlock
                  html={block.html}
                  translation={translations[index]}
                  isTranslating={translatingIndices.has(index)}
                  isHighlighted={highlightedBlocks.has(index)}
                  isReading={isTTSPlaying && ttsBlockIndex === index}
                />
              </div>
            ))
          ) : (
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          )}

          <AudioPlayer />

          {/* Annotation Popover */}
          {popoverState.isOpen && (
            <AnnotationPopover
              position={{ top: popoverState.position.top, left: '100%' }} // Force left 100%
              onSave={handleSaveAnnotation}
              onCancel={handleCancelAnnotation}
              initialText={popoverState.initialText}
              initialCursorOffset={popoverState.cursorOffset}
            />
          )}

          {/* Render Side Notes */}
          {annotations.map(ann => (
            <AnnotationSideNote
              key={ann.id}
              text={ann.text}
              top={ann.top}
              onClick={(e) => handleEditAnnotation(ann.id, e)}
            />
          ))}

          {/* Hidden Footnotes Section for Clipper */}
          <div dangerouslySetInnerHTML={{ __html: generateFootnotesSection(annotations) }} />
        </article>

        {/* AI Annotation Generatng Notification */}
        <AnimatePresence>
          {isGeneratingAnnotation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl shadow-xl shadow-primary-500/10"
            >
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-ping absolute inset-0 opacity-75"></div>
                <div className="w-2.5 h-2.5 bg-primary-500 rounded-full relative"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">AI Annotation</span>
                <span className="text-xs text-gray-500">Generating...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

  // Handle 'z' or ']' key for AI Summary Panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Toggle AI Summary Panel on 'z' or ']' key press
      // Only allow in list view (when no article is selected)
      if ((e.key === 'z' || e.key === 'Z') && !selectedArticle) {
        setIsAISummaryOpen(prev => !prev);
      }
      // Keep ']' as a global toggle if desired, or restrict it too. 
      // Assuming ']' should also be restricted to avoid conflicts or confusion, 
      // but user only mentioned 'z'. Let's restrict 'z' specifically for the new feature in Detail view.
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAISummaryOpen, selectedArticle]);

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
