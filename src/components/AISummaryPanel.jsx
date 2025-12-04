import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, ExternalLink, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../store/useAIStore';
import { useFeedStore } from '../store/useFeedStore';
import { useAuthStore } from '../store/useAuthStore';
import OpenAI from 'openai';

// Add custom scrollbar hiding styles
const scrollbarHideStyles = `
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;

// Helper to strip HTML tags
const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
};

// Format date for display
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
};

export function AISummaryPanel({ isOpen, onClose, onSelectArticle }) {
    const { apiBase, apiKey, modelName, language, isAIEnabled } = useAIStore();
    const { feeds, showUnreadOnly } = useFeedStore();
    const { token } = useAuthStore();

    const [streamingContent, setStreamingContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [referencedArticles, setReferencedArticles] = useState([]);
    const [scrollProgress, setScrollProgress] = useState(0);
    const contentRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Track scroll progress
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const maxScroll = scrollHeight - clientHeight;
            if (maxScroll > 0) {
                const progress = (scrollTop / maxScroll) * 100;
                setScrollProgress(Math.min(100, Math.max(0, progress)));
            } else {
                setScrollProgress(100);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial calculation

        return () => container.removeEventListener('scroll', handleScroll);
    }, [streamingContent]);

    // Get all unread articles
    const getUnreadArticles = useCallback(() => {
        const allUnreadItems = [];

        feeds.forEach(feed => {
            if (feed.viewType !== 'article') return;

            feed.items?.forEach(item => {
                if (!item.read) {
                    allUnreadItems.push({
                        id: item.id,
                        feedId: feed.id,
                        feedTitle: feed.title,
                        title: item.title,
                        link: item.link,
                        author: item.author || item.creator,
                        pubDate: item.isoDate || item.pubDate,
                        contentSnippet: stripHtml(item.contentSnippet || item.content || '').slice(0, 500),
                        categories: item.categories || []
                    });
                }
            });
        });

        // Sort by date, newest first
        allUnreadItems.sort((a, b) => {
            const dateA = new Date(a.pubDate);
            const dateB = new Date(b.pubDate);
            return dateB - dateA;
        });

        return allUnreadItems;
    }, [feeds]);

    // Generate summary with streaming
    const generateSummary = useCallback(async () => {
        if (!isAIEnabled || !apiKey) {
            setError('Please configure your API Key in Settings -> Z\'s soul.');
            return;
        }

        const unreadArticles = getUnreadArticles();

        if (unreadArticles.length === 0) {
            setError('No unread articles to summarize.');
            return;
        }

        // Store referenced articles for linking
        setReferencedArticles(unreadArticles);

        setIsGenerating(true);
        setStreamingContent('');
        setError(null);

        // Prepare API base URL with proxy
        let finalApiBase = apiBase;
        if (apiBase.includes('api.moonshot.cn')) {
            finalApiBase = `${window.location.origin}/api/moonshot/v1`;
        } else if (apiBase.includes('generativelanguage.googleapis.com')) {
            finalApiBase = `${window.location.origin}/api/gemini/v1beta/openai/`;
        } else if (apiBase.includes('api.siliconflow.cn')) {
            finalApiBase = `${window.location.origin}/api/siliconflow/v1`;
        }

        // Prepare article data for the prompt
        const articlesData = unreadArticles.slice(0, 50).map((article, index) => ({
            refIndex: index + 1,
            title: article.title,
            source: article.feedTitle,
            author: article.author,
            date: formatDate(article.pubDate),
            snippet: article.contentSnippet,
            categories: article.categories?.slice(0, 5).join(', ')
        }));

        const prompt = `# Role
You are an intelligent news digest assistant. Your task is to analyze and synthesize multiple unread RSS feed articles into a cohesive, insightful summary.

# Input Data
Below are ${articlesData.length} unread articles from various RSS feeds:

${articlesData.map(a => `[REF:${a.refIndex}] ${a.title}
- Source: ${a.source}${a.author ? ` | Author: ${a.author}` : ''}
- Date: ${a.date}
- Categories: ${a.categories || 'N/A'}
- Content Preview: ${a.snippet}
`).join('\n')}

# Instructions
1. **Analyze & Synthesize**: Don't just list articles one by one. Instead, identify common themes, trends, and connections across articles.

2. **Structure Your Response** using these sections:
   - **📊 Today's Highlights** (2-3 sentences overview)
   - **🔥 Key Topics** (group related articles by theme, explain the trend)
   - **💡 Notable Insights** (interesting findings or unique perspectives)
   - **📌 Quick Reads** (brief mentions of other noteworthy items)

