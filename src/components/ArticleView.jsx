import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, Play, Share2, Globe } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

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

function ArticleList({ articles, onSelectArticle }) {
  return (
    <div className="max-w-5xl mx-auto">
      {articles.map((article) => {
        const image = extractImage(article.content) || extractImage(article.contentSnippet);
        const snippet = stripHtml(article.contentSnippet || article.content).slice(0, 150) + '...';
        const date = article.isoDate || article.pubDate ? new Date(article.isoDate || article.pubDate) : new Date();

        return (
          <div 
            key={article.id} 
            onClick={() => onSelectArticle(article)}
            className="group flex gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
              {image ? (
                <img src={image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Globe className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 truncate pr-4">
                  {article.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                  {snippet}
                </p>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
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

function ArticleDetail({ article, onBack }) {
  const [fullContent, setFullContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFullContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:3001/api/article?url=${encodeURIComponent(article.link)}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.content) {
            setFullContent(data.content);
          }
        }
      } catch (error) {
        console.error('Failed to fetch full content:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFullContent();
    return () => { isMounted = false; };
  }, [article.link]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const date = article.isoDate || article.pubDate ? new Date(article.isoDate || article.pubDate) : new Date();
  const contentToDisplay = fullContent || article.content || article.contentSnippet || '';
  const readTime = estimateReadTime(stripHtml(contentToDisplay));
  
  // Remove the first image from content if it's the same as the featured image to avoid duplication
  // This is a simple heuristic; might need refinement
  let contentHtml = contentToDisplay;
  
  return (
    <div className="relative min-h-full">
      {/* Back Button - Sticky positioned */}
      <div className="sticky top-4 z-10 h-0 overflow-visible">
        <button 
          onClick={onBack}
          className="ml-16 p-2 text-gray-500 hover:bg-gray-100 bg-white/80 backdrop-blur-sm rounded-lg transition-all duration-300 border border-gray-200 opacity-0 hover:opacity-100"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 animate-in fade-in duration-300">
      {/* Article Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-6 text-sm font-medium text-gray-600">
           <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              {article.feedTitle ? article.feedTitle[0].toUpperCase() : 'R'}
           </div>
           <span>{article.feedTitle}</span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl font-medium text-gray-900 mb-6 leading-tight">
          {article.title}
        </h1>

        <div className="flex items-center gap-3 text-sm text-gray-500 border-t border-b border-gray-100 py-4">
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
      </header>

      {/* Article Content */}
      <article className="prose prose-xl prose-slate max-w-none font-serif prose-headings:font-serif prose-a:text-primary-600 prose-img:rounded-xl [&_p]:text-[22px] [&_p]:leading-relaxed [&_li]:text-[22px] [&_iframe]:w-full [&_iframe]:!h-auto [&_iframe]:!aspect-[3/2] translate-x-[2%]">
        {isLoading && !fullContent && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 animate-pulse">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
            <span>Loading full content...</span>
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </article>
      
      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
         <a 
           href={article.link} 
           target="_blank" 
           rel="noopener noreferrer"
           className="text-sm text-gray-500 hover:text-primary-600 hover:underline"
         >
           View original article
         </a>
      </div>
    </div>
    </div>
  );
}

export function ArticleView({ feeds }) {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const allItems = feeds.flatMap(feed =>
    feed.items.map(item => ({ ...item, feedTitle: feed.title }))
  ).sort((a, b) => {
    const dateA = new Date(a.isoDate || a.pubDate);
    const dateB = new Date(b.isoDate || b.pubDate);
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    return dateB - dateA;
  });

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p>No articles found. Add some feeds to get started!</p>
      </div>
    );
  }

  if (selectedArticle) {
    return (
      <ArticleDetail 
        article={selectedArticle} 
        onBack={() => setSelectedArticle(null)} 
      />
    );
  }

  return (
    <ArticleList 
      articles={allItems} 
      onSelectArticle={setSelectedArticle} 
    />
  );
}
