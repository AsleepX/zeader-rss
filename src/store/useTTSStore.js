import { create } from 'zustand';
import { useAIStore } from './useAIStore';
import { useAuthStore } from './useAuthStore';

export const useTTSStore = create((set, get) => ({
    // State
    isPlaying: false,
    isPaused: false,
    currentBlockIndex: -1,
    blocks: [],
    isLoading: false,
    error: null,

    // Pre-fetching State
    audioCache: new Map(), // Map<index, Promise<string>>

    // Metadata
    articleMetadata: null, // { title, author, image }

    // Settings
    playbackRate: 1.0,
    volume: 1.0,
    voice: 'bella', // Default voice
    availableVoices: [
        { id: 'bella', name: 'Bella' },
        { id: 'alex', name: 'Alex' },
        { id: 'anna', name: 'Anna' },
        { id: 'benjamin', name: 'Benjamin' },
        { id: 'charles', name: 'Charles' },
        { id: 'claire', name: 'Claire' },
        { id: 'david', name: 'David' },
        { id: 'diana', name: 'Diana' }
    ],

    // Audio Instance
    audio: null,
    abortController: null,
    prefetchAbortController: null,
    transitionTimeout: null,

    // Actions
    initAudio: () => {
        if (get().audio) return;
        const audio = new Audio();

        // Setup event listeners
        audio.onended = () => {
            // Add a natural pause between blocks (e.g., 600ms)
            const timeout = setTimeout(() => {
                get().playNextBlock();
            }, 1000);
            set({ transitionTimeout: timeout });
        };

        audio.onerror = (e) => {
            // Ignore errors if source was cleared (e.g. by stop())
            if (audio.src === '' || audio.src === window.location.href) return;

            console.error("Audio playback error:", e);
            set({ error: "Playback error", isPlaying: false, isLoading: false });
        };

        set({ audio });
        set({ audio });
    },

    setPlaybackRate: (rate) => {
        set({ playbackRate: rate, audioCache: new Map() }); // Clear cache on change
        const { audio } = get();
        if (audio) {
            audio.playbackRate = rate;
            audio.defaultPlaybackRate = rate;
        }
    },

    setVolume: (volume) => {
        set({ volume });
        const { audio } = get();
        if (audio) {
            audio.volume = volume;
        }
    },

    setVoice: (voice) => set({ voice, audioCache: new Map() }), // Clear cache on change

    playArticle: async (blocks, startIndex = 0, metadata = null) => {
        const { initAudio, playBlock, stop } = get();
        stop(); // Ensure clean state before starting new article
        initAudio();

        set({
            blocks,
            currentBlockIndex: startIndex,
            isPlaying: true,
            isPaused: false,
            error: null,
            articleMetadata: metadata
        });

        await playBlock(startIndex);
    },

    // Helper to fetch audio blob
    fetchAudio: async (text, signal) => {
        const { voice, playbackRate } = get();
        const { apiKey, voiceApiKey, apiBase, audioModel } = useAIStore.getState();
        const { token: appToken } = useAuthStore.getState();
        const token = voiceApiKey || apiKey;

        if (!token) throw new Error("Missing API Key");

        let finalApiBase = apiBase;
        if (apiBase.includes('api.siliconflow.cn')) {
            finalApiBase = `${window.location.origin}/api/siliconflow/v1`;
        } else if (!finalApiBase.includes('/v1')) {
            finalApiBase = finalApiBase.replace(/\/$/, '') + '/v1';
        }

        const url = `${finalApiBase}/audio/speech`;

        const makeRequest = async (retries = 3, delay = 1000) => {
            try {
                // Construct voice param. If it's IndexTTS, it often needs the prefix. 
                // For valid OpenAI generic, it might just need the voice name. 
                // We keep the prefix behavior if the model matches, or we can genericize it.
                // Assuming SiliconFlow pattern 'Model:Voice'.
                const voiceParam = `${audioModel}:${voice.toLowerCase()}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-App-Token': appToken,
                    },
                    body: JSON.stringify({
                        model: audioModel,
                        input: text,
                        voice: voiceParam,
                        response_format: 'mp3',
                        speed: playbackRate
                    }),
                    signal
                });

                if (!response.ok) {
                    // Try to parse error
                    let errorMessage = 'TTS API Error';
                    try {
                        const errData = await response.json();
                        errorMessage = errData.message || errorMessage;
                    } catch (e) {
                        /* ignore json parse error */
                    }

                    // Don't retry on 401 (Auth) or 400 (Bad Request) unless it's a generic "unknown"
                    if (response.status === 401) throw new Error("Invalid API Key");
                    if (response.status === 400 && !errorMessage.toLowerCase().includes('unknown')) {
                        throw new Error(errorMessage);
                    }

                    throw new Error(errorMessage);
                }

                return response;
            } catch (error) {
                if (retries > 1 && error.name !== 'AbortError') {
                    console.warn(`TTS Fetch failed, retrying... (${retries - 1} left)`, error);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return makeRequest(retries - 1, delay * 2);
                }
                throw error;
            }
        };

        const response = await makeRequest();
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    },

    playBlock: async (index) => {
        const { blocks, audio, playbackRate, abortController, audioCache, fetchAudio, prefetchRange, transitionTimeout } = get();

        // 1. Handle Aborts & Setup
        if (abortController) {
            abortController.abort();
        }
        if (transitionTimeout) {
            clearTimeout(transitionTimeout);
            set({ transitionTimeout: null });
        }

        const newController = new AbortController();
        set({ abortController: newController, error: null });

        // 2. Bounds Check
        if (index < 0 || index >= blocks.length) {
            set({ isPlaying: false, currentBlockIndex: -1 });
            return;
        }

        const block = blocks[index];
        // Skip empty
        if (!block.text || !block.text.trim()) {
            get().playBlock(index + 1);
            return;
        }

        set({ currentBlockIndex: index, isLoading: true });

        try {
            let audioUrl;

            // 3. Check Cache vs Fetch
            if (audioCache.has(index)) {
                try {
                    // Use cached promise
                    console.log(`Using pre-fetched audio for block ${index}`);
                    audioUrl = await audioCache.get(index);

                    // Check if *this* play request was aborted while waiting
                    if (newController.signal.aborted) return;

                    // Clean up used cache item
                    const newCache = new Map(get().audioCache);
                    newCache.delete(index);
                    set({ audioCache: newCache });
                } catch (cacheError) {
                    console.warn("Cached audio failed, falling back to fresh fetch:", cacheError);
                    if (newController.signal.aborted) return;
                    // Fallback to fetch
                    audioUrl = await fetchAudio(block.text, newController.signal);
                }
            } else {
                // Fetch normally
                console.log(`Fetching audio for block ${index}`);
                audioUrl = await fetchAudio(block.text, newController.signal);
            }

            // 4. Play
            if (audio) {
                audio.src = audioUrl;
                audio.playbackRate = playbackRate;
                audio.volume = get().volume;
                await audio.play();
            }

            set({ isLoading: false });

            // 5. Trigger Pre-fetch for NEXT 2 blocks
            const nextIndex = index + 1;
            if (nextIndex < blocks.length) {
                setTimeout(() => {
                    if (get().currentBlockIndex === index && get().isPlaying) {
                        prefetchRange(nextIndex, 2); // Fetch next 2 blocks
                    }
                }, 50);
            }

        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("TTS Playback Error:", error);
            set({ error: error.message, isLoading: false, isPlaying: false });
        }
    },

    prefetchRange: (startIndex, count) => {
        const { blocks, audioCache, fetchAudio, prefetchAbortController } = get();
        const newCache = new Map(audioCache);
        let hasNewFetches = false;

        // Ensure controller exists
        let controller = prefetchAbortController;
        if (!controller || controller.signal.aborted) {
            controller = new AbortController();
            set({ prefetchAbortController: controller });
        }

        for (let i = startIndex; i < startIndex + count; i++) {
            if (i >= blocks.length) break;

            // Skip if already in cache
            if (newCache.has(i)) continue;

            const block = blocks[i];
            if (!block.text || !block.text.trim()) continue;

            console.log(`Pre-fetching audio for block ${i}`);
            const promise = fetchAudio(block.text, controller.signal)
                .catch(err => {
                    if (err.name !== 'AbortError') console.warn(`Pre-fetch failed for block ${i}`, err);
                    // Remove from cache on fail
                    const currentCache = get().audioCache;
                    if (currentCache.has(i)) {
                        const cleanupCache = new Map(currentCache);
                        cleanupCache.delete(i);
                        set({ audioCache: cleanupCache });
                    }
                    throw err;
                });

            newCache.set(i, promise);
            hasNewFetches = true;
        }

        if (hasNewFetches) {
            set({ audioCache: newCache });
        }
    },

    playNextBlock: () => {
        const { currentBlockIndex } = get();
        get().playBlock(currentBlockIndex + 1);
    },

    playPrevBlock: () => {
        const { currentBlockIndex } = get();
        get().playBlock(Math.max(0, currentBlockIndex - 1));
    },

    pause: () => {
        const { audio, isPlaying } = get();
        if (isPlaying && audio) {
            audio.pause();
            set({ isPaused: true });
        }
    },

    resume: () => {
        const { audio, isPlaying, isPaused } = get();
        if (isPlaying && isPaused && audio) {
            audio.play();
            set({ isPaused: false });
        }
    },

    togglePlayPause: () => {
        const { isPlaying, isPaused } = get();
        if (isPlaying && !isPaused) {
            get().pause();
        } else if (isPlaying && isPaused) {
            get().resume();
        }
    },

    stop: () => {
        const { audio, abortController, prefetchAbortController, transitionTimeout } = get();
        if (abortController) abortController.abort();
        if (prefetchAbortController) prefetchAbortController.abort();
        if (transitionTimeout) clearTimeout(transitionTimeout);

        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.src = "";
        }
        set({
            isPlaying: false,
            isPaused: false,
            currentBlockIndex: -1,
            abortController: null,
            prefetchAbortController: null,
            audioCache: new Map(), // Clear cache
            transitionTimeout: null
        });
    }
}));
