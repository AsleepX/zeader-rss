import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Calendar, User, Sparkles, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { getEmbedUrl } from '../utils/rss';
import { useAIStore } from '../store/useAIStore';

export function FeedDetailModal({ item, onClose, originRect }) {
    if (!item) return null;

    const modalRef = useRef(null);
    const { generateText, language, isAIEnabled } = useAIStore();
    const [zymalData, setZymalData] = useState(null);
    const [loadingZymal, setLoadingZymal] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';

        // Focus the modal when it opens
        if (modalRef.current) {
            modalRef.current.focus();
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Z YMAL Generation
    useEffect(() => {
        const generateZymal = async () => {
            // Check if AI is enabled
            if (!isAIEnabled) return;

            // Filter out video sources
            if (item.link.includes('pornhub') || item.link.includes('youtube') || item.link.includes('youtu.be')) {
                return;
            }

            setLoadingZymal(true);
            try {
                const prompt = `
你是内容元数据提取专家。请根据提供的 RSS 信息，为图片画廊生成一个简洁的 YAML 格式信息栏。

# Inputs
- Title: ${item.title}
- Author: ${item.author || item.creator || item.feedTitle}
- Content: ${item.contentSnippet || item.content || ''}
- Tags: ${item.categories?.join(', ') || ''}
- Date: ${item.isoDate || item.pubDate}
- Link: ${item.link}
- Target Language: ${language}

# Instructions
1. **分析内容**：识别内容类型（如：AV 作品、插画/同人图、写真套图）。
2. **提取与清洗**：
   - 从 Title 或 Content 中提取关键 ID（如番号 KIBD-336）。
   - 提取关键人物（演员、画师、模特）。
   - 提取规格信息（分辨率、图片数量、大小、时长），**忽略**下载链接、密码提取或“求种”等无用文本。
1. **格式化**：输出为纯净的 YAML 格式（不要使用 Markdown 代码块包裹），键名使用英文。
   - **Creator**: 保持原始名字，不要翻译。
   - Title: 语言必须为 ${language}。
   - **其他所有字段（Summary, Tags, Meta等）**: 语言必须为 ${language}。

# Output Schema (YAML)
Title: 翻译后的标题
ID: 番号或标识符（如果没有则不显示此行）
Creator: 演员/画师/模特
Date: YYYY-MM-DD
Tags: 标签1, 标签2, 标签3
Meta: 分辨率/张数/大小/时长等参数
Summary: 一句话简介

# Example Output
Title: KIBD-336 因为你态度傲慢，所以才会有这样的下场
ID: KIBD-336
Creator: 渚みつき, 久留木玲
Date: 2025-12-16
Tags: School Girls, Gal, 3p
Meta: 240 mins / 4HR+
Summary: 渚光希与久留木玲出演的AV作品
`;
                const result = await generateText(prompt);

                // Parse YAML-like output manually to avoid heavy dependencies
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
                console.error("Z YMAL Generation Error:", error);
            } finally {
                setLoadingZymal(false);
            }
        };

        generateZymal();
    }, [item, language, generateText, isAIEnabled]);

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

        // Create a temporary DOM element to manipulate the content
        const div = document.createElement('div');
        div.innerHTML = htmlContent;

        // Fix for JavDB and other sites with hotlink protection
        const images = div.querySelectorAll('img');
        images.forEach(img => {
            img.referrerPolicy = "no-referrer";
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.display = "block";
            img.style.margin = "0 auto";

            // Remove video-cover class if present
            if (img.classList.contains('video-cover')) {
                img.classList.remove('video-cover');
            }
        });

        return { __html: div.innerHTML };
    };

    // Calculate initial position based on originRect
    const isValidRect = originRect &&
        typeof originRect.left === 'number' &&
        typeof originRect.top === 'number' &&
        typeof originRect.width === 'number' &&
        typeof originRect.height === 'number';

    const initialVariants = isValidRect ? {
        initial: {
            opacity: 0,
            scale: 0.5,
            x: originRect.left + originRect.width / 2 - window.innerWidth / 2,
            y: originRect.top + originRect.height / 2 - window.innerHeight / 2,
        },
        animate: {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        },
        exit: {
            opacity: 0,
            scale: 0.5,
            x: originRect.left + originRect.width / 2 - window.innerWidth / 2,
            y: originRect.top + originRect.height / 2 - window.innerHeight / 2,
            pointerEvents: "none",
            transition: { duration: 0.2, ease: "easeIn" }
        }
    } : {
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 20, pointerEvents: "none", transition: { duration: 0.15 } }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
            />

            <motion.div
                initial={initialVariants.initial}
                animate={initialVariants.animate}
                exit={initialVariants.exit}
                className="relative w-full sm:w-[70vw] lg:w-[40vw] max-w-[800px] h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
            >
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
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div
                    ref={modalRef}
                    tabIndex="-1"
                    className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar outline-none"
                >
                    {/* Z YMAL Info Bar */}
                    {(loadingZymal || zymalData) && (
                        <div className="mx-6 mt-6 p-4 bg-white rounded-xl">
                            <div className="flex items-center gap-2 mb-3 text-primary-600 font-semibold text-sm uppercase tracking-wider">
                                <Sparkles className="w-4 h-4" />
                                <span>Z YAML</span>
                                {loadingZymal && <Loader2 className="w-4 h-4 animate-spin ml-auto text-gray-400" />}
                            </div>

                            {zymalData && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                    {zymalData.Title && (
                                        <div className="col-span-full font-medium text-gray-900 text-lg mb-1">
                                            {zymalData.Title}
                                        </div>
                                    )}

                                    {zymalData.ID && (
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 min-w-[60px]">ID:</span>
                                            <span className="font-mono text-gray-900 bg-gray-100 px-1.5 rounded">{zymalData.ID}</span>
                                        </div>
                                    )}

                                    {zymalData.Creator && (
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 min-w-[60px]">Creator:</span>
                                            <span className="text-gray-900">{zymalData.Creator}</span>
                                        </div>
                                    )}

                                    {zymalData.Date && (
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 min-w-[60px]">Date:</span>
                                            <span className="text-gray-900">{zymalData.Date}</span>
                                        </div>
                                    )}

                                    {zymalData.Meta && (
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 min-w-[60px]">Meta:</span>
                                            <span className="text-gray-900">{zymalData.Meta}</span>
                                        </div>
                                    )}

                                    {zymalData.Tags && Array.isArray(zymalData.Tags) && (
                                        <div className="col-span-full flex gap-2 mt-1">
                                            <span className="text-gray-500 min-w-[60px] py-0.5">Tags:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {zymalData.Tags.map((tag, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {zymalData.Summary && (
                                        <div className="col-span-full mt-2 pt-2 border-t border-gray-100 text-gray-600 italic">
                                            {zymalData.Summary}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {embedUrl ? (
                        <div className="w-full h-full flex items-center justify-center bg-black min-h-[400px]">
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
            </motion.div>
        </div>
    );
}
