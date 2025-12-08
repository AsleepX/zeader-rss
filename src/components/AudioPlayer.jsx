import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, X, SkipBack, SkipForward, Volume2, VolumeX, Settings, Gauge, Mic, Calendar, User } from 'lucide-react';
import { useTTSStore } from '../store/useTTSStore';
import { motion, AnimatePresence } from 'framer-motion';

// Helper Component: Voice Control
const VoiceControl = ({ voice, setVoice, availableVoices, className = "" }) => (
    <div className={`relative group ${className}`}>
        <button className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Settings className="w-5 h-5 md:w-4 md:h-4" />
        </button>

        {/* Voice Popup */}
        <div className="absolute bottom-full left-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-48 bg-white shadow-xl border border-gray-100 rounded-xl py-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 invisible group-hover:visible z-50">
            {/* Invisible bridge */}
            <div className="absolute top-full left-0 right-0 h-4 bg-transparent" />
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Voice</div>
            {availableVoices.map((v) => (
                <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 hover:text-primary-600 transition-colors ${voice === v.id ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}
                >
                    {v.name}
                </button>
            ))}
        </div>
    </div>
);

// Helper Component: Speed Control
const SpeedControl = ({ playbackRate, setPlaybackRate, className = "" }) => (
    <div className={`relative group ${className}`}>
        <button
            className="flex items-center justify-center w-8 h-8 text-sm md:text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
            {playbackRate}x
        </button>

        {/* Speed Popup */}
        <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-20 bg-white shadow-xl border border-gray-100 rounded-xl py-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 invisible group-hover:visible z-50">
            {/* Invisible bridge */}
            <div className="absolute top-full left-0 right-0 h-4 bg-transparent" />
            {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`w-full text-center px-2 py-1.5 text-xs hover:bg-primary-50 hover:text-primary-600 transition-colors ${playbackRate === rate ? 'text-primary-600 font-bold bg-primary-50' : 'text-gray-700'}`}
                >
                    {rate}x
                </button>
            ))}
        </div>
    </div>
);

export function AudioPlayer() {
    const {
        isPlaying,
        isPaused,
        currentBlockIndex,
        blocks,
        playbackRate,
        volume,
        setVolume,
        pause,
        resume,
        stop,
        playBlock,
        setPlaybackRate,
        articleMetadata,
        voice,
        setVoice,
        availableVoices
    } = useTTSStore();

    // Toggle Play/Pause
    const handleTogglePlay = (e) => {
        e.stopPropagation();
        if (isPlaying && !isPaused) {
            pause();
        } else {
            resume();
        }
    };

    // Skip to previous block
    const handlePrev = (e) => {
        e.stopPropagation();
        if (currentBlockIndex > 0) {
            playBlock(currentBlockIndex - 1);
        }
    };

    // Skip to next block
    const handleNext = (e) => {
        e.stopPropagation();
        if (currentBlockIndex < blocks.length - 1) {
            playBlock(currentBlockIndex + 1);
        }
    };

    // Handle volume change
    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
    };

    if (!isPlaying && !isPaused) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-[calc(76px_+_env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 px-4 py-3"
            >
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

                    {/* --- LEFT SECTION --- */}

                    {/* DESKTOP: Article Info (Thumbnail + Author) */}
                    <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                        {/* Thumbnail */}
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 shadow-sm">
                            {articleMetadata?.image ? (
                                <img src={articleMetadata.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-300">
                                    <Mic className="w-5 h-5" />
                                </div>
                            )}
                            {/* Equalizer animation */}
                            {!isPaused && (
                                <div className="absolute inset-0 bg-black/10 flex items-end justify-center gap-[2px] pb-1">
                                    {[1, 2, 3].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ height: [4, 12, 4] }}
                                            transition={{
                                                duration: 0.8,
                                                repeat: Infinity,
                                                delay: i * 0.2,
                                                ease: "easeInOut"
                                            }}
                                            className="w-1 bg-white/90 rounded-full"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Text Info */}
                        <div className="flex flex-col min-w-0 justify-center">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                                {articleMetadata?.author && (
                                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                                        <User className="w-3 h-3" />
                                        {articleMetadata.author}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MOBILE: Voice Control (Left) */}
                    <div className="md:hidden flex flex-1 justify-start">
                        <VoiceControl
                            voice={voice}
                            setVoice={setVoice}
                            availableVoices={availableVoices}
                        />
                    </div>

                    {/* --- CENTER SECTION: Controls --- */}
                    <div className="flex flex-col items-center flex-[2] md:max-w-[400px]">
                        {/* Control Buttons (Center) */}
                        <div className="flex items-center gap-6 mb-0 md:mb-2">
                            <button
                                onClick={handlePrev}
                                disabled={currentBlockIndex === 0}
                                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <SkipBack className="w-6 h-6 md:w-5 md:h-5" />
                            </button>

                            <button
                                onClick={handleTogglePlay}
                                className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-md transition-all active:scale-95"
                            >
                                {isPlaying && !isPaused ? <Pause className="w-6 h-6 md:w-5 md:h-5" /> : <Play className="w-6 h-6 md:w-5 md:h-5 ml-0.5" />}
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={currentBlockIndex === blocks.length - 1}
                                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <SkipForward className="w-6 h-6 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* DESKTOP: Progress Bar (Hidden on Mobile) */}
                        <div className="hidden md:flex w-full items-center gap-[2px] h-1.5 bg-transparent rounded-full overflow-hidden">
                            {blocks.map((block, index) => {
                                // Skip image blocks and empty text blocks in the progress bar
                                if (block.type === 'img' || !block.text || !block.text.trim()) return null;

                                let state = 'future';
                                if (index < currentBlockIndex) state = 'past';
                                if (index === currentBlockIndex) state = 'current';

                                return (
                                    <div
                                        key={index}
                                        onClick={() => playBlock(index)}
                                        className={`h-full flex-1 rounded-full cursor-pointer transition-all duration-300 ${state === 'past' ? 'bg-primary-200' :
                                            state === 'current' ? 'bg-primary-600' :
                                                'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        title={`Jump to paragraph ${index + 1}`}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* --- RIGHT SECTION --- */}
                    <div className="flex items-center justify-end gap-1 flex-1 min-w-0">

                        {/* DESKTOP: Voice Selection (Hidden on Mobile, moved to left) */}
                        <div className="hidden md:block">
                            <VoiceControl
                                voice={voice}
                                setVoice={setVoice}
                                availableVoices={availableVoices}
                            />
                        </div>

                        {/* DESKTOP: Volume Control (Hidden on Mobile) */}
                        <div className="hidden md:flex group relative items-center p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <button className="text-gray-500 group-hover:text-gray-700">
                                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-8 h-24 bg-white shadow-xl border border-gray-100 rounded-2xl flex flex-col justify-end items-center py-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 invisible group-hover:visible z-50">
                                <div className="absolute top-full left-0 right-0 h-4 bg-transparent" />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer -rotate-90 origin-center accent-primary-600 mb-8"
                                />
                            </div>
                        </div>

                        {/* Speed Selection (Visible on Both) */}
                        <div className="mr-0 md:mr-1">
                            <SpeedControl
                                playbackRate={playbackRate}
                                setPlaybackRate={setPlaybackRate}
                            />
                        </div>

                        <div className="w-px h-6 bg-gray-200 mx-1 hidden md:block"></div>

                        {/* Close (Visible on Both) */}
                        <button
                            onClick={stop}
                            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