3. **Reference Articles**: When mentioning an article, ALWAYS place the reference at the END of the sentence, AFTER the period. Format: "这是一段描述。[REF:1]" NOT "这是一段描述[REF:1]。" The reference should come after punctuation.

4. **Language**: Write your entire response in **${language}**.

5. **Tone**: Be concise, informative, and engaging. Focus on value and insights, not just summaries.

# Output Format
Use Markdown formatting. Keep the response well-organized and scannable.`;

        try {
            abortControllerRef.current = new AbortController();

            const openai = new OpenAI({
                baseURL: finalApiBase,
                apiKey: apiKey,
                dangerouslyAllowBrowser: true,
                defaultHeaders: {
                    'X-App-Token': token
                }
            });

            const stream = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: `You are a helpful AI news digest assistant. Always respond in ${language}.` },
                    { role: "user", content: prompt }
                ],
                model: modelName,
                stream: true,
            }, {
                signal: abortControllerRef.current.signal
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                setStreamingContent(prev => prev + content);
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                // User cancelled, don't show error
                return;
            }
            console.error('AI Summary Error:', err);
            let errorMessage = err.message;
            if (errorMessage.includes('404')) {
                errorMessage = '404 Not Found. Please check your API Base URL and Model Name.';
            } else if (errorMessage.includes('401')) {
                errorMessage = '401 Unauthorized. Please check your API Key.';
            }
            setError(`Error: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [apiBase, apiKey, modelName, language, isAIEnabled, token, getUnreadArticles]);

    // Start generation when panel opens
    useEffect(() => {
        if (isOpen && !streamingContent && !isGenerating && !error) {
            generateSummary();
        }
    }, [isOpen]);

    // Cleanup on unmount or close
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Reset state when closing
    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setStreamingContent('');
        setError(null);
        setIsGenerating(false);
        onClose();
    };

    // Handle clicking on article reference
    const handleRefClick = (refIndex) => {
        const article = referencedArticles[refIndex - 1];
        if (article && onSelectArticle) {
            onSelectArticle(article);
        }
    };

    // Parse content and make refs clickable
    const renderContent = (content) => {
        if (!content) return null;

        // Split by [REF:X] pattern and create clickable links
        const parts = content.split(/(\[REF:\d+\])/g);

        return parts.map((part, index) => {
            const refMatch = part.match(/\[REF:(\d+)\]/);
            if (refMatch) {
                const refIndex = parseInt(refMatch[1], 10);
                const article = referencedArticles[refIndex - 1];

                if (article) {
                    return (
                        <button
                            key={index}
                            onClick={() => handleRefClick(refIndex)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors cursor-pointer"
                            title={article.title}
                        >
                            <ExternalLink className="w-3 h-3" />
                            <span>{refIndex}</span>
                        </button>
                    );
                }
            }

            // Render markdown-like formatting
            return <span key={index} dangerouslySetInnerHTML={{ __html: formatMarkdown(part) }} />;
        });
    };

    // Simple markdown formatter
    const formatMarkdown = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="h-full bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0"
                >
                    {/* Inject scrollbar hiding styles */}
                    <style>{scrollbarHideStyles}</style>

                    {/* Header */}
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">AI Unread Summary</h2>
                                    <p className="text-xs text-gray-500">
                                        {referencedArticles.length} unread articles
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={generateSummary}
                                    disabled={isGenerating}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Regenerate"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar - Jelly style */}
                        <div className="h-1 bg-gray-50 relative overflow-hidden">
                            <motion.div
                                className="absolute top-0 left-0 h-full rounded-r-full"
                                style={{
                                    width: `${scrollProgress}%`,
                                    background: 'linear-gradient(90deg, var(--color-primary-400), var(--color-primary-500), var(--color-primary-400))',
                                    boxShadow: '0 0 8px var(--color-primary-400), 0 0 4px var(--color-primary-300)',
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${scrollProgress}%` }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                            />
                            {/* Jelly shine effect */}
                            <motion.div
                                className="absolute top-0 left-0 h-full rounded-r-full opacity-60"
                                style={{
                                    width: `${scrollProgress}%`,
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                                }}
                                animate={{ width: `${scrollProgress}%` }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        ref={contentRef}
                        className="flex-1 overflow-y-auto px-5 py-4 min-h-0 hide-scrollbar"
                    >
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-4">
                                    <p className="text-sm">{error}</p>
                                </div>
                                <button
                                    onClick={generateSummary}
                                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : isGenerating && !streamingContent ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                                <p className="text-gray-500 text-sm">Analyzing unread articles...</p>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                                {renderContent(streamingContent)}
                                {isGenerating && (
                                    <span className="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-1" />
                                )}
                            </div>
                        )}
                    </div>


                </motion.div>
            )}
        </AnimatePresence>
    );
}
