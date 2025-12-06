import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, X, MoreHorizontal, Gauge, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTSStore } from '../store/useTTSStore';

export function AudioPlayer() {
    const {
        isPlaying,
        isPaused,
        currentBlockIndex,
        blocks,
        togglePlayPause,
        stop,
        playNextBlock,
        playPrevBlock,
        isLoading,
        error,
        playbackRate,
        setPlaybackRate,
        voice,
        setVoice,
        availableVoices
    } = useTTSStore();

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    if (currentBlockIndex === -1 && !isPlaying) return null;

    const currentBlock = blocks[currentBlockIndex];
    const snippet = currentBlock?.text?.slice(0, 60) + (currentBlock?.text?.length > 60 ? '...' : '') || 'Loading...';

    // Voices dropdown
    const handleVoiceChange = (e) => {
        setVoice(e.target.value);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 px-4 py-3 md:px-6 md:py-4 safe-area-bottom"
            >
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    {/* Thumbnail / Status */}
                    <div className="hidden md:flex flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg items-center justify-center text-primary-600">
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <div className="flex gap-1 items-end h-5">
                                <span className="w-1 bg-primary-600 h-3 animate-pulse" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 bg-primary-600 h-5 animate-pulse" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 bg-primary-600 h-2 animate-pulse" style={{ animationDelay: '300ms' }} />
                            </div>
                        )}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                            {error ? <span className="text-red-500">{error}</span> : "Reading Article"}
                        </h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                            {snippet}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={playPrevBlock} className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
                            <SkipBack className="w-5 h-5" />
                        </button>

                        <button
                            onClick={togglePlayPause}
                            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-md transition-all active:scale-95"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (isPlaying && !isPaused) ? (
                                <Pause className="w-5 h-5 md:w-6 md:h-6" />
                            ) : (
                                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                            )}
                        </button>

                        <button onClick={playNextBlock} className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
                            <SkipForward className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Settings / Extra */}
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-2 md:pl-4 ml-2">
                        {/* Speed Toggle */}
                        <div className="relative group hidden md:block">
                            <button className="flex items-center gap-1 p-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                <span>{playbackRate}x</span>
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 hidden group-hover:block z-20">
                                <div className="flex flex-col gap-1 min-w-[60px] p-1 bg-white rounded-lg shadow-lg border border-gray-100">
                                    {[0.5, 1.0, 1.25, 1.5, 2.0].map(rate => (
                                        <button
                                            key={rate}
                                            onClick={() => setPlaybackRate(rate)}
                                            className={`px-3 py-1.5 text-xs text-left rounded-md hover:bg-gray-50 ${playbackRate === rate ? 'text-primary-600 font-bold bg-primary-50' : 'text-gray-700'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Voice Select (Simplified) */}
                        <div className="relative group hidden lg:block">
                            <button className="flex items-center gap-1 p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
                                <Mic className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 bottom-full pb-2 hidden group-hover:block z-20 w-40">
                                <div className="max-h-48 overflow-y-auto p-1 bg-white rounded-lg shadow-xl border border-gray-100">
                                    {availableVoices.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setVoice(v.id)}
                                            className={`w-full px-3 py-2 text-xs text-left rounded-md hover:bg-gray-50 ${voice === v.id ? 'text-primary-600 font-bold bg-primary-50' : 'text-gray-700'}`}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>


                        {/* Stop / Close */}
                        <button onClick={stop} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence >
    );
}
