import React from 'react';
import { ExternalLink, Clock, Bookmark, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ArticleView({ feeds }) {
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

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-8 pb-20">
            {allItems.map(item => (
                <article key={item.id} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{item.feedTitle}</span>
                            <span className="text-gray-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {item.isoDate || item.pubDate ? formatDistanceToNow(new Date(item.isoDate || item.pubDate), { addSuffix: true }) : 'Unknown date'}
                            </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                <Bookmark className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                            {item.title}
                        </a>
                    </h2>

                    <div className="text-gray-600 leading-relaxed text-lg mb-6 line-clamp-4 font-serif" dangerouslySetInnerHTML={{ __html: item.contentSnippet || item.content || '' }} />

                    <div className="flex items-center justify-end pt-4 border-t border-gray-50">
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-all"
                        >
                            Read Article <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </article>
            ))}
        </div>
    );
}
