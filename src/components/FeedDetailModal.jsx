import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getEmbedUrl } from '../utils/rss';

export function FeedDetailModal({ item, onClose }) {
    if (!item) return null;

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Get embed URL for video
    const embedUrl = getEmbedUrl(item.link);

    // Extract video poster image
    const getVideoPoster = () => {
        const posterMatch = item.content?.match(/<video[^>]+poster="([^"]+)"/);
        return posterMatch ? posterMatch[1] : null;
    };

    // Function to safely render HTML content
    // We need to ensure images are styled correctly within the content
    const createMarkup = () => {
        let htmlContent = item.content || item['content:encoded'] || item.description || '';

        // Fix for JavDB and other sites with hotlink protection
        // Force add/replace referrerPolicy="no-referrer" to all img tags
        htmlContent = htmlContent.replace(/<img([^>]+)>/gi, (match, attrs) => {
            // Remove existing referrerpolicy and class if any to avoid conflicts
            let newAttrs = attrs.replace(/referrerpolicy=["'][^"']*["']/gi, '')
                              .replace(/class=["'][^"']*video-cover[^"']*["']/gi, '');
            
            // Add referrerPolicy="no-referrer" and ensure max-width
            return `<img ${newAttrs} referrerpolicy="no-referrer" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">`;
        });

        return { __html: htmlContent };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-white z-10">
                    <div className="pr-8">
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                            {item.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                <span className="font-medium text-gray-700">{item.author || item.creator || item.feedTitle}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {item.isoDate || item.pubDate
                                        ? formatDistanceToNow(new Date(item.isoDate || item.pubDate), { addSuffix: true })
                                        : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                            title="Open in browser"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
                    {embedUrl ? (
                        <div className="w-full h-full flex items-center justify-center bg-black">
                            <iframe
                                src={embedUrl}
                                className="w-full h-full border-0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                title={item.title}
                                frameBorder="0"
                            />
                        </div>
                    ) : (
                        <div className="p-6">
                            <div
                                className="prose prose-lg max-w-none prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto prose-a:text-primary-600 hover:prose-a:text-primary-700 [&_img]:block [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-md"
                                dangerouslySetInnerHTML={createMarkup()}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
